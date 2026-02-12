import { type ReactNode } from 'react';
import {
  SpeechInterpretationContext,
  type SpeechInterpretationDetails,
} from '../hooks/useSpeechInterpretation';
import { useSimulation } from '../hooks/useSimulation';
import useSound from 'use-sound';
import { useMessages } from '../hooks/useMessages';
import type { Aircraft, AircraftRequest, Keywords } from '../types/common';
import { useAircraft } from '../hooks/useAircraft';
import { phoneticizeString } from '../utils/flightPlans';
import { findBestMatch } from 'string-similarity';
import { useMistakes } from '../hooks/useMistakes';
import { GLOBAL_ALTERNATIVES, REQUEST_KEYWORDS } from '../utils/constants/speech';
import { useParkingSpots } from '../hooks/useParkingSpots';

export function SpeechInterpretatonProvider({ children }: { children: ReactNode }) {
  const { requests, setRequests, timer, completeRequest, discardRequest } = useSimulation();
  const {
    aircrafts,
    setAircraftHasBeenSpokenTo,
    holdPosition,
    setNextRequestTime,
    setPlaneStatus,
    removeFirstRequest,
  } = useAircraft();
  const { addPhraseologyMistake, reviewGeneralPhraseology, reviewPhraseologyForRequest } =
    useMistakes();
  const { sendMessage } = useMessages();
  const { getParkingSpotPushbackIntoRamp } = useParkingSpots();
  const [playErrorSound] = useSound('Error.wav');

  function interpretNewSpeech(transcript: string) {
    reviewGeneralPhraseology(transcript);
    sendMessage(transcript, 'PWM_GND', 'self');

    const callsign = getCallsign(transcript);

    const bestCallsignMatch = findBestMatch(
      callsign,
      aircrafts.map((aircraft) => aircraft.callsign)
    );

    if (bestCallsignMatch.bestMatch.rating < 0.5) {
      playErrorSound();
      sendMessage(`Could not identify callsign ${callsign}`, '', 'system');
      return;
    }

    if (callsign.length === transcript.length) {
      return;
    }

    const aircraft = aircrafts[bestCallsignMatch.bestMatchIndex];

    if (aircraft.status.includes('handed') || aircraft.status === 'departed') {
      playErrorSound();
      sendMessage(`Aircraft ${callsign} is no longer on your frequency`, '', 'system');
      return;
    }

    if (!aircraft.hasBeenSpokenTo) {
      setAircraftHasBeenSpokenTo(aircraft.callsign);
      if (!transcript.includes('ground')) {
        addPhraseologyMistake('forgotToIdentify', aircraft.callsign);
      }
    }
    matchAircraftToTranscript(aircraft, transcript);
  }

  function getCallsign(transcript: string) {
    return transcript.split(' ')[0];
  }

  function matchAircraftToTranscript(aircraft: Aircraft, transcript: string) {
    const callsign = aircraft.callsign;
    if (checkGlobalAlternativesForAircraft(aircraft, transcript)) {
      return;
    }

    if (checkHoldPositionContinueForAircraft(aircraft, transcript)) {
      return;
    }

    const request = requests.find((request) => request.callsign === callsign);
    if (request) {
      if (checkSkipPushbackRequest(aircraft, transcript, request)) {
        return;
      }

      const keywords = REQUEST_KEYWORDS[request.requestType];

      if (keywordsMatchTranscript(keywords, transcript)) {
        reviewPhraseologyForRequest(transcript, request);
        return completeRequest(callsign, true);
      }

      if (keywords.alternatives) {
        for (const alternative of keywords.alternatives) {
          if (keywordsMatchTranscript(alternative, transcript)) {
            if (alternative.aircraftResponse && alternative.aircraftResponse.length > 0) {
              return sendMessage(
                alternative.aircraftResponse,
                callsign,
                'radio',
                `${phoneticizeString(callsign)} ${alternative.aircraftResponsePhonetic || alternative.aircraftResponse}`
              );
            }
            return;
          }
        }
      }

      const matchedKeywords = request.previouslyMatchedKeywords?.slice() || [];
      const missingPhraseResponses = [];
      for (const keyword of keywords.keywords) {
        if (transcript.includes(keyword.phrase)) {
          appendIfNotDuplicate(matchedKeywords, keyword.phrase);
        } else if (!matchedKeywords.includes(keyword.phrase)) {
          if (keyword.missingPhraseResponse) {
            missingPhraseResponses.push(keyword.missingPhraseResponse);
          }
        }
      }

      const atLeastOneMatch =
        !keywords.atLeastOneOf ||
        keywords.atLeastOneOf.find((phrase) => transcript.includes(phrase));

      if (matchedKeywords.length === keywords.keywords.length && atLeastOneMatch) {
        reviewPhraseologyForRequest(transcript, request);
        return completeRequest(callsign, true);
      } else {
        setRequests((draft) => {
          const requestToChange = draft.find((item) => item.callsign === aircraft.callsign);
          if (requestToChange) {
            requestToChange.previouslyMatchedKeywords = [...matchedKeywords];
            const previousInstructions = [...(request.previousInstructions || [])];
            previousInstructions.push(transcript);
            requestToChange.previousInstructions = previousInstructions;
          }
        });
        if (missingPhraseResponses.length > 0) {
          const responseMessage = joinMissingPhraseResponses(missingPhraseResponses);
          sendMessage(
            responseMessage,
            callsign,
            'radio',
            `${phoneticizeString(callsign)} ${responseMessage}`
          );
          return;
        }
      }
    }

    sendMessage(
      `I didn't understand that`,
      callsign,
      'radio',
      `${phoneticizeString(callsign)} I didn't understand that`
    );
  }

  function checkGlobalAlternativesForAircraft(aircraft: Aircraft, transcript: string): boolean {
    for (const alternative of GLOBAL_ALTERNATIVES(aircraft)) {
      if (keywordsMatchTranscript(alternative, transcript)) {
        if (alternative.aircraftResponse) {
          sendMessage(
            alternative.aircraftResponse,
            aircraft.callsign,
            'radio',
            `${phoneticizeString(aircraft.callsign)} ${alternative.aircraftResponse}`
          );
        }
        return true;
      }
    }
    return false;
  }

  function checkHoldPositionContinueForAircraft(aircraft: Aircraft, transcript: string): boolean {
    const callsign = aircraft.callsign;
    if (
      aircraft.status === 'pushback' ||
      aircraft.status === 'taxi' ||
      aircraft.status === 'awaitingHandoff'
    ) {
      if (transcript.includes('hold position')) {
        holdPosition(callsign, true, timer);
        sendMessage(
          'Holding position',
          callsign,
          'radio',
          `${phoneticizeString(callsign)} holding position`
        );
        return true;
      } else if (transcript.includes('continue') || transcript.includes('resume')) {
        holdPosition(callsign, false, timer);
        sendMessage('Continuing', callsign, 'radio', `${phoneticizeString(callsign)} continuing`);
        return true;
      }
    }
    return false;
  }

  function checkSkipPushbackRequest(
    aircraft: Aircraft,
    transcript: string,
    request: AircraftRequest
  ): boolean {
    if (request.requestType !== 'readbackIFR') {
      return false;
    }

    if (aircraft.requests[0].nextStatus !== 'pushback') {
      return false;
    }

    if (transcript.includes('readback') && transcript.includes('discretion')) {
      if (!getParkingSpotPushbackIntoRamp(aircraft.parkingSpotId)) {
        addPhraseologyMistake('pushbackKeyword', transcript, `${request.callsign} (onto taxiway)`);
        return false;
      }

      const callsign = aircraft.callsign;
      discardRequest(callsign);
      setNextRequestTime(callsign, timer + request.nextRequestDelay);
      setPlaneStatus(callsign, 'pushbackDiscretion', timer);
      removeFirstRequest(callsign);
      sendMessage(
        'Pushback our discretion, will call for taxi',
        callsign,
        'radio',
        `${phoneticizeString(callsign)} pushback our discretion, will call for taxi`
      );

      return true;
    }

    return false;
  }

  function keywordsMatchTranscript(keywords: Keywords, transcript: string) {
    for (const keyword of keywords.keywords) {
      if (!transcript.includes(keyword.phrase)) {
        return false;
      }
    }

    if (keywords.atLeastOneOf) {
      const atLeastOneMatch = keywords.atLeastOneOf.find((phrase) => transcript.includes(phrase));
      if (!atLeastOneMatch) {
        return false;
      }
    }
    return true;
  }

  function appendIfNotDuplicate<T>(items: T[], newItem: T) {
    if (!items.includes(newItem)) {
      items.push(newItem);
    }
  }

  function joinMissingPhraseResponses(missingPhraseResponses: string[]) {
    if (missingPhraseResponses.length > 1) {
      missingPhraseResponses[missingPhraseResponses.length - 1] =
        `or ${missingPhraseResponses[missingPhraseResponses.length - 1]}`;
    }
    const joinedPhrases = missingPhraseResponses.join(', ');
    return `I didn't catch the ${joinedPhrases}`;
  }

  const value: SpeechInterpretationDetails = { interpretNewSpeech };

  return (
    <SpeechInterpretationContext.Provider value={value}>
      {children}
    </SpeechInterpretationContext.Provider>
  );
}
