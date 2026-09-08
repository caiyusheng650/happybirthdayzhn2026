import React from 'react';
import './App.css';
import { GameProvider, useGame } from './game/state/GameContext';
import { CrayonFilters } from './game/fx/CrayonFilter';
import { StartScreen } from './components/StartScreen';
import { LevelSelect } from './components/LevelSelect';
import { JumpScene } from './game/scenes/JumpScene';
import { BeamScene } from './game/scenes/BeamScene';
import { MemoryScene } from './game/scenes/MemoryScene';
import { RhythmScene } from './game/scenes/RhythmScene';
import { AimScene } from './game/scenes/AimScene';
import { FinaleScene } from './game/scenes/FinaleScene';

function Router() {
  const { state } = useGame();

  let screen: React.ReactNode;
  switch (state.stage) {
    case 'level-select':
      screen = <LevelSelect />;
      break;
    case 'playing': {
      switch (state.currentLevel) {
        case 'jump': screen = <JumpScene />; break;
        case 'beam': screen = <BeamScene />; break;
        case 'memory': screen = <MemoryScene />; break;
        case 'rhythm': screen = <RhythmScene />; break;
        case 'aim': screen = <AimScene />; break;
        default: screen = <LevelSelect />;
      }
      break;
    }
    case 'finale':
      screen = <FinaleScene />;
      break;
    default:
      screen = <StartScreen />;
  }

  return (
    <>
      <CrayonFilters />
      {/* playNonce 作为 key，保证重试时重新挂载、重置关卡内部状态 */}
      <div key={state.stage + '-' + state.playNonce} style={{ position: 'fixed', inset: 0 }}>
        {screen}
      </div>
    </>
  );
}

function App() {
  return (
    <GameProvider>
      <Router />
    </GameProvider>
  );
}

export default App;