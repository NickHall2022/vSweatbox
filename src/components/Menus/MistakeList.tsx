import { Grid } from '@mui/material';
import { useMistakes } from '../../hooks/useMistakes';
import { v4 as uuidv4 } from 'uuid';
import type { Mistake, PhraseologyMistake } from '../../types/common';
import { SPEECH_AVAILABLE } from '../../utils/constants/speech';

function createMistakeList(
  newMistakesCount: number,
  mistakes: (Mistake | PhraseologyMistake)[],
  title: string,
  subtitle: string,
  documentation: string,
  mistakeMessage: string,
  width?: string,
  secondaryMessage?: string,
  noteMessage?: string,
  formatAsMessage?: boolean
) {
  if (mistakes.length === 0) {
    return <></>;
  }

  const detailsList = mistakes.map((mistake) => (
    <span key={uuidv4()}>
      {formatAsMessage && <br></br>}
      {secondaryMessage !== undefined && (
        <>
          {secondaryMessage} <b>{mistake.secondaryDetails}: </b>
        </>
      )}
      <span
        className={formatAsMessage ? 'messageDisplay' : 'flightPlanInput'}
        style={{
          width: width ? width : 'auto',
          paddingLeft: '5px',
          paddingRight: '5px',
        }}
      >
        {mistake.details?.length === 0 ? <>&nbsp;</> : mistake.details}
      </span>
      &nbsp;
    </span>
  ));

  return (
    <div>
      <Grid container spacing={1}>
        <Grid>
          <p style={{ margin: '0px' }}>
            <b>{title}</b>
          </p>
        </Grid>
        <Grid>
          {newMistakesCount > 0 && <span className="mistakeCounter">{newMistakesCount}</span>}
        </Grid>
      </Grid>

      <p style={{ margin: '0px' }}>
        {subtitle}. {noteMessage && <i>{noteMessage}. </i>}See <b>{documentation}</b>
      </p>
      <p style={{ margin: '0px' }}>
        {mistakeMessage}: {detailsList}
      </p>
      <br></br>
    </div>
  );
}

function MistakeList() {
  const { mistakes, phraseologyMistakes, newMistakes } = useMistakes();

  if (mistakes.length === 0 && phraseologyMistakes.length === 0) {
    return <p style={{ textAlign: 'center' }}>No mistakes detected yet. Good work!</p>;
  }

  const IFRAltFormat = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'IFRAltFormat').length,
    mistakes.filter((mistake) => mistake.type === 'IFRAltFormat'),
    'IFR Altitude Format',
    'IFR altitudes should be formatted with only 3 digits, such as 220 to indicate Flight Level 220, and should be in multiples of 1000 feet',
    'General SOP 5.15.8',
    'You sent clearances with these incorrect altitudes',
    '60px'
  );

  const badIFRAlt = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'badIFRAlt').length,
    mistakes.filter((mistake) => mistake.type === 'badIFRAlt'),
    'Incorrect IFR Altitude',
    "IFR cruise altitudes are assigned based on an aircraft's direction of flight. Some routes may also have additional restrictions",
    'ATC Handbook 3.7',
    'You sent clearances with these incorrect altitudes',
    '60px',
    'To'
  );

  const badEquipment = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'badEquipment').length,
    mistakes.filter((mistake) => mistake.type === 'badEquipment'),
    'Incorrect Equipment Suffix',
    'Ensure that the equipment suffix makes sense for the filed aircraft type and route',
    'General SOP 5.13.4',
    'You sent clearances with these incorrect equipment suffixes',
    '20px',
    'Type'
  );

  const badRoute = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'badRoute').length,
    mistakes.filter((mistake) => mistake.type === 'badRoute'),
    'Incorrect IFR Route',
    'Whenever possible, assign aircraft to preferred routes found in the IDS',
    'General SOP 7.6',
    'You sent clearances with these incorrect routes',
    undefined,
    'To',
    'Note: there may exist valid routes that vSweatbox is missing, use your best judgement'
  );

  const readbackIFR = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'readbackIFR').length,
    mistakes.filter((mistake) => mistake.type === 'readbackIFR'),
    'IFR Clearance Readback',
    `After an aircraft reads back an IFR clearance, don't forget to tell them "Readback correct"`,
    'ATC Handbook 3.8.2',
    'You forgot to acknowledge the readback for these aircraft'
  );

  const taxiVFR = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'taxiVFR').length,
    mistakes.filter((mistake) => mistake.type === 'taxiVFR'),
    'VFR Departure Readback',
    'VFR departures should expect taxi instructions immediately after their readback',
    'ATC Handbook 3.12.3',
    'You forgot to acknowledge the readback and taxi these aircraft'
  );

  const aircraftHandoff = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'aircraftHandoff').length,
    mistakes.filter((mistake) => mistake.type === 'aircraftHandoff'),
    'Handoff to Tower',
    'Aircraft should be handed off to Tower prior to reaching their departure runway',
    'ATC Handbook 4.3',
    'You forgot to hand off these aircraft'
  );

  const stripHandoff = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'stripHandoff').length,
    mistakes.filter((mistake) => mistake.type === 'stripHandoff'),
    'vStrips Coordination',
    'Ground Control must push a flight strip to Local Control for each departing aircraft',
    'General SOP 5.16.7',
    'You forgot to push a strip to the LC bay for these aircraft'
  );

  const stripBox = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'stripBox').length,
    mistakes.filter((mistake) => mistake.type === 'stripBox'),
    'vStrips Annotation',
    'Strip annotations, especially box 10 and 12, should be filled out for every aircraft',
    'General SOP 5.16',
    'You did not correctly annotate strips for these aircraft'
  );

  const badVFRAircraft = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'badVFRAircraft').length,
    mistakes.filter((mistake) => mistake.type === 'badVFRAircraft'),
    'VFR Aircraft Type',
    'VFR flight plans should include the correct aircraft type',
    'General SOP 5.15.7.1',
    'You had incorrect types for the following aircraft',
    '40px',
    ''
  );

  const VFRAltFormat = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'VFRAltFormat').length,
    mistakes.filter((mistake) => mistake.type === 'VFRAltFormat'),
    'VFR Altitude Format',
    'VFR altitudes should be formatted as VFR/XXX. For example, VFR/045 would indicate VFR at 4500',
    'General SOP 5.15.7.3',
    'You had the following incorrectly formatted altitudes',
    '60px'
  );

  const badVFRAlt = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'badVFRAlt').length,
    mistakes.filter((mistake) => mistake.type === 'badVFRAlt'),
    'Incorrect VFR Altitude',
    'VFR altitudes should match the altitude requested by the pilot',
    'General SOP 5.15.7.3',
    'You had incorrect altitudes for the following aircraft',
    undefined,
    ''
  );

  const badVFRFF = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'badVFRFF').length,
    mistakes.filter((mistake) => mistake.type === 'badVFRFF'),
    'VFR Flight Following Remarks',
    `Flight plans for a VFR aircraft requesting Flight Following should include "FF" in the remarks section`,
    'General SOP 5.15.7.4',
    'Your remarks were incorrect for the following aircraft',
    undefined,
    ''
  );

  const forgotToIdentify = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'forgotToIdentify').length,
    phraseologyMistakes.filter((mistake) => mistake.type === 'forgotToIdentify'),
    'Self-Identification',
    `You should identify yourself as "Portland Ground" the first time you speak to each aircraft`,
    'FAA JO 7110.65 2-4-8',
    'You did not self-identify for the following aircraft',
    undefined
  );

  const usedDecimal = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'usedDecimal').length,
    phraseologyMistakes.filter((mistake) => mistake.type === 'usedDecimal'),
    'Use of "Decimal" in Frequency',
    `In the United States, we use "point" instead of "decimal", such as "one two zero point niner"`,
    'FAA JO 7110.65 2-4-17.k',
    'You used "decimal" in these instructions',
    undefined,
    undefined,
    '',
    true
  );

  const forgotCrossing = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'forgotCrossing').length,
    phraseologyMistakes.filter((mistake) => mistake.type === 'forgotCrossing'),
    'Use of "Cross Runway"',
    `Aircraft must be specifically told to "cross" runways to reach their departure runway`,
    'ATC Handbook 4.9.2',
    'You forgot crossing instructions for these aircraft',
    undefined,
    '',
    '',
    true
  );

  const taxiToRunway = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'taxiToRunway').length,
    phraseologyMistakes.filter((mistake) => mistake.type === 'taxiToRunway'),
    'Use of "Taxi to Runway"',
    `Departure taxi instructions should be phrased as "Runway XX, taxi via..." rather than "Taxi to runway XX via..."`,
    'ATC Handbook 4.7.2',
    'You said "taxi to runway" in these instructions',
    undefined,
    undefined,
    '',
    true
  );

  const pushbackKeyword = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'pushbackKeyword').length,
    phraseologyMistakes.filter((mistake) => mistake.type === 'pushbackKeyword'),
    'Pushback use of "Approved" and "Discretion"',
    `Aircraft that will push into a movement area should be told "Push approved". Aircraft requesting pushback onto a non-movement area should be told "Pushback your discretion"`,
    'ATC Handbook 4.6',
    'You used the incorrect phrasing in these instructions',
    undefined,
    '',
    '',
    true
  );

  const vfrForgotReadback = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'vfrForgotReadback').length,
    phraseologyMistakes.filter((mistake) => mistake.type === 'vfrForgotReadback'),
    'Use of "Readback Correct" for VFR Departures',
    `VFR departures must be told "Readback Correct" and then taxi instructions`,
    'ATC Handbook 3.12.2',
    'You forgot "Readback Correct" in these instructions',
    undefined,
    '',
    '',
    true
  );

  const clearanceLimitAirport = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'clearanceLimitAirport').length,
    phraseologyMistakes.filter((mistake) => mistake.type === 'clearanceLimitAirport'),
    'Clearance Limit "Airport"',
    `You must include the word "airport" when a clearance limit is an airport, such as "Cleared to the Boston airport"`,
    'FAA JO 7110.65 4-3-2.b(1)',
    'You forgot "airport" in these instructions',
    undefined,
    '',
    '',
    true
  );

  const craftOrder = createMistakeList(
    newMistakes.filter((mistakeType) => mistakeType === 'craftOrder').length,
    phraseologyMistakes.filter((mistake) => mistake.type === 'craftOrder'),
    'IFR "CRAFT" Clearance',
    `Every IFR clearance should include the 5 elements of CRAFT in the correct order `,
    'ATC Handbook 3.3.1',
    'You did not properly apply CRAFT in these instructions',
    undefined,
    '',
    '',
    true
  );

  return (
    <>
      {SPEECH_AVAILABLE && phraseologyMistakes.length > 0 && (
        <>
          <h2 style={{ marginTop: '0px', marginBottom: '10px' }}>Radio Phraseology</h2>
          {forgotToIdentify}
          {craftOrder}
          {clearanceLimitAirport}
          {usedDecimal}
          {pushbackKeyword}
          {vfrForgotReadback}
          {taxiToRunway}
          {forgotCrossing}
          {mistakes.length > 0 && <hr></hr>}
        </>
      )}
      {mistakes.length > 0 && (
        <>
          <h2 style={{ marginTop: '0px', marginBottom: '10px' }}>Procedures</h2>
          {IFRAltFormat}
          {badIFRAlt}
          {badEquipment}
          {badRoute}
          {readbackIFR}
          {taxiVFR}
          {aircraftHandoff}
          {stripHandoff}
          {stripBox}
          {badVFRAircraft}
          {VFRAltFormat}
          {badVFRAlt}
          {badVFRFF}
        </>
      )}
    </>
  );
}

export default MistakeList;
