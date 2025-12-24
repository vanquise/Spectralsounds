// src/components/FloatingControls.jsx

import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Upload, X, ChevronDown, ChevronUp } from 'lucide-react';
import '../visualizercss.css';

const FloatingControls = ({
  isPlaying,
  currentTrack,
  currentTime,
  duration,
  volume,
  playlist,
  currentIndex,
  controlsVisible,
  visualizerMode,
  onToggleControls,
  onTogglePlay,
  onSkipNext,
  onSkipPrevious,
  onVolumeChange,
  onSeek,
  onFileUpload,
  onPlayTrack,
  onRemoveTrack,
  onModeChange,
  fileInputRef,
  formatTime
}) => {
  return (
    <div className={`floating-controls ${!controlsVisible ? 'hidden' : ''}`}>
      <button className="toggle-controls" onClick={onToggleControls}>
        {controlsVisible ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      <div className="controls-content">
        {/* Mode Toggle - UPDATED HERE */}
        <div className="mode-toggle">
          <button
            className={`mode-btn ${visualizerMode === 'canvas' ? 'active' : ''}`}
            onClick={() => onModeChange('canvas')}
            title="Canvas Mode"
          >
            Canvas
          </button>
          <button
            className={`mode-btn ${visualizerMode === 'ball' ? 'active' : ''}`}
            onClick={() => onModeChange('ball')}
            title="Ball Mode"
          >
            Ball
          </button>
          {/* <<< NEW AURORA BUTTON ADDED >>> */}
          <button
            className={`mode-btn ${visualizerMode === 'aurora' ? 'active' : ''}`}
            onClick={() => onModeChange('aurora')}
            title="Aurora Mode"
          >
            Aurora
          </button>
          {/* <<< END NEW AURORA BUTTON >>> */}
        </div>

        {currentTrack && (
          <div className="track-info-minimal">
            <p className="track-name-minimal">{currentTrack.name}</p>
            <div className="time-display">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {currentTrack && (
          <div className="timeline-container">
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={onSeek}
              className="timeline-slider"
            />
          </div>
        )}

        <div className="mini-controls">
          <button
            onClick={onSkipPrevious}
            className="mini-btn"
            title="Previous"
            disabled={playlist.length === 0}
          >
            <SkipBack size={14} />
          </button>

          <button
            onClick={onTogglePlay}
            className="mini-btn primary"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <button
            onClick={onSkipNext}
            className="mini-btn"
            title="Next"
            disabled={playlist.length === 0}
          >
            <SkipForward size={14} />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="mini-btn"
            title="Add"
          >
            <Upload size={14} />
          </button>

          <div className="mini-volume">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={onVolumeChange}
              className="mini-slider"
            />
          </div>
        </div>

        {playlist.length > 0 && (
          <div className="mini-playlist">
            {playlist.map((track, index) => (
              <div
                key={index}
                className={`mini-playlist-item ${index === currentIndex ? 'active' : ''}`}
                onClick={() => onPlayTrack(track, index)}
              >
                <span className="mini-track-name">{track.name}</span>
                <button
                  className="mini-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveTrack(index);
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {playlist.length === 0 && (
          <div className="mini-empty">
            <p onClick={() => fileInputRef.current?.click()}>Add music</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={onFileUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default FloatingControls;
