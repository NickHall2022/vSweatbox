import { useEffect, useState, type ReactNode } from 'react';
import { useMessages } from '../hooks/useMessages';
import { AIRLINES } from '../utils/constants/aircraftTypes';
import { PHONETIC_ALPHABET_REVERSE } from '../utils/constants/alphabet';
import { SpeechContext, type SpeechDetails } from '../hooks/useSpeech';
import useSound from 'use-sound';
import { useSpeechInterpretation } from '../hooks/useSpeechInterpretation';
import { useSimulation } from '../hooks/useSimulation';
import { DEFAULT_PTT_KEY } from '../utils/constants/speech';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition && new SpeechRecognition();
if (recognition) {
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
}

export function SpeechProvider({ children }: { children: ReactNode }) {
  const [voiceSwitchEnabled, setVoiceSwitchEnabled] = useState(true);

  const { interpretNewSpeech } = useSpeechInterpretation();
  const { pushToTalkActive, setPushToTalkActive, paused } = useSimulation();

  const { sendMessage } = useMessages();
  const [playErrorSound] = useSound('Error.wav');

  useEffect(() => {
    recognition.onresult = (event) => {
      const transcript = compileTranscript(event.results);

      recognition.onend = () => {
        if (transcript != '') {
          triggerOutput(transcript);
        }
      };
    };

    recognition.onerror = () => {
      recognition.stop();
    };

    recognition.onstart = () => {
      recognition.onend = () => {};
    };

    document.addEventListener('keydown', handlePushToTalk);
    document.addEventListener('keyup', stopSpeaking);

    return () => {
      document.removeEventListener('keydown', handlePushToTalk);
      document.removeEventListener('keyup', stopSpeaking);
    };
  });

  function handlePushToTalk(event: KeyboardEvent) {
    if (
      !paused &&
      !pushToTalkActive &&
      event.code === (localStorage.getItem('pttButton') || DEFAULT_PTT_KEY)
    ) {
      if (voiceSwitchEnabled) {
        recognition.start();
      } else {
        playErrorSound();
        sendMessage('TX is disabled in your voice switch', '', 'system');
      }
      setPushToTalkActive(true);
    }
  }

  function stopSpeaking(event: KeyboardEvent) {
    if (event.code === (localStorage.getItem('pttButton') || DEFAULT_PTT_KEY)) {
      setPushToTalkActive(false);
      setTimeout(() => recognition.stop(), 500);
    }
  }

  function compileTranscript(results: SpeechRecognitionResultList) {
    let output = '';
    for (let i = 0; i < results.length; i++) {
      output += results[i][0].transcript + ' ';
    }
    return sanitizeTranscript(output);
  }

  function sanitizeTranscript(transcript: string) {
    transcript = transcript
      .toLowerCase()
      .replaceAll(',', '')
      .replaceAll('. ', ' ')
      .replaceAll('/', '')
      .replaceAll('?', '')
      .replaceAll(':', '')
      .replaceAll('-', '')
      .replaceAll('$', '')
      .replaceAll('9 or', '9')
      .replaceAll('9 er', '9')
      .replaceAll('9 uh', '9')
      .replaceAll('9 and', '9')
      .replaceAll('9 are', '9')
      .replaceAll('niner', '9')
      .replaceAll('nineer', '9')
      .replaceAll('diner', '9')
      .replaceAll(' 4th', '4')
      .replaceAll(' 5th', '5')
      .replaceAll(' 6th', '6')
      .replaceAll(' 7th', '7')
      .replaceAll(' 8th', '8')
      .replaceAll(' 9th', '9')
      .replaceAll('eighth', '8')
      .replaceAll(' ate ', '8')
      .replaceAll('via far', 'VFR')
      .replaceAll('via our', 'VFR')
      .replaceAll('via power', 'VFR')
      .replaceAll('fiat bar', 'VFR')
      .replaceAll(' url ', "you're")
      .replaceAll('i remember', 'N')
      .replaceAll('november ', 'N')
      .replaceAll('remember ', 'N')
      .replaceAll('gold', 'golf')
      .replaceAll('minton', 'maintain')
      .replaceAll('maintained', 'maintain')
      .replaceAll('maintaining', 'maintain')
      .replaceAll('pushed back', 'pushback')
      .replaceAll('push back', 'pushback')
      .replaceAll('read back', 'readback')
      .replaceAll('read that', 'readback')
      .replaceAll('reed back', 'readback')
      .replaceAll('right back', 'readback')
      .replaceAll('reed bank', 'readback')
      .replaceAll('readback act', 'readback correct')
      .replaceAll('is that correct', 'readback correct')
      .replaceAll('remake', 'readback')
      .replaceAll('read by', 'readback')
      .replaceAll('read my', 'readback')
      .replaceAll('rebecca', 'readback')
      .replaceAll('frequencies', 'frequency')
      .replaceAll('factor frequency', 'departure frequency')
      .replaceAll(' tao', ' tower')
      .replaceAll('hour', ' tower')
      .replaceAll(' tau', ' tower')
      .replaceAll('contact our', ' tower')
      .replaceAll('contact hour', ' tower')
      .replaceAll('texaco', 'taxi')
      .replaceAll('texas', 'taxi')
      .replaceAll('view', 'via')
      .replaceAll('tax review', 'taxi via')
      .replaceAll('tax ', 'taxi ')
      .replaceAll('text you', 'taxi via')
      .replaceAll('text me', 'taxi via')
      .replaceAll('talks', 'taxi via')
      .replaceAll('text to be', 'taxi via')
      .replaceAll('texting', 'taxi')
      .replaceAll('tuxedo', 'taxi via')
      .replaceAll('texavia', 'taxi via')
      .replaceAll('taxavia', 'taxi via')
      .replaceAll('texivia', 'taxi via')
      .replaceAll('taxivio', 'taxi via')
      .replaceAll('texadia', 'taxi via')
      .replaceAll('taxadia', 'taxi via')
      .replaceAll('texa via', 'taxi via')
      .replaceAll('tech cvi', 'taxi via')
      .replaceAll('texevia', 'taxi via')
      .replaceAll('tekstovia', 'taxi via')
      .replaceAll('view of', 'via')
      .replaceAll('texty', 'taxi')
      .replaceAll('texted', 'taxi')
      .replaceAll(' se ', ' say ')
      .replaceAll(' sir ', ' say ')
      .replaceAll(' save ', ' say ')
      .replaceAll('stand by', 'standby')
      .replaceAll('out of blow', 'at or below')
      .replaceAll('radio cha', 'radio check')
      .replaceAll('radio shack', 'radio check')
      .replaceAll('radioshack', 'radio check')
      .replaceAll("portland's", 'portland')
      .replaceAll('limousine', 'ls')
      .replaceAll(' chop', ' check')
      .replaceAll(' squad', ' squawk')
      .replaceAll('squawks', 'squawk')
      .replaceAll('s kwok', 'squawk')
      .replaceAll(' score', ' squawk')
      .replaceAll(' scorp', ' squawk')
      .replaceAll('squat', ' squawk')
      .replaceAll('sequoia', ' squawk')
      .replaceAll(' walk', ' squawk')
      .replaceAll(' guac', ' squawk')
      .replaceAll(' coffee', ' copy')
      .replaceAll(' on my', ' runway')
      .replaceAll('roommate', 'runway')
      .replaceAll('run by', 'runway')
      .replaceAll(' only ', ' runway ')
      .replaceAll('roaming', 'runway')
      .replaceAll('crossword', 'cross runway')
      .replaceAll('run my', 'runway')
      .replaceAll('run away', 'runway')
      .replaceAll('run like', 'runway')
      .replaceAll('roman', 'runway')
      .replaceAll('runaway', 'runway')
      .replaceAll('rampers', 'ramp is')
      .replaceAll('advised', 'advise')
      .replaceAll('advisement', 'advise')
      .replaceAll('advisory', 'advise ready')
      .replaceAll('advisor', 'advise ready')
      .replaceAll('adviser', 'advise')
      .replaceAll('right directors', 'radar vectors')
      .replaceAll('rate of rectors', 'radar vectors')
      .replaceAll('corrected', 'correct')
      .replaceAll('crack', 'correct')
      .replaceAll('clear ', 'cleared ')
      .replaceAll('declared', 'cleared')
      .replaceAll('concerns', 'clearance')
      .replaceAll('clarence', 'clearance')
      .replaceAll('st tensions', 'say intentions')
      .replaceAll('noble', 'nuble')
      .replaceAll('nebel', 'nuble')
      .replaceAll('is filed', 'as filed')
      .replaceAll('inspired', 'as filed')
      .replaceAll('has filed', 'as filed')
      .replaceAll('his filed', 'as filed')
      .replaceAll('viled', 'filed')
      .replaceAll('vile', 'filed')
      .replaceAll('biled', 'filed')
      .replaceAll('piled', 'filed')
      .replaceAll('bile', 'filed')
      .replaceAll('file ', 'filed ')
      .replaceAll('charley', 'charlie')
      .replaceAll("Charlie's", 'charlie')
      .replaceAll('fox trot', 'f')
      .replaceAll('foxtr ', 'f ')
      .replaceAll('fox ', 'f ')
      .replaceAll('funk straut', 'f')
      .replaceAll('funk strout', 'f')
      .replaceAll('fockstraught', 'f')
      .replaceAll('juilliard', 'j')
      .replaceAll('mic', 'm')
      .replaceAll('panpa ', 'p')
      .replaceAll('go back', 'q')
      .replaceAll('uniformed', 'u')
      .replaceAll('uniforms', 'u')
      .replaceAll('hello', '')
      .replaceAll('airlines', 'airline')
      .replaceAll('crowned', 'ground')
      .replaceAll('continued', 'continue')
      .replaceAll('cough', 'call for')
      .replaceAll('colon', 'call when')
      .replaceAll('11 9', '119')
      .replaceAll('119 .75', '119.75')
      .replaceAll('120.9er', '120.9')
      .replaceAll('1 to 0', '120')
      .replaceAll('went to 0', '120')
      .replaceAll('xray', 'x')
      .replaceAll('yankees', 'y')
      .replaceAll('zero', '0')
      .replaceAll(' adis ', ' atis ')
      .replaceAll(' adith ', ' atis ')
      .replaceAll('citis', 'say atis')
      .replaceAll(' edis ', ' atis ')
      .replaceAll('st etis', 'say atis')
      .replaceAll(' edith ', ' atis ')
      .replaceAll('it is', 'atis')
      .replaceAll('runway to 9', 'runway 29')
      .replaceAll('2 9', '29')
      .replaceAll('room 29', 'runway 29')
      .replaceAll("'s", ' is')
      .replaceAll(':00', '')
      .trim();

    if (transcript.startsWith('kr')) {
      transcript = transcript.replace('kr', 'care ');
    }
    if (transcript.startsWith('number ')) {
      transcript = transcript.replace('number ', 'N');
    }
    transcript = transcript.replace('number', 'nuble');
    transcript = transcript.replace('nouvel', 'nuble');
    transcript = transcript.replace('nuvel', 'nuble');
    transcript = transcript.replace('nabble', 'nuble');
    transcript = transcript.replace('nouble', 'nuble');
    transcript = transcript.replace('nubul', 'nuble');
    transcript = transcript.replace('nubble', 'nuble');
    transcript = transcript.replace('level', 'nuble');
    transcript = transcript.replace('nibble', 'nuble');
    transcript = transcript.replace('novel', 'nuble');
    transcript = transcript.replace('#', 'nuble ');
    transcript = transcript.replace('nuble form', 'nuble 4');
    transcript = transcript.replace('nuble for', 'nuble 4');
    transcript = transcript.replace('haskell', 'hskel');

    Object.keys(PHONETIC_ALPHABET_REVERSE).forEach((letter) => {
      transcript = transcript.replaceAll(letter, PHONETIC_ALPHABET_REVERSE[letter]);
    });
    transcript = formatCallsign(transcript);

    transcript = transcript.replace(' 44 departure', ' nuble 4 departure');
    transcript = transcript.replace("you're nuble", "you're number");
    transcript = transcript.replace('your nuble', "you're number");
    transcript = transcript.replace('you are nuble', 'you are number');
    transcript = transcript.replace('request nuble', 'request number');

    return transcript;
  }

  function formatCallsign(transcript: string) {
    if (
      transcript.length >= 2 &&
      transcript.charAt(0).toLowerCase() === 'd' &&
      transcript.charAt(1) !== ' ' &&
      !Number.isNaN(Number(transcript.charAt(1)))
    ) {
      if (transcript.charAt(0) === 'd') {
        transcript = transcript.replace('d', 'DAL');
      } else if (transcript.charAt(0) === 'D') {
        transcript = transcript.replace('D', 'DAL');
      }
    } else {
      for (const airline of Object.keys(AIRLINES)) {
        if (transcript.startsWith(airline)) {
          transcript = transcript.replace(airline, AIRLINES[airline]).replace(' ', '');
          break;
        }
      }
    }

    const splitTranscript = transcript.split(' ');
    if (splitTranscript.length > 0) {
      splitTranscript[0] = splitTranscript[0].toUpperCase();
    }

    let numStrayChunksToMerge = 0;
    if (splitTranscript[0].startsWith('N')) {
      const CALLSIGN_LENGTH = 6;
      let numLettersFound = splitTranscript[0].length;
      let i = 1;

      while (i < splitTranscript.length && numLettersFound < CALLSIGN_LENGTH) {
        if (splitTranscript[i] === 'to') {
          splitTranscript[i] = '2';
        }

        if (splitTranscript[i].length + numLettersFound > CALLSIGN_LENGTH) {
          break;
        }
        numStrayChunksToMerge++;
        numLettersFound += splitTranscript[i].length;
        splitTranscript[i] = splitTranscript[i].toUpperCase();
        i++;
      }
    }

    transcript = splitTranscript.join(' ');

    for (let j = 0; j < numStrayChunksToMerge; j++) {
      transcript = transcript.replace(' ', '');
    }

    return transcript;
  }

  function triggerOutput(transcript: string) {
    const lowerCasedTranscript = transcript.toLowerCase();
    if (lowerCasedTranscript.endsWith('disregard') || lowerCasedTranscript.endsWith('never mind')) {
      return;
    }
    interpretNewSpeech(transcript);
  }

  const value: SpeechDetails = {
    voiceSwitchEnabled,
    setVoiceSwitchEnabled,
  };

  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}
