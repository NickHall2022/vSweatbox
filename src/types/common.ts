import type { Dispatch, SetStateAction } from 'react';
import type { Updater } from 'use-immer';

export type FlightStatus =
  | 'ramp'
  | 'clearedIFR'
  | 'pushbackDiscretion'
  | 'pushback'
  | 'taxi'
  | 'awaitingHandoff'
  | 'handedOff'
  | 'handedOffReminded'
  | 'departed';

export type FlightPlan = FlightPlanDefaultIFRAttributes & {
  aircraftType: string;
  requestedAltitude?: string;
  equipmentCode: string;
  speed: string;
  callsign: string;
  routeType: 'TEC' | 'H' | 'pattern' | 'VFR' | 'VFRFF';
};

export type FlightPlanDefaultIFRAttributes = {
  altitude: string;
  destination: string;
  CID: string;
  plannedTime: string;
  departure: string;
  remarks: string;
  printCount: number;
  created: boolean;
  route: string;
  originalRoute: string;
  squawk: string;
  direction?: string;
};

export type Aircraft = AircraftDefaultAttributes & {
  callsign: string;
  flightPlan: FlightPlan;
  statusChangedTime?: number;
  taxiwayNodeId?: string;
  size: number;
  actualAircraftType: string;
  requests: AircraftRequest[];
};

export type AircraftDefaultAttributes = {
  status: FlightStatus;
  parkingSpotId: string;
  positionX: number;
  positionY: number;
  rotation: number;
  canSendRequestTime: number;
  voice: SpeechSynthesisVoice;
  pitch: number;
  hasBeenSpokenTo: boolean;
  holdingPosition: boolean;
};

export type BayName = 'ground' | 'local' | 'spare' | 'printer';

export type AbstractStrip = {
  id: string;
  bayName: BayName;
  offset: boolean;
  type: 'divider' | 'strip' | 'handwrittenDivider' | 'blank';
};

export type StripData = AbstractStrip &
  FlightPlan & {
    box10: string;
    box12: string;
  };

export type DividerData = AbstractStrip & {
  name: string;
};

export type AircraftDetails = {
  aircrafts: Aircraft[];
  amendFlightPlan: (amendedFlightPlan: FlightPlan) => void;
  removeFirstRequest: (callsign: string) => void;
  setNextRequestTime: (callsign: string, canSendRequestTime: number) => void;
  setPlanePosition: (callsign: string, x: number, y: number, angle?: number) => void;
  setPlaneStatus: (callsign: string, status: FlightStatus, timer: number) => void;
  deleteFlightPlan: (callsign: string) => void;
  spawnNewFlight: () => Aircraft | undefined;
  setTaxiwayNodeId: (callsign: string, id: string) => void;
  setAircraftHasBeenSpokenTo: (callsign: string) => void;
  holdPosition: (callsign: string, value: boolean, timer: number) => void;
};

export type StripsDetails = {
  strips: AbstractStrip[];
  setStrips: Updater<AbstractStrip[]>;
  printerStrips: StripData[];
  printAmendedFlightPlan: (flightPlan: FlightPlan) => void;
  printStrip: (strip: StripData) => void;
  deleteStrip: (idToDelete: string) => void;
  selectedBay: BayName;
  setSelectedBay: Dispatch<SetStateAction<BayName>>;
  moveStripToBay: (stripToMove: AbstractStrip, bayName: BayName) => void;
};

export type MessageType = 'system' | 'ATC' | 'radio' | 'self';

export type Message = {
  callsign: string;
  time: number;
  content: string;
  type: MessageType;
  id: string;
};

export type MessagesDetails = {
  messages: Message[];
  sendMessage: (
    content: string,
    callsign: string,
    type: MessageType,
    phoneticMessage?: string
  ) => void;
  recieveSwitchEnabled: boolean;
  setRecieveSwitchEnabled: Dispatch<SetStateAction<boolean>>;
};

export type RequestReminderType = 'readbackIFR' | 'taxiVFR' | 'aircraftHandoff';
export type RequestType =
  | 'clearanceIFR'
  | 'readbackIFR'
  | 'clearanceVFR'
  | 'readbackVFR'
  | 'pattern'
  | 'pushback'
  | 'taxi'
  | 'handoff';

export type AircraftRequest = {
  callsign: string;
  priority: number;
  responseMessage?: string;
  responsePhoneticMessage?: string;
  requestMessage?: string;
  requestPhoneticMessage?: string;
  subsequentRequest?: AircraftRequest;
  requestType: RequestType;
  nextRequestDelay: number;
  atcMessage?: string;
  nextStatus?: FlightStatus;
  previouslyMatchedKeywords?: string[];
  previousInstructions?: string[];
  reminder?: {
    message: string;
    phoneticMessage: string;
    sendDelay: number;
    type: RequestReminderType;
    sendTime?: number;
  };
};

export type SimulationDetails = {
  requests: AircraftRequest[];
  paused: boolean;
  setPaused: Dispatch<SetStateAction<boolean>>;
  pushToTalkActive: boolean;
  setPushToTalkActive: Dispatch<SetStateAction<boolean>>;
  setRequests: Updater<AircraftRequest[]>;
  timer: number;
  completeRequest: (callsign: string, completedByVoice?: boolean) => void;
  discardRequest: (callsign: string) => void;
};

export type FaaRouteType = 'L' | 'H' | 'LSD' | 'HSD' | 'SLD' | 'HLD' | 'TEC';

export type PrefRoute = {
  area?: string;
  a_artcc: string;
  altitude?: string;
  origin: string;
  aircraft?: string;
  destination: string;
  hours1?: string;
  hours2?: string;
  hours3?: string;
  type: FaaRouteType;
  d_artcc: string;
  route: string;
  flow?: string;
  seq: number;
};

export type PrefRouteDetails = {
  tecRoutes: PrefRoute[];
  highRoutes: PrefRoute[];
};

export type ParkingSpot = {
  x: number;
  y: number;
  rotation: number;
  location: string;
  pushbackIntoRamp: boolean;
  pushbackLocation: { x: number; y: number };
  airline?: string;
  available: boolean;
  id: string;
  type: ParkingSpotType;
  taxiInstruction?: ParkingSpotTaxiInstruction;
};

export type ParkingSpotTaxiInstruction = {
  text: string;
  phonetic: string;
};

export type ParkingSpotType = 'airline' | 'ga' | 'TEC';

export type ParkingSpotMethods = {
  reserveSpot: (type: ParkingSpotType) => ParkingSpot | undefined;
  releaseSpot: (id: string) => void;
  getPushbackLocation: (id: string) => { x: number; y: number };
  getParkingSpotPushbackIntoRamp: (id: string) => boolean;
};

export type DifficultyDetails = {
  difficulty: number;
  updateDifficulty: (newDifficulty: number) => void;
};

export type MistakeType =
  | 'stripBox'
  | 'badRoute'
  | 'IFRAltFormat'
  | 'badIFRAlt'
  | 'badEquipment'
  | 'stripHandoff'
  | 'aircraftHandoff'
  | 'readbackIFR'
  | 'taxiVFR'
  | 'VFRAltFormat'
  | 'badVFRAlt'
  | 'badVFRAircraft'
  | 'badVFRFF';

export type PhraseologyMistakeType =
  | 'forgotToIdentify'
  | 'usedDecimal'
  | 'forgotCrossing'
  | 'taxiToRunway'
  | 'pushbackKeyword'
  | 'vfrForgotReadback'
  | 'clearanceLimitAirport'
  | 'craftOrder';

export type Mistake = {
  type: MistakeType;
  details?: string;
  secondaryDetails?: string;
};

export type PhraseologyMistake = {
  type: PhraseologyMistakeType;
  details?: string;
  secondaryDetails?: string;
};

export type MistakeDetails = {
  mistakes: Mistake[];
  addMistake: (type: MistakeType, details?: string, secondaryDetails?: string) => void;
  phraseologyMistakes: PhraseologyMistake[];
  addPhraseologyMistake: (
    type: PhraseologyMistakeType,
    details?: string,
    secondaryDetails?: string
  ) => void;
  reviewClearance: (callsign: string) => void;
  newMistakes: (MistakeType | PhraseologyMistakeType)[];
  setNewMistakes: Updater<(MistakeType | PhraseologyMistakeType)[]>;
  reviewVFRDeparture: (callsign: string) => void;
  reviewGeneralPhraseology: (transcript: string) => void;
  reviewPhraseologyForRequest: (transcript: string, request: AircraftRequest) => void;
};

export type Keywords = {
  keywords: { phrase: string; missingPhraseResponse?: string }[];
  atLeastOneOf?: string[];
  alternatives?: Keywords[];
  aircraftResponse?: string;
  aircraftResponsePhonetic?: string;
  requiredStatus?: FlightStatus;
};
