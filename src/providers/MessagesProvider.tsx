import { useState, type ReactNode } from 'react';
import type { Message, MessagesDetails, MessageType } from '../types/common';
import { MessagesContext } from '../hooks/useMessages';
import { useImmer } from 'use-immer';
import useSound from 'use-sound';
import { PHONETIC_ATIS } from '../utils/constants/alphabet';
import { useAircraft } from '../hooks/useAircraft';
import { v4 as uuidv4 } from 'uuid';

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [playRadioMessageSound] = useSound('RadioMessage.wav');
  const { aircrafts } = useAircraft();
  const [recieveSwitchEnabled, setRecieveSwitchEnabled] = useState(
    localStorage.getItem('rxSwitch') !== 'false'
  );

  const SpeechSynthesis = window.speechSynthesis;

  const [messages, setMessages] = useImmer<Message[]>([
    {
      content: 'Network simulation activated',
      type: 'system',
      time: Date.now(),
      callsign: '',
      id: uuidv4(),
    },
    {
      content: `Airport: Portland airport ATIS ${PHONETIC_ATIS}, Runway 29 in use. Runway 36 is inactive and your control. You have me on Local, CASCO on above as departure, and Center online above that. Airspace: not applicable. Special activities: none. Enroute weather: VFR, calm winds, no significant trends. Traffic: Nobody is moving on the ground, no clearances have been issued. Your control, HL.`,
      type: 'ATC',
      time: Date.now(),
      callsign: 'PWM_TWR',
      id: uuidv4(),
    },
  ]);

  function sendMessage(
    content: string,
    callsign: string,
    type: MessageType,
    phoneticMessage?: string
  ) {
    function addMessage() {
      if (type === 'system' && messages[messages.length - 1].content === content) {
        return;
      }

      setMessages((draft) => {
        draft.push({
          content,
          callsign,
          type,
          time: Date.now(),
          id: uuidv4(),
        });
        if (draft.length > 60) {
          draft.splice(0, draft.length - 60);
        }
      });
    }

    function sendAircraftMessage() {
      setTimeout(() => {
        addMessage();
        if (!recieveSwitchEnabled) {
          playRadioMessageSound();
        }
      }, 750);

      if (!recieveSwitchEnabled) {
        return;
      }

      if (!phoneticMessage) {
        throw 'undefined phonetic message';
      }

      const aircraft = aircrafts.find((aircraft) => aircraft.callsign === callsign);
      if (!aircraft) {
        return;
      }

      const utterance = new SpeechSynthesisUtterance(phoneticMessage);
      utterance.voice = aircraft.voice;
      utterance.pitch = aircraft.pitch;
      utterance.rate = 1.1;
      utterance.lang = 'en-US';
      SpeechSynthesis.speak(utterance);
    }

    if (type === 'radio') {
      return sendAircraftMessage();
    }

    if (type === 'ATC') {
      addMessage();
      return playRadioMessageSound();
    }

    addMessage();
  }

  const value: MessagesDetails = {
    messages,
    sendMessage,
    recieveSwitchEnabled,
    setRecieveSwitchEnabled,
  };

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}
