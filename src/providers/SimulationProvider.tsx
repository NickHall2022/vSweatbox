import { useEffect, useState, type ReactNode } from 'react';
import { SimulationContext } from '../hooks/useSimulation';
import { useMessages } from '../hooks/useMessages';
import { useImmer } from 'use-immer';
import type { Aircraft, AircraftRequest, SimulationDetails, StripData } from '../types/common';
import { useAircraft } from '../hooks/useAircraft';
import { distance, taxiways } from '../utils/taxiways';
import { useStrips } from '../hooks/useStrips';
import { useParkingSpots } from '../hooks/useParkingSpots';
import { useDifficulty } from '../hooks/useDifficulty';
import { useMistakes } from '../hooks/useMistakes';

import type { Node } from '../utils/taxiways';
import { ATIS } from '../utils/constants/alphabet';
import { phoneticizeString, phonetizeDestination } from '../utils/flightPlans';
import { getRandomArrayElement } from '../utils/arrays';

const endNode = taxiways.find((node) => node.id === 'END') as Node;
const TAXIWAY_NODE_THRESHOLD = 0.5;
const PLANE_DIST_THRESHOLD = 2.2;

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useImmer<AircraftRequest[]>([]);
  const [paused, setPaused] = useImmer(false);
  const { difficulty } = useDifficulty();
  const { addMistake, reviewClearance, reviewVFRDeparture } = useMistakes();
  const { strips } = useStrips();
  const [timer, setTimer] = useState(0);
  const [lastSentRequestTime, setLastSentRequestTime] = useState(0);
  const [pushToTalkActive, setPushToTalkActive] = useState(false);

  const {
    aircrafts,
    removeFirstRequest,
    setNextRequestTime,
    setPlanePosition,
    setTaxiwayNodeId,
    setPlaneStatus,
    deleteFlightPlan,
    spawnNewFlight,
    holdPosition,
  } = useAircraft();
  const { releaseSpot, getPushbackLocation } = useParkingSpots();
  const { printAmendedFlightPlan } = useStrips();

  const { sendMessage } = useMessages();

  function completeRequest(callsign: string, completedByVoice: boolean = false) {
    const completedRequestIndex = requests.findIndex((request) => request.callsign === callsign);
    if (completedRequestIndex === -1) {
      return;
    }
    const completedRequest = requests[completedRequestIndex];

    if (completedRequest.atcMessage && !completedByVoice) {
      sendMessage(completedRequest.atcMessage, 'PWM_GND', 'self');
    }
    if (completedRequest.responseMessage) {
      const aircraft = aircrafts.find(
        (aircraft) => aircraft.callsign === completedRequest.callsign
      );
      if (
        aircraft &&
        completedRequest.requestType === 'clearanceIFR' &&
        aircraft.flightPlan.route !== aircraft.flightPlan.originalRoute
      ) {
        const response = `Cleared to ${phonetizeDestination(aircraft.flightPlan.destination)} via ${aircraft.flightPlan.route}, squawk ${aircraft.flightPlan.squawk}`;
        const phoneticResponse = `${phoneticizeString(aircraft.callsign)} cleared to ${phonetizeDestination(aircraft.flightPlan.destination)} airport via ${aircraft.flightPlan.route}, squawk ${phoneticizeString(aircraft.flightPlan.squawk)}`;
        sendMessage(response, completedRequest.callsign, 'radio', phoneticResponse);
      } else {
        sendMessage(
          completedRequest.responseMessage,
          completedRequest.callsign,
          'radio',
          completedRequest.responsePhoneticMessage
        );
      }
      setLastSentRequestTime(timer);
    }

    setNextRequestTime(completedRequest.callsign, completedRequest.nextRequestDelay + timer);

    if (completedRequest.subsequentRequest) {
      addNewRequest(completedRequest.subsequentRequest);
    } else {
      setRequests((draft) => {
        draft.splice(completedRequestIndex, 1);
        if (completedRequest.subsequentRequest) {
          draft.push(completedRequest.subsequentRequest);
        }
      });
    }

    if (completedRequest.nextStatus === 'handedOff') {
      const aircraft = aircrafts.find((aircraft) => aircraft.callsign === callsign);
      if (aircraft) {
        releaseSpot(aircraft.parkingSpotId);
        holdPosition(aircraft.callsign, false, timer);
      }
    } else if (completedRequest.nextStatus === 'clearedIFR') {
      reviewClearance(callsign);
    }

    if (completedRequest.nextStatus) {
      setPlaneStatus(completedRequest.callsign, completedRequest.nextStatus, timer);
    }
  }

  function discardRequest(callsign: string) {
    setLastSentRequestTime(timer);
    const requestIndex = requests.findIndex((request) => request.callsign === callsign);
    setRequests((draft) => {
      draft.splice(requestIndex, 1);
    });
  }

  function addNewRequest(newRequest: AircraftRequest) {
    setLastSentRequestTime(timer);

    if (newRequest.requestMessage) {
      sendMessage(
        newRequest.requestMessage,
        newRequest.callsign,
        'radio',
        newRequest.requestPhoneticMessage
      );
    }

    const modifiedRequest = { ...newRequest };
    if (newRequest.reminder) {
      modifiedRequest.reminder = {
        ...newRequest.reminder,
        sendTime: timer + newRequest.reminder.sendDelay,
      };
    }

    setRequests((draft) => {
      const previousRequestIndex = requests.findIndex(
        (request) => request.callsign === modifiedRequest.callsign
      );
      if (previousRequestIndex !== -1) {
        draft.splice(previousRequestIndex, 1);
      }

      draft.push(modifiedRequest);
    });
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (paused) {
        return;
      }

      setTimer(timer + 1000);

      for (const aircraft of aircrafts) {
        if (aircraft.status === 'pushbackDiscretion' && timer >= aircraft.canSendRequestTime) {
          setPlaneStatus(aircraft.callsign, 'pushback', timer);
          setNextRequestTime(aircraft.callsign, timer + 120000);
        } else if (aircraft.status === 'pushback' && !aircraft.holdingPosition) {
          const angleAsRadians = (aircraft.rotation * Math.PI) / 180;
          const pushbackLocation = getPushbackLocation(aircraft.parkingSpotId);
          const diffX =
            -Math.cos(angleAsRadians) *
            Math.min(0.05, Math.abs(aircraft.positionX - pushbackLocation.x));
          const diffY =
            Math.sin(angleAsRadians) *
            Math.min(0.05, Math.abs(aircraft.positionY - pushbackLocation.y));
          setPlanePosition(
            aircraft.callsign,
            aircraft.positionX + diffX,
            aircraft.positionY + diffY
          );
        } else if (aircraft.status === 'taxi' || aircraft.status === 'awaitingHandoff') {
          movePlaneTowardsRunway(aircraft);
        } else if (aircraft.status === 'handedOff') {
          const dist = movePlaneTowardsRunway(aircraft);
          if (
            dist != undefined &&
            dist < PLANE_DIST_THRESHOLD &&
            timer - (aircraft.statusChangedTime as number) > 20000
          ) {
            const localStrips = strips.filter((strip) => strip.bayName === 'local');
            if (!localStrips.find((strip) => (strip as StripData).callsign === aircraft.callsign)) {
              sendMessage(`Can you pass me the strip for ${aircraft.callsign}?`, 'PWM_TWR', 'ATC');
              addMistake('stripHandoff', aircraft.callsign);
              setPlaneStatus(aircraft.callsign, 'handedOffReminded', timer);
            } else {
              setPlaneStatus(aircraft.callsign, 'departed', timer);
            }
            if (
              aircraft.flightPlan.routeType === 'VFR' ||
              aircraft.flightPlan.routeType === 'VFRFF'
            ) {
              reviewVFRDeparture(aircraft.callsign);
            }
          }
        } else if (aircraft.status === 'handedOffReminded') {
          movePlaneTowardsRunway(aircraft);
          const localStrips = strips.filter((strip) => strip.bayName === 'local');
          if (localStrips.find((strip) => (strip as StripData).callsign === aircraft.callsign)) {
            setPlaneStatus(aircraft.callsign, 'departed', timer);
          }
        } else if (aircraft.status === 'departed') {
          const localStrips = strips.filter((strip) => strip.bayName === 'local');
          const strip = localStrips.find(
            (strip) => (strip as StripData).callsign === aircraft.callsign
          ) as StripData;
          if (strip && (strip.box10 !== 'B' || strip.box12 !== ATIS)) {
            addMistake('stripBox', aircraft.callsign);
          }
          deleteFlightPlan(aircraft.callsign);
        }
      }

      const aircraftWithRequest = aircrafts.filter((aircraft) => {
        if (aircraft.requests.length === 0) {
          return;
        }
        if (aircraft.canSendRequestTime > timer) {
          return;
        }
        return !requests.find((request) => request.callsign === aircraft.callsign);
      });

      if (Math.floor(timer / 1000) % 15 === 0) {
        if (aircraftWithRequest.length < 1 + difficulty) {
          const newAircraft = spawnNewFlight();
          if (
            newAircraft &&
            (newAircraft.flightPlan.routeType === 'TEC' || newAircraft.flightPlan.routeType === 'H')
          ) {
            printAmendedFlightPlan(newAircraft.flightPlan);
          }
        }
      }

      if (!pushToTalkActive && timer - lastSentRequestTime > Math.ceil(60 / difficulty) * 1000) {
        for (const request of requests) {
          if (request.reminder && request.reminder.sendTime && timer >= request.reminder.sendTime) {
            setLastSentRequestTime(timer);
            sendMessage(
              request.reminder.message,
              request.callsign,
              'radio',
              request.reminder.phoneticMessage
            );
            addMistake(request.reminder.type, request.callsign);
            setRequests((draft) => {
              const modifiedRequest = draft.find(
                (element) => element.callsign === request.callsign
              );
              if (modifiedRequest) {
                delete modifiedRequest.reminder;
              }
            });
            return;
          }
        }

        if (requests.length >= difficulty + 1) {
          return;
        }

        if (aircraftWithRequest.length === 0) {
          return;
        }

        let maxPriority = -1;
        for (const aircraft of aircraftWithRequest) {
          if (aircraft.requests[0].priority > maxPriority) {
            maxPriority = aircraft.requests[0].priority;
          }
        }
        const priorityFlightPlansWithRequest = aircraftWithRequest.filter(
          (aircraft) => aircraft.requests[0].priority === maxPriority
        );
        const chosenFlight = getRandomArrayElement(priorityFlightPlansWithRequest);
        const request = chosenFlight.requests[0];

        addNewRequest(request);
        removeFirstRequest(chosenFlight.callsign);
      }
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  });

  function movePlaneTowardsRunway(aircraft: Aircraft) {
    if (aircraft.holdingPosition) {
      return;
    }

    const planeX = aircraft.positionX;
    const planeY = aircraft.positionY;
    const callsign = aircraft.callsign;

    const dist = aircraft.taxiwayNodeId ? movePlaneToSavedNode(aircraft) : 0;

    if (dist < TAXIWAY_NODE_THRESHOLD && aircraft.taxiwayNodeId !== 'END') {
      let closestNode = taxiways[0];
      let distanceToClosest = 100;
      for (const node of taxiways) {
        const distanceToNode = distance(planeX, planeY, node.x, node.y);
        if (distanceToNode < distanceToClosest) {
          distanceToClosest = distanceToNode;
          closestNode = node;
        }
      }

      if (distanceToClosest >= TAXIWAY_NODE_THRESHOLD) {
        setTaxiwayNodeId(aircraft.callsign, closestNode.id);
      } else {
        if (closestNode.edges[0]) {
          setTaxiwayNodeId(aircraft.callsign, closestNode.edges[0].id);
        }
      }
    }

    const distanceToEnd = distance(planeX, planeY, endNode.x, endNode.y);
    if (aircraft.status === 'taxi') {
      if (distanceToEnd < PLANE_DIST_THRESHOLD && !pushToTalkActive) {
        setPlaneStatus(callsign, 'awaitingHandoff', timer);
        addMistake('aircraftHandoff', aircraft.callsign);
        sendMessage(
          'Ground, should we switch to tower?',
          aircraft.callsign,
          'radio',
          `Ground, ${phoneticizeString(callsign)}, should we switch to tower?`
        );
      }
    }

    return distanceToEnd;
  }

  function movePlaneToSavedNode(aircraft: Aircraft): number {
    const savedNode: Node = taxiways.find((node) => node.id === aircraft.taxiwayNodeId) as Node;
    const planeX = aircraft.positionX;
    const planeY = aircraft.positionY;

    const dist = distance(planeX, planeY, savedNode.x, savedNode.y);

    const angleAsRadians = Math.atan2(savedNode.y - planeY, savedNode.x - planeX);
    const diffX = Math.min(Math.cos(angleAsRadians) * 0.35, Math.abs(savedNode.x - planeX));
    const diffY = Math.min(Math.sin(angleAsRadians) * 0.35, Math.abs(savedNode.y - planeY));

    const otherTaxiing = aircrafts.filter(
      (aircraft) => aircraft.status !== 'ramp' && aircraft.status !== 'clearedIFR'
    );
    for (const otherAircraft of otherTaxiing) {
      const distToFlight = distance(
        planeX,
        planeY,
        otherAircraft.positionX,
        otherAircraft.positionY
      );
      if (distToFlight < PLANE_DIST_THRESHOLD) {
        const myDistanceToEnd = distance(planeX, planeY, endNode.x, endNode.y);
        const otherDistanceToEnd = distance(
          otherAircraft.positionX,
          otherAircraft.positionY,
          endNode.x,
          endNode.y
        );
        if (myDistanceToEnd > otherDistanceToEnd) {
          return dist;
        }
      }
    }

    setPlanePosition(
      aircraft.callsign,
      planeX + diffX,
      planeY + diffY,
      (-angleAsRadians * 180) / Math.PI
    );

    return dist;
  }

  const value: SimulationDetails = {
    requests,
    paused,
    setPaused,
    pushToTalkActive,
    setPushToTalkActive,
    setRequests,
    timer,
    completeRequest,
    discardRequest,
  };

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}
