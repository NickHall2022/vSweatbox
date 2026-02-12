import { Grid } from '@mui/material';
import { DEFAULT_PTT_KEY, SPEECH_AVAILABLE } from '../../utils/constants/speech';
import { CheckCircleOutline, MicNone } from '@mui/icons-material';
import { useEffect, useState, type Dispatch, type ReactElement, type SetStateAction } from 'react';
import AlertBanner from './AlertBanner';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition && new SpeechRecognition();
if (recognition) {
  recognition.lang = 'en-US';
}

export function VoiceRecognitionSection({
  externalSetPttKey,
}: {
  externalSetPttKey?: Dispatch<SetStateAction<string>>;
}) {
  const [pttButton, setPttButton] = useState(localStorage.getItem('pttButton') || DEFAULT_PTT_KEY);
  const [listeningForKey, setListeningForKey] = useState(false);
  const [listeningForVoice, setListeningForVoice] = useState(false);
  const [micTested, setMicTested] = useState(false);
  const [speechError, setSpeechError] = useState(false);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);

    if (recognition) {
      recognition.onspeechstart = () => {
        setMicTested(true);
        recognition.stop();
      };

      recognition.onerror = () => {
        setListeningForVoice(false);
        setSpeechError(true);
        recognition.stop();
      };
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  });

  function handleKeyPress(event: KeyboardEvent) {
    if (listeningForKey) {
      setListeningForKey(false);
      setPttButton(event.code);
      if (externalSetPttKey) {
        externalSetPttKey(event.code);
      }
      localStorage.setItem('pttButton', event.code);
      event.preventDefault();
    }
  }

  function handleSetKeyButtonPress() {
    setListeningForKey(true);
  }

  function handleTestMicButtonPress() {
    if (!listeningForVoice) {
      setListeningForVoice(true);
      setSpeechError(false);
      recognition.start();
    } else {
      setListeningForVoice(false);
      recognition.stop();
    }
  }

  if (!SPEECH_AVAILABLE) {
    return (
      <>
        <h3>Voice Recognition:</h3>

        <AlertBanner
          text="Your browser does not support voice recognition! Using Microsoft Edge is recommended."
          severity="error"
        />
      </>
    );
  }

  function isMicrosoftEdge() {
    return navigator.userAgent.includes('Edg/');
  }
  function isChrome() {
    return navigator.userAgent.includes('Chrome');
  }
  const browserMicrophoneSettings = isMicrosoftEdge()
    ? '(edge://settings/?search=microphone)'
    : isChrome()
      ? '(chrome://settings/content/microphone)'
      : '';

  let testMicText: string | ReactElement = 'Click to test mic';
  let buttonStyle = {};

  if (listeningForVoice) {
    testMicText = (
      <Grid container spacing={1}>
        <Grid size={'grow'}></Grid>
        <Grid>Listening</Grid>
        <Grid>
          <MicNone></MicNone>
        </Grid>
        <Grid size={'grow'}></Grid>
      </Grid>
    );
  }
  if (speechError) {
    buttonStyle = {
      backgroundColor: 'rgba(255, 0, 0, 0.15)',
      color: 'white',
      border: '1px solid rgba(255, 93, 93, 1)',
      textAlign: 'center',
    };
  }
  if (micTested) {
    testMicText = (
      <Grid container spacing={1}>
        <Grid size={'grow'}></Grid>
        <Grid>Mic verified</Grid>
        <Grid>
          <CheckCircleOutline></CheckCircleOutline>
        </Grid>
        <Grid size={'grow'}></Grid>
      </Grid>
    );
    buttonStyle = {
      backgroundColor: 'rgba(0, 255, 0, 0.26)',
      color: 'white',
      border: '1px solid rgba(0, 189, 0, 1)',
      textAlign: 'center',
    };
  }

  return (
    <>
      <Grid container spacing={4}>
        <Grid>
          <h3>Voice Recognition:</h3>
        </Grid>
        <Grid
          alignItems="center"
          display="flex"
          style={{ color: 'rgba(0, 189, 0, 1)', paddingTop: '20px' }}
        >
          <span style={{ marginRight: '8px' }}>Your browser supports voice recognition</span>
          <CheckCircleOutline style={{ fontSize: '25px' }} />
        </Grid>
      </Grid>
      <p>
        vSweatbox has a built-in voice recognition system to allow you to "talk" to the planes just
        as you would in the real sweatbox or live network. Here's a few quick tips:
      </p>
      <ol>
        <li>Enable microphone permission for this page</li>
        <li>
          Check your browser microphone settings to make sure you have the right device selected{' '}
          {browserMicrophoneSettings}
        </li>
        <li>Begin every transmission with the callsign you are trying to talk to</li>
        <li>Speak clearly and deliberately to maximize the accuracy of voice recognition</li>
        <li>Your browser window must be in focus for the PTT key to be recognized</li>
        <li>You can abort any transmission by saying "disregard"</li>
        <li>
          You can make the following requests to any aircraft: "Say aircraft type", "Verify
          ATIS/Information", "Radio check", "Hold Position"/"Continue"
        </li>
        <li>
          There are additional options for VFR aircraft: "Say intentions", "Say requested direction
          of flight", "Say requested altitude", "Are you requesting flight following?"
        </li>
        <li>
          You are allowed some flexibility in how you choose to say things, so long as you meet
          phraseology requirements
        </li>
      </ol>

      <Grid container spacing={3} display={'flex'} alignItems={'center'}>
        <Grid size={'grow'}></Grid>
        <Grid sx={{ marginTop: '5px', textAlign: 'center' }}>
          Push to talk button:
          <br></br>{' '}
          <b>
            <code
              style={{
                fontSize: '20px',
                border: '1px solid white',
                borderRadius: '5px',
                padding: '3px',
              }}
            >
              {!pttButton || pttButton === '' ? 'Invalid Key' : pttButton}
            </code>
          </b>
        </Grid>
        <Grid>
          <button onClick={handleSetKeyButtonPress} style={{ width: '250px' }}>
            {listeningForKey ? 'Press any key' : 'Click to set PTT button'}
          </button>
        </Grid>
        <Grid size={4}>
          <button
            onClick={handleTestMicButtonPress}
            disabled={micTested}
            style={{ ...buttonStyle, width: '100%', textAlign: 'center', height: '42px' }}
          >
            {testMicText}
          </button>
          {!micTested && speechError && (
            <div style={{ textAlign: 'center', color: 'rgba(255, 93, 93, 1)' }}>
              Speech not detected. Check settings and try again.
            </div>
          )}
        </Grid>
        <Grid size={'grow'}></Grid>
      </Grid>
    </>
  );
}
