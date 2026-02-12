import { Box, Grid } from '@mui/material';
import type { Dispatch, SetStateAction } from 'react';
import { useDifficulty } from '../../hooks/useDifficulty';
import { FeedbackLink } from './FeedbackLink';
import { VoiceRecognitionSection } from './VoiceRecognitionSection';
import { TextToSpeechSection } from './TextToSpeechSection';
import AlertBanner from './AlertBanner';

type Props = {
  setWelcomeOpen: Dispatch<SetStateAction<boolean>>;
};

function Welcome({ setWelcomeOpen }: Props) {
  const { difficulty, updateDifficulty } = useDifficulty();

  return (
    <div
      style={{
        backgroundImage: 'url(blurredBackground.png)',
        backgroundSize: 'cover',
        width: '100vw',
        height: '100vh',
      }}
    >
      <Box className="welcome" sx={{ overflowY: 'scroll', maxHeight: '90vh' }}>
        <h1>Welcome to vSweatbox!</h1>
        <p>
          If you are a new controller waiting for your C Ground training, this is your place to
          prepare for your first sweatbox sessions. This is a tool designed to help you gain
          familiarity with CRC and controlling outside of your time with mentors. Don't worry about
          messing anything up; this is a completely isolated virtual sweatbox just for you. It is a
          simplified recreation of both CRC and vStrips in your browser, matching how you will use
          those systems as closely as possible.
        </p>
        <AlertBanner
          text="Please note: aircraft may not respond exactly as you would expect. This is a simpified
            training tool, not a perfectly accurate simulation."
          severity="warning"
        />
        <hr></hr>
        <h3>Before you begin:</h3>
        <ol>
          <li>Go through the VATUSA Academy courses and complete your ARTCC onboarding</li>
          <li>Pass your SOP and Clearance/Ground Exams</li>
          <li>
            Make sure you've read through all applicable SOPs and charts &#x28;and have them
            handy!&#x29;
          </li>
        </ol>
        <hr></hr>
        <h3>Tips:</h3>
        <ol>
          <li>
            Even if you choose not to use voice recognition, practice actually saying instructions
            out loud
          </li>
          <li>
            Click the Help menu in the bottom right corner of the screen for controls and FAQs
          </li>
          <li>Check the Areas for Improvement tool for personalized feedback</li>
          <li>Spend some time observing on the live network to see how our controllers work</li>
        </ol>
        <hr></hr>
        <VoiceRecognitionSection />
        <hr></hr>
        <TextToSpeechSection />
        <hr></hr>
        <h3>Difficulty:</h3>
        <p>
          This setting adjusts how many planes will try to talk to you. Don't panic! If you start to
          fall behind, the simulation will wait for you to catch up. Prioritize good habits and
          correctness over speed.
        </p>
        <br></br>
        <div>
          <Grid container spacing={3}>
            <Grid size={'auto'}>
              <b>Beginner</b>
            </Grid>
            <Grid size={'grow'}>
              <input
                type="range"
                min="1"
                max="4"
                defaultValue={difficulty}
                style={{ width: '100%' }}
                onChange={(event) => updateDifficulty(Number(event.target.value))}
              ></input>
            </Grid>
            <Grid size={'auto'}>
              <b>Veteran</b>
            </Grid>
          </Grid>
        </div>
        <br></br>
        <div style={{ textAlign: 'center' }}>
          <button
            style={{
              backgroundColor: '#444',
              padding: '20px',
              border: '1px solid white',
            }}
            onClick={() => setWelcomeOpen(false)}
          >
            Ready for Briefing!
          </button>
        </div>
        <FeedbackLink></FeedbackLink>
        Created by Nick Hall
        <br></br>
        Concept by Jeff Hall
      </Box>
    </div>
  );
}

export default Welcome;
