import type { Aircraft, Keywords, RequestType } from '../../types/common';
import { PHONETIC_ATIS } from './alphabet';

export const SPEECH_AVAILABLE = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

export const DEFAULT_PTT_KEY = 'Escape';

export const REQUEST_KEYWORDS: Record<RequestType, Keywords> = {
  clearanceIFR: {
    keywords: [
      { phrase: 'clear', missingPhraseResponse: 'clearance limit' },
      { phrase: 'maintain', missingPhraseResponse: 'altitude' },
      { phrase: '119', missingPhraseResponse: 'departure frequency' },
      { phrase: 'squawk', missingPhraseResponse: 'squawk' },
    ],
    alternatives: [
      {
        keywords: [],
        atLeastOneOf: ['request'],
        aircraftResponse: '',
      },
      {
        keywords: [],
        atLeastOneOf: ['advise', 'ready', 'copy'],
        aircraftResponse: 'Ready to copy',
      },
    ],
  },
  readbackIFR: {
    keywords: [
      { phrase: 'readback', missingPhraseResponse: 'was our readback correct?' },
      { phrase: 'correct', missingPhraseResponse: 'was our readback correct?' },
    ],
  },
  clearanceVFR: {
    keywords: [
      { phrase: 'maintain', missingPhraseResponse: 'altitude' },
      { phrase: '119', missingPhraseResponse: 'departure frequency' },
      { phrase: 'squawk', missingPhraseResponse: 'squawk' },
    ],
  },
  readbackVFR: {
    keywords: [
      { phrase: 'taxi' },
      { phrase: 'runway 29', missingPhraseResponse: 'departure runway' },
    ],
    alternatives: [
      {
        keywords: [],
        atLeastOneOf: ['advise', 'ready'],
        aircraftResponse: 'Ready to taxi',
      },
    ],
  },
  pushback: {
    keywords: [{ phrase: 'push' }],
    atLeastOneOf: ['approved', 'discretion', 'risk'],
    alternatives: [
      {
        keywords: [],
        atLeastOneOf: ['advise', 'ready'],
        aircraftResponse: 'Ready for pushback',
      },
      {
        keywords: [{ phrase: 'hold' }],
        aircraftResponse: 'Holding position',
      },
    ],
  },
  taxi: {
    keywords: [
      { phrase: 'taxi' },
      { phrase: 'runway 29', missingPhraseResponse: 'departure runway' },
    ],
    alternatives: [
      {
        keywords: [],
        atLeastOneOf: ['advise', 'ready'],
        aircraftResponse: 'Ready to taxi',
      },
    ],
  },
  pattern: {
    keywords: [
      { phrase: 'taxi' },
      { phrase: 'runway 29', missingPhraseResponse: 'departure runway' },
      { phrase: 'squawk', missingPhraseResponse: 'squawk' },
    ],
    alternatives: [
      {
        keywords: [],
        atLeastOneOf: ['advise', 'ready'],
        aircraftResponse: 'Ready to taxi',
      },
    ],
  },
  handoff: {
    keywords: [
      { phrase: 'contact' },
      { phrase: 'tower' },
      { phrase: '120', missingPhraseResponse: 'tower frequency' },
    ],
    alternatives: [
      {
        keywords: [
          { phrase: 'monitor' },
          { phrase: 'tower' },
          { phrase: '120', missingPhraseResponse: 'tower frequency' },
        ],
        aircraftResponse: 'Monitor tower 120.9',
        aircraftResponsePhonetic: 'Monitor tower one two zero point niner',
      },
    ],
  },
};

export const GLOBAL_ALTERNATIVES = function (aircraft: Aircraft): Keywords[] {
  let alternativeKeywords = [
    {
      keywords: [{ phrase: 'radio' }, { phrase: 'check' }],
      aircraftResponse: 'I read you loud and clear',
    },
    {
      keywords: [{ phrase: 'aircraft type' }],
      aircraftResponse: `Our aircraft is type ${aircraft.actualAircraftType}`,
    },
    {
      keywords: [{ phrase: 'verify' }],
      atLeastOneOf: ['atis', 'information'],
      aircraftResponse: `We have information ${PHONETIC_ATIS}`,
    },
    {
      keywords: [{ phrase: 'confirm' }],
      atLeastOneOf: ['atis', 'information'],
      aircraftResponse: `We have information ${PHONETIC_ATIS}`,
    },
    {
      keywords: [{ phrase: 'say' }],
      atLeastOneOf: ['atis', 'information'],
      aircraftResponse: `We have information ${PHONETIC_ATIS}`,
    },
    {
      keywords: [{ phrase: 'standby' }],
      aircraftResponse: '',
    },
  ];

  if (aircraft.flightPlan.routeType.includes('VFR')) {
    const isFlightFollowing = aircraft.flightPlan.routeType.includes('ff');
    alternativeKeywords = alternativeKeywords.concat([
      {
        keywords: [{ phrase: 'say' }],
        atLeastOneOf: ['direction', 'destination'],
        aircraftResponse: `We are departing to the ${aircraft.flightPlan.direction}${isFlightFollowing ? ' with flight following' : ''}`,
      },
      {
        keywords: [{ phrase: 'repeat' }],
        atLeastOneOf: ['direction', 'destination'],
        aircraftResponse: `We are departing to the ${aircraft.flightPlan.direction}${isFlightFollowing ? ' with flight following' : ''}`,
      },
      {
        keywords: [{ phrase: 'say' }],
        atLeastOneOf: ['altitude'],
        aircraftResponse: `We are planning ${aircraft.flightPlan.requestedAltitude} feet`,
      },
      {
        keywords: [{ phrase: 'repeat' }],
        atLeastOneOf: ['altitude'],
        aircraftResponse: `We are planning ${aircraft.flightPlan.requestedAltitude} feet`,
      },
      {
        keywords: [{ phrase: 'intentions' }],
        aircraftResponse: `Requesting VFR departure to the ${aircraft.flightPlan.direction} at ${aircraft.flightPlan.requestedAltitude}${isFlightFollowing ? ' with flight following' : ''}`,
      },
      {
        keywords: [{ phrase: 'flight following' }],
        aircraftResponse: `${isFlightFollowing ? 'Affirmative, request flight following' : 'Negative flight following'}`,
      },
    ]);
  }

  if (aircraft.flightPlan.routeType === 'pattern') {
    alternativeKeywords = alternativeKeywords.concat([
      {
        keywords: [{ phrase: 'intentions' }],
        aircraftResponse: `Requesting taxi for pattern work`,
      },
    ]);
  }

  if (aircraft.status === 'pushback') {
    alternativeKeywords = alternativeKeywords.concat({
      keywords: [],
      atLeastOneOf: ['advise', 'ready'],
      aircraftResponse: "We'll call for taxi in a minute or two",
    });
  }

  return alternativeKeywords;
};
