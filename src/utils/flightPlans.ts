import type {
  AircraftRequest,
  FlightPlan,
  PrefRoute,
  PrefRouteDetails,
  ParkingSpot,
  Aircraft,
  AircraftDefaultAttributes,
  FlightPlanDefaultIFRAttributes,
  ParkingSpotTaxiInstruction,
} from '../types/common';
import { getRandomArrayElement } from './arrays';
import { AIRLINE_CODES, GA_TYPES, JET_TYPES, TEC_TYPES } from './constants/aircraftTypes';
import { PHONETIC_ALPHABET, PHONETIC_ATIS, PHONETIC_NUMBERS } from './constants/alphabet';
import {
  SPAWNABLE_HIGH_EAST_ALT,
  SPAWNABLE_HIGH_WEST_ALT,
  SPAWNABLE_TEC_EAST_ALT,
  SPAWNABLE_TEC_WEST_ALT,
} from './constants/altitudes';
import {
  DEST_TO_DIRECTION_MAP,
  DEST_TO_NAME_MAP,
  DIRECTIONS,
  VFR_DESTINATIONS,
} from './constants/routes';

type UnspawnedVFRAircraft = Omit<Aircraft, keyof AircraftDefaultAttributes>;

let unspawnedVFRAircraft: UnspawnedVFRAircraft[] = [];

export function makeEmptyFlightPlan(): FlightPlan {
  return {
    callsign: '',
    CID: '',
    aircraftType: '',
    equipmentCode: '',
    departure: '',
    destination: '',
    speed: '',
    altitude: '',
    route: '',
    originalRoute: '',
    remarks: '',
    printCount: 1,
    plannedTime: '',
    created: false,
    routeType: 'VFR',
    squawk: '',
  };
}

export function makeNewFlight(parkingSpot: ParkingSpot, prefRoutes: PrefRouteDetails): Aircraft {
  if (parkingSpot.type === 'airline') {
    return makeNewAirlineFlight(parkingSpot, prefRoutes);
  } else if (parkingSpot.type === 'TEC') {
    return makeNewTecFlight(parkingSpot, prefRoutes);
  }
  return makeNewVFRFlight(parkingSpot);
}

export function makeNewAirlineFlight(
  parkingSpot: ParkingSpot,
  prefRoutes: PrefRouteDetails
): Aircraft {
  const type = getRandomJetType();
  const prefRoute = getRandomRoute(prefRoutes.highRoutes);
  const callsign = `${parkingSpot.airline}${buildRandomFlightNumber()}`;

  return buildIFRWithPushBackRequests(
    {
      callsign,
      actualAircraftType: type,
      size: 1.2,
      ...buildDefaultAircraftAttributes(parkingSpot),
      flightPlan: {
        callsign,
        aircraftType: type,
        equipmentCode: getRandomJetEquipment(),
        speed: getRandomJetSpeed(),
        routeType: 'H',
        ...buildDefaultIFRFlightPlanAttributes(prefRoute),
      },
    },
    parkingSpot.pushbackIntoRamp,
    parkingSpot.location
  );
}

function makeNewTecFlight(parkingSpot: ParkingSpot, prefRoutes: PrefRouteDetails): Aircraft {
  const type = getRandomTecType();
  const prefRoute = getRandomRoute(prefRoutes.tecRoutes);

  const callsign = parkingSpot.airline
    ? `${parkingSpot.airline}${buildRandomFlightNumber()}`
    : buildRandomNNumber();

  return buildIFRWithoutPushBackRequests(
    {
      callsign,
      actualAircraftType: type,
      size: 0.8,
      ...buildDefaultAircraftAttributes(parkingSpot),
      flightPlan: {
        callsign,
        aircraftType: type,
        equipmentCode: getRandomTecEquipment(),
        speed: getRandomTecSpeed(),
        routeType: 'TEC',
        ...buildDefaultIFRFlightPlanAttributes(prefRoute),
      },
    },
    parkingSpot.location,
    parkingSpot.taxiInstruction
  );
}

function buildDefaultIFRFlightPlanAttributes(prefRoute: PrefRoute): FlightPlanDefaultIFRAttributes {
  const CID = generateRandomString(1000, 3);
  const plannedTime = `P12${generateRandomString(60, 2)}`;
  return {
    departure: 'KPWM',
    plannedTime,
    remarks: '',
    CID,
    printCount: 1,
    created: true,
    altitude: getRandomIFRAltitude(prefRoute),
    destination: `K${prefRoute.destination}`,
    route: prefRoute.route,
    originalRoute: prefRoute.route,
    squawk: buildRandomSquawk(),
  };
}

function buildDefaultAircraftAttributes(parkingSpot: ParkingSpot): AircraftDefaultAttributes {
  const { voice, pitch } = getRandomVoice();
  return {
    parkingSpotId: parkingSpot.id,
    positionX: parkingSpot.x,
    positionY: parkingSpot.y,
    rotation: parkingSpot.rotation,
    status: 'ramp',
    canSendRequestTime: 0,
    voice,
    pitch,
    hasBeenSpokenTo: false,
    holdingPosition: false,
  };
}

function buildIFRWithPushBackRequests(
  aircraft: Omit<Aircraft, 'requests'>,
  intoRamp: boolean,
  location: string
): Aircraft {
  return {
    ...aircraft,
    requests: [
      buildClearanceRequest(aircraft, true),
      buildPusbackRequest(intoRamp, aircraft.callsign, location),
      buildTaxiRequest(aircraft.callsign),
    ],
  };
}

function buildIFRWithoutPushBackRequests(
  aircraft: Omit<Aircraft, 'requests'>,
  location: string,
  taxiInstruction?: ParkingSpotTaxiInstruction
): Aircraft {
  return {
    ...aircraft,
    requests: [
      buildClearanceRequest(aircraft, false),
      buildTaxiRequest(aircraft.callsign, location, taxiInstruction),
    ],
  };
}

function buildClearanceRequest(
  aircraft: Omit<Aircraft, 'requests'>,
  withPushback: boolean
): AircraftRequest {
  const flightPlan = aircraft.flightPlan;
  return {
    requestMessage: `Request IFR clearance to ${phonetizeDestination(flightPlan.destination)}`,
    requestPhoneticMessage: `Portland ground, ${phoneticizeString(flightPlan.callsign)} request IFR clearance to the ${phonetizeDestination(flightPlan.destination)} airport`,
    responseMessage: `Cleared to ${phonetizeDestination(flightPlan.destination)}, squawk ${aircraft.flightPlan.squawk}`,
    responsePhoneticMessage: `${phoneticizeString(flightPlan.callsign)} cleared to ${phonetizeDestination(flightPlan.destination)} airport, squawk ${phoneticizeString(aircraft.flightPlan.squawk)}`,
    priority: 1,
    callsign: aircraft.callsign,
    nextRequestDelay: 0,
    atcMessage: `Clearance sent to ${aircraft.callsign}`,
    requestType: 'clearanceIFR',
    subsequentRequest: {
      responseMessage: withPushback ? 'Will call for pushback' : 'Will call for taxi',
      responsePhoneticMessage: withPushback
        ? `${phoneticizeString(flightPlan.callsign)} will call for pushback`
        : `${phoneticizeString(flightPlan.callsign)} will call for taxi`,
      requestType: 'readbackIFR',
      reminder: {
        message: 'Ground, did you copy our readback?',
        phoneticMessage: `Ground, ${phoneticizeString(flightPlan.callsign)}, did you copy our readback?`,
        type: 'readbackIFR',
        sendDelay: 20000,
      },
      priority: 1,
      atcMessage: `Readback correct for ${aircraft.callsign}`,
      callsign: aircraft.callsign,
      nextRequestDelay: 90000 + Math.floor(Math.random() * 60000),
    },
    nextStatus: 'clearedIFR',
  };
}

function buildPusbackRequest(intoRamp: boolean, callsign: string, gate: string): AircraftRequest {
  return {
    requestMessage: `Request pushback with ${PHONETIC_ATIS} from gate ${gate}`,
    requestPhoneticMessage: `${phoneticizeString(callsign)} request pushback with ${PHONETIC_ATIS} from gate ${gate}`,
    requestType: 'pushback',
    responseMessage: intoRamp
      ? 'Pushback into the ramp at our discretion, will call for taxi'
      : 'Pushback approved, will call for taxi',
    responsePhoneticMessage: intoRamp
      ? `${phoneticizeString(callsign)} pushback into the ramp at our discretion, will call for taxi`
      : `${phoneticizeString(callsign)} pushback approved, will call for taxi`,
    atcMessage: `Push approved for ${callsign}`,
    priority: 1,
    callsign: callsign,
    nextRequestDelay: 90000 + Math.floor(Math.random() * 60000),
    nextStatus: 'pushback',
  };
}

function buildTaxiRequest(
  callsign: string,
  location?: string,
  taxiInstruction?: ParkingSpotTaxiInstruction
): AircraftRequest {
  return {
    requestMessage: `Ready for taxi${location ? ` with ${PHONETIC_ATIS} from ${location}` : ''}`,
    requestPhoneticMessage: `${phoneticizeString(callsign)} ready for taxi${location ? ` with ${PHONETIC_ATIS} from ${location}` : ''}`,
    requestType: 'taxi',
    atcMessage: `Taxi instruction sent to ${callsign}`,
    responseMessage: taxiInstruction
      ? taxiInstruction.text
      : 'Runway 29, taxi via A, cross runway 36',
    responsePhoneticMessage: taxiInstruction
      ? `${phoneticizeString(callsign)} ${taxiInstruction.phonetic}`
      : `${phoneticizeString(callsign)} runway two niner, taxi via alpha, cross runway three six`,
    priority: 2,
    callsign: callsign,
    nextRequestDelay: 0,
    nextStatus: 'taxi',
    subsequentRequest: handoffRequest(callsign),
  };
}

function generateRandomString(maxValue: number, numDigits: number) {
  let randomString = Math.floor(Math.random() * maxValue).toString();
  const startLength = randomString.length;
  for (let i = 0; i < numDigits - startLength; i++) {
    randomString = '0' + randomString;
  }
  return randomString;
}

function makeNewVFRFlight(parkingSpot: ParkingSpot): Aircraft {
  if (unspawnedVFRAircraft.length === 0) {
    generateVFRFlightsToSpawn();
  }
  const index = Math.floor(Math.random() * unspawnedVFRAircraft.length);
  const newAircraft = unspawnedVFRAircraft.splice(index, 1)[0];
  return {
    ...newAircraft,
    ...buildDefaultAircraftAttributes(parkingSpot),
  };
}

function generateVFRFlightsToSpawn() {
  unspawnedVFRAircraft = [
    buildVFRPatternRequest(createUnspawnedVFRAircraft()),
    buildFlightFollowingVFRDepartureRequest(createUnspawnedVFRAircraft()),
    buildFlightFollowingVFRDepartureRequest(createUnspawnedVFRAircraft()),
    buildNoFlightFollowingVFRDepartureRequest(createUnspawnedVFRAircraft()),
    buildNoFlightFollowingVFRDepartureRequest(createUnspawnedVFRAircraft()),
  ];
}

function createUnspawnedVFRAircraft(): Omit<UnspawnedVFRAircraft, 'requests'> {
  const callsign = buildRandomNNumber();
  return {
    actualAircraftType: getRandomGAType(),
    callsign,
    size: 0.8,
    flightPlan: createVFRFlightPlan(callsign),
  };
}

function createVFRFlightPlan(callsign: string): FlightPlan {
  return {
    callsign,
    aircraftType: '',
    equipmentCode: '',
    departure: '',
    destination: '',
    speed: '',
    altitude: '',
    route: '',
    originalRoute: '',
    remarks: '',
    created: false,
    routeType: 'VFR',
    printCount: 0,
    squawk: buildRandomSquawk(),
    CID: generateRandomString(1000, 3),
    plannedTime: `P12${generateRandomString(60, 2)}`,
    direction: '',
  };
}

function buildNoFlightFollowingVFRDepartureRequest(
  aircraft: Omit<UnspawnedVFRAircraft, 'requests'>
): UnspawnedVFRAircraft {
  return buildVFRDepartureRequest(aircraft, false);
}

function buildFlightFollowingVFRDepartureRequest(
  aircraft: Omit<UnspawnedVFRAircraft, 'requests'>
): UnspawnedVFRAircraft {
  return buildVFRDepartureRequest(aircraft, true);
}

function buildVFRDepartureRequest(
  aircraft: Omit<UnspawnedVFRAircraft, 'requests'>,
  flightFollowing: boolean
): UnspawnedVFRAircraft {
  const routing = flightFollowing ? getRandomVFRDestination() : getRandomDepartureDirection();
  const altitude = getRandomVFRAltitude(flightFollowing ? DEST_TO_DIRECTION_MAP[routing] : routing);
  return {
    ...aircraft,
    requests: [
      {
        requestMessage: `Type ${aircraft.actualAircraftType} at the north apron with ${PHONETIC_ATIS}, request VFR departure${flightFollowing ? ' with flight following' : ''} to ${flightFollowing ? routing : 'the ' + routing} at ${altitude}`,
        requestPhoneticMessage: `Portland ground, ${phoneticizeString(aircraft.callsign)} type ${aircraft.actualAircraftType} at the north apron with ${PHONETIC_ATIS}, request VFR departure${flightFollowing ? ' with flight following' : ''} to the ${flightFollowing ? DEST_TO_NAME_MAP[routing] + ' airport' : routing} at ${altitude} feet`,
        responseMessage: `Maintain VFR at or below 2500, departure 119.75, squawk ${aircraft.flightPlan.squawk}`,
        responsePhoneticMessage: `${phoneticizeString(aircraft.callsign)} maintain VFR at or below 2500, departure one one niner point seven five, squawk ${phoneticizeString(aircraft.flightPlan.squawk)}`,
        priority: 1,
        callsign: aircraft.callsign,
        nextRequestDelay: 0,
        atcMessage: `VFR clearance sent to ${aircraft.callsign}`,
        requestType: 'clearanceVFR',
        subsequentRequest: {
          responseMessage: 'Runway 29, taxi via C, A, cross runway 36',
          responsePhoneticMessage: `${phoneticizeString(aircraft.callsign)} runway two niner, taxi via charlie, alpha, cross runway three six`,
          atcMessage: `Taxi instruction sent to ${aircraft.callsign}`,
          requestType: 'readbackVFR',
          reminder: {
            message: 'Ready to taxi',
            phoneticMessage: `${phoneticizeString(aircraft.callsign)} ready to taxi`,
            type: 'taxiVFR',
            sendDelay: 20000,
          },
          priority: 1,
          nextStatus: 'taxi',
          subsequentRequest: handoffRequest(aircraft.callsign),
          callsign: aircraft.callsign,
          nextRequestDelay: 0,
        },
      },
    ],
    flightPlan: {
      ...aircraft.flightPlan,
      routeType: flightFollowing ? 'VFRFF' : 'VFR',
      requestedAltitude: altitude,
      direction: `${flightFollowing ? DEST_TO_NAME_MAP[routing] + ' airport' : routing}`,
    },
  };
}

function buildVFRPatternRequest(
  aircraft: Omit<UnspawnedVFRAircraft, 'requests'>
): UnspawnedVFRAircraft {
  return {
    ...aircraft,
    requests: [
      {
        requestMessage: `Type ${aircraft.actualAircraftType} at the north apron with ${PHONETIC_ATIS}, request taxi for pattern work`,
        requestPhoneticMessage: `Portland ground, ${phoneticizeString(aircraft.callsign)} type ${aircraft.actualAircraftType} at the north apron with ${PHONETIC_ATIS}, request taxi for pattern work`,
        responseMessage: `Squawk VFR, runway 29, taxi via C, A, cross runway 36`,
        responsePhoneticMessage: `${phoneticizeString(aircraft.callsign)} squawk VFR, runway two niner taxi via charlie, alpha, cross runway three six`,
        requestType: 'pattern',
        nextStatus: 'taxi',
        atcMessage: `Taxi instruction sent to ${aircraft.callsign}`,
        subsequentRequest: handoffRequest(aircraft.callsign),
        priority: 1,
        callsign: aircraft.callsign,
        nextRequestDelay: 0,
      },
    ],
    flightPlan: {
      ...aircraft.flightPlan,
      routeType: 'pattern',
    },
  };
}

function buildRandomSquawk() {
  const squawk = `${Math.floor(Math.random() * 8)}${Math.floor(Math.random() * 8)}${Math.floor(Math.random() * 8)}${Math.floor(Math.random() * 8)}`;
  if (squawk === '7500' || squawk === '7600' || squawk === '7700') {
    return buildRandomSquawk();
  }
  return squawk;
}

function buildRandomFlightNumber() {
  if (Math.random() < 0.5) {
    return `${Math.ceil(Math.random() * 8)}${Math.floor(Math.random() * 9)}${Math.floor(Math.random() * 9)}`;
  }
  return `${Math.ceil(Math.random() * 8)}${Math.floor(Math.random() * 9)}${Math.floor(Math.random() * 9)}${Math.floor(Math.random() * 9)}`;
}

function getRandomJetType() {
  return getRandomArrayElement(JET_TYPES);
}

function getRandomTecType() {
  return getRandomArrayElement(TEC_TYPES);
}

function getRandomGAType() {
  return getRandomArrayElement(GA_TYPES);
}

function getRandomRoute(prefRoutes: PrefRoute[]) {
  const destinationOptions: Record<string, boolean> = {};
  prefRoutes.map((route) => (destinationOptions[route.destination] = true));
  const destinations = Object.keys(destinationOptions);
  const randomDestination = getRandomArrayElement(destinations);
  const routesToDestination = prefRoutes.filter((route) => route.destination === randomDestination);
  const prefRoute = getRandomArrayElement(routesToDestination);

  let routeString = prefRoute.route.substring(4, prefRoute.route.length - 4);

  if (Math.random() > 0.75) {
    const random = Math.random();
    if (random < 0.33) {
      const blankRoutes = ['IFR DIRECT', 'DIRECT', ''];
      routeString = getRandomArrayElement(blankRoutes);
    } else if (random >= 0.33 && random < 0.44) {
      const otherRoutes = prefRoutes.filter((route) => route.destination !== prefRoute.destination);
      const randomRoute = getRandomArrayElement(otherRoutes);
      routeString = randomRoute.route.substring(4, randomRoute.route.length - 4);
    } else {
      const splitRoute = routeString.split(' ');
      const numElementsToDrop = Math.floor(Math.random() * Math.ceil(splitRoute.length / 2));
      if (Math.random() < 0.5) {
        splitRoute.splice(splitRoute.length - numElementsToDrop - 1);
      } else {
        splitRoute.splice(0, numElementsToDrop);
      }
      routeString = splitRoute.join(' ');
    }
  }

  return {
    ...prefRoute,
    route: routeString,
  };
}

function getRandomIFRAltitude(prefRoute: PrefRoute) {
  if (prefRoute.type === 'TEC') {
    if (Math.random() < 0.75) {
      return getRandomArrayElement(SPAWNABLE_TEC_WEST_ALT);
    }
    const random = Math.random();
    if (random < 0.33) {
      return getRandomArrayElement(SPAWNABLE_TEC_EAST_ALT);
    }
    if (random >= 0.33 && random < 0.66) {
      return getRandomArrayElement(SPAWNABLE_HIGH_WEST_ALT);
    }
    const alt = `${getRandomArrayElement(SPAWNABLE_TEC_WEST_ALT)}00`;
    if (alt.charAt(0) === '0') {
      return alt.substring(1);
    }
    return alt;
  }

  if (Math.random() < 0.7) {
    return getRandomArrayElement(SPAWNABLE_HIGH_WEST_ALT);
  }
  if (Math.random() < 0.5) {
    return getRandomArrayElement(SPAWNABLE_HIGH_EAST_ALT);
  }
  return `${getRandomArrayElement(SPAWNABLE_HIGH_WEST_ALT)}00`;
}

function getRandomVFRAltitude(direction: string) {
  let start = 3;
  if (direction.includes('west')) {
    start = 4;
  }

  const selectedValue = start + Math.floor(Math.random() * 4) * 2;
  return `${selectedValue}500`;
}

function buildRandomNNumber() {
  const numLetters = Math.random() < 0.5 ? 1 : 2;
  const numNumbers = 5 - numLetters;
  const LETTERS = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'J',
    'K',
    'L',
    'M',
    'N',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'W',
    'X',
    'Y',
    'Z',
  ];
  let callsign = '';
  for (let i = 0; i < numNumbers; i++) {
    if (i === 0) {
      callsign += Math.ceil(Math.random() * 8);
    } else {
      callsign += Math.floor(Math.random() * 9);
    }
  }
  for (let i = 0; i < numLetters; i++) {
    callsign += getRandomArrayElement(LETTERS);
  }

  return `N${callsign}`;
}

function getRandomJetSpeed() {
  const minValue = 390;
  const maxValue = 540;
  const selectedValue = minValue + Math.floor(Math.random() * (maxValue - minValue));
  return `${selectedValue}`;
}

function getRandomTecSpeed() {
  const minValue = 150;
  const maxValue = 200;
  const selectedValue = minValue + Math.floor(Math.random() * (maxValue - minValue));
  return `${selectedValue}`;
}

function getRandomJetEquipment() {
  if (Math.random() < 0.75) {
    return 'L';
  }
  const equipmentCodes = ['X', 'G', 'W', 'P', 'A', 'D', 'B', 'T', 'U'];
  return getRandomArrayElement(equipmentCodes);
}

function getRandomTecEquipment() {
  if (Math.random() < 0.75) {
    return 'G';
  }
  const equipmentCodes = ['X', 'L', 'W', 'P', 'A', 'D', 'B', 'T', 'U'];
  return getRandomArrayElement(equipmentCodes);
}

function getRandomDepartureDirection() {
  return getRandomArrayElement(DIRECTIONS);
}

function getRandomVFRDestination() {
  return getRandomArrayElement(VFR_DESTINATIONS);
}

function handoffRequest(callsign: string): AircraftRequest {
  return {
    callsign,
    priority: 1,
    responseMessage: 'Contact tower 120.9',
    responsePhoneticMessage: `${phoneticizeString(callsign)} contact tower one two zero point niner ${Math.random() < 0.5 ? 'have a good one' : 'good day'}`,
    nextRequestDelay: 0,
    nextStatus: 'handedOff',
    atcMessage: `${callsign} handed to tower`,
    requestType: 'handoff',
  };
}

function getRandomVoice() {
  const voices = window.speechSynthesis
    .getVoices()
    .filter(
      (voice) =>
        voice.lang === 'en-US' &&
        !voice.name.includes('Microsoft David') &&
        !voice.name.includes('Microsoft Zira')
    );
  const pitch = voices.length < 10 ? 0.8 + Math.random() * 0.4 : 1;
  return { voice: getRandomArrayElement(voices), pitch };
}

export function phoneticizeString(text: string): string {
  text = text.trim().replaceAll(' ', '');

  const airlineCode = text.substring(0, 3);
  if (AIRLINE_CODES[airlineCode]) {
    const flightNumber = text.substring(3);
    const splitNumber = [
      flightNumber.substring(0, flightNumber.length - 2),
      flightNumber.substring(flightNumber.length - 2),
    ];
    return `${AIRLINE_CODES[airlineCode]} ${splitNumber[0]} ${splitNumber[1]}`;
  }

  return text
    .split('')
    .map((character) => {
      return PHONETIC_ALPHABET[character] || PHONETIC_NUMBERS[character];
    })
    .join(' ');
}

export function phonetizeDestination(text: string): string {
  return DEST_TO_NAME_MAP[text] || phoneticizeString(text);
}
