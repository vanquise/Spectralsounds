/*
import React from 'react';
import AudioVisualizerCanvas from './AudioVisualizer-Canvas';
import AudioVisualizerBall from './AudioVisualizer-Ball';
import AudioVisualizerAurora from './AudioVisualizer-Aurora';

const AudioVisualizer = ({ analyser, isPlaying, mode = 'canvas' }) => {
  if (mode === 'ball')

  return <AudioVisualizerCanvas analyser={analyser} isPlaying={isPlaying} />;
};

export default AudioVisualizer;
*/

// src/visualizers/AudioVisualizer.jsx (Visualizer Router)


import React from 'react';
import AudioVisualizerCanvas from './AudioVisualizer-Canvas';
import AudioVisualizerBall from './AudioVisualizer-Ball';
import AudioVisualizerAurora from './AudioVisualizer-Aurora';

const AudioVisualizer = ({ analyser, isPlaying, mode }) => {
  // Logic: If mode is 'ball' OR if no mode is provided yet, load Ball.
  // This prevents the system from defaulting to Aurora if the state is empty.

  if (mode === 'ball' || !mode) {
    return <AudioVisualizerBall analyser={analyser} isPlaying={isPlaying} />;
  }

  switch (mode) {
    case 'aurora':
      return <AudioVisualizerAurora analyser={analyser} isPlaying={isPlaying} />;
    case 'canvas':
      return <AudioVisualizerCanvas analyser={analyser} isPlaying={isPlaying} />;
    default:
      // Ultimate fallback is the Ball
      return <AudioVisualizerBall analyser={analyser} isPlaying={isPlaying} />;
  }
};

export default AudioVisualizer;
