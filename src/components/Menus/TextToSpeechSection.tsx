import { CheckCircleOutline } from '@mui/icons-material';
import { Grid } from '@mui/material';
import AlertBanner from './AlertBanner';

export function TextToSpeechSection() {
  function isMicrosoftEdge() {
    return navigator.userAgent.includes('Edg/');
  }

  return (
    <>
      <Grid container spacing={4}>
        <Grid>
          <h3>Text to Speech:</h3>
        </Grid>
        <Grid
          alignItems="center"
          display="flex"
          style={{ color: 'rgba(0, 189, 0, 1)', paddingTop: '20px' }}
        >
          {isMicrosoftEdge() && (
            <>
              <span style={{ marginRight: '8px' }}>
                You're using the best browser for text-to-speech
              </span>
              <CheckCircleOutline style={{ fontSize: '25px' }} />
            </>
          )}
        </Grid>
      </Grid>
      <p>
        By default, vSweatbox will use text-to-speech to play aircraft requests out loud for you.
        You can disable this at any point by using the RX button on the voice switch, which will
        cause aircraft requests to show up as text only. Make sure that your volume is turned up and
        your browser tab is not muted. You can continue to use voice recognition independently of
        text-to-speech.
      </p>
      {!isMicrosoftEdge() && (
        <AlertBanner
          text="Your browser has limited text-to-speech support! MS Edge is recommended, though not
            required."
          severity="error"
        />
      )}
    </>
  );
}
