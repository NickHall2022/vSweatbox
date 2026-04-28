import { useEffect, useRef, useState, type RefObject } from 'react';
import { useAircraft } from '../../hooks/useAircraft';
import { Airplane } from './Airplane';
import { ControllerList } from './ControllerList';
import { FlightPlanEditor } from './FlightPlanEditor';
import Draggable from 'react-draggable';
import { MessageWindow } from './MessageWindow';
import { Taxiways } from '../debug/Taxiways';
import { DataBlock } from './DataBlock';
import { VoiceSwitch } from './VoiceSwitch';

declare global {
  interface Window {
    debugMode?: () => void;
  }
}

export function CabViewWindow() {
  const { aircrafts } = useAircraft();
  const [zoom, setZoom] = useState<number>(1);
  const [rotate, setRotate] = useState<number>(0);
  const [visualizeTaxiways, setVisualizeTaxiways] = useState(false);
  const draggableRef = useRef<HTMLDivElement>(null);
  const handleEditorCallsignChangedRef = useRef<(callsign: string) => void>(undefined);

  useEffect(() => {
    const draggable = draggableRef.current;
    if (!draggable) {
      return;
    }

    const preventLeftClickDrag = (event: MouseEvent) => {
      if (event.buttons === 1) {
        event.stopPropagation();
        event.preventDefault();
      }
    };

    draggable.addEventListener('mousedown', preventLeftClickDrag);
    window.debugMode = () => setVisualizeTaxiways((prev) => !prev);

    return () => {
      draggable.removeEventListener('mousedown', preventLeftClickDrag);
      delete window.debugMode;
    };
  }, []);

  function createAirplanes() {
    return aircrafts.map((aircraft) => {
      return (
        <Airplane
          aircraft={aircraft}
          key={aircraft.callsign}
          selectPlaneRef={handleEditorCallsignChangedRef}
        ></Airplane>
      );
    });
  }

  function createDataBlocks() {
    return aircrafts.map((aircraft) => {
      return <DataBlock aircraft={aircraft} key={aircraft.callsign}></DataBlock>;
    });
  }

  function handleScroll(event: React.WheelEvent) {
    if (event.shiftKey) {
      const newRotate = event.deltaY > 0 ? rotate - 2 : rotate + 2;
      setRotate(newRotate);
    } else {
      let newZoom = event.deltaY > 0 ? zoom - 0.1 : zoom + 0.1;
      if (newZoom < 1) {
        newZoom = 1;
      }
      if (newZoom > 4) {
        newZoom = 4;
      }
      setZoom(newZoom);
    }
  }

  return (
    <div>
      <div style={{ overflow: 'hidden' }}>
        <Draggable
          nodeRef={draggableRef as RefObject<HTMLElement>}
          allowAnyClick={true}
          handle=".handle"
          cancel=".inner"
        >
          <div ref={draggableRef} onWheel={handleScroll} className={'handle'}>
            <div
              id="cabViewContainer"
              className="preventSelect"
              style={{
                transform: `scale(${zoom}) rotate(${rotate}deg)`,
              }}
            >
              <img
                src="PWM.png"
                draggable={false}
                style={{ objectFit: 'cover', width: `100%` }}
              ></img>
              {createAirplanes()}
              {visualizeTaxiways && <Taxiways></Taxiways>}
            </div>
          </div>
        </Draggable>
        {createDataBlocks()}
      </div>
      <FlightPlanEditor
        handleCallsignChangedRef={handleEditorCallsignChangedRef}
      ></FlightPlanEditor>
      <ControllerList></ControllerList>
      <MessageWindow></MessageWindow>
      <VoiceSwitch></VoiceSwitch>
    </div>
  );
}
