

/*
// Original version - exact copy before website conversion
// This is the standalone visualizer without Hero page, Footer, or transitions

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Upload, X, ChevronDown, ChevronUp } from 'lucide-react';
import AudioVisualizer from './visualizers/AudioVisualizer';
import FloatingControls from './components/FloatingControls';
import './visualizercss.css';

const SimpleApp = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [visualizerMode, setVisualizerMode] = useState('canvas'); // 'canvas' or 'ball'

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        setDuration(audioRef.current.duration || 0);
      }
    };
    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, []);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;
      analyserRef.current.smoothingTimeConstant = 0.7;
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));

    if (audioFiles.length === 0) return;

    const newTracks = audioFiles.map(file => ({
      name: file.name.replace(/\.[^/.]+$/, ''),
      url: URL.createObjectURL(file),
      file: file
    }));

    setPlaylist(prev => {
      const updated = [...prev, ...newTracks];

      // If no current track, set the first new track (but don't auto-play)
      if (prev.length === 0 && newTracks.length > 0) {
        const firstIndex = 0;
        const firstTrack = newTracks[0];
        setCurrentTrack(firstTrack);
        setCurrentIndex(firstIndex);
      }

      return updated;
    });

    // Reset file input
    if (e.target) {
      e.target.value = '';
    }
  };

  const playTrack = async (track, index) => {
    initAudio();

    // Resume AudioContext if suspended (required for browser autoplay policies)
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch (err) {
        console.error('Failed to resume AudioContext:', err);
      }
    }

    // Clean up previous audio if exists
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      }
    }

    // Create new audio element
    audioRef.current = new Audio(track.url);
    audioRef.current.volume = volume;

    // Set up audio context connection
    try {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }

      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    } catch (err) {
      console.error('Failed to connect audio source:', err);
      // Try to reinitialize if connection failed
      initAudio();
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }

    // Set up event handlers
    audioRef.current.onended = () => {
      skipToNext();
    };

    audioRef.current.onloadedmetadata = () => {
      setDuration(audioRef.current.duration);
    };

    audioRef.current.onerror = (err) => {
      console.error('Audio playback error:', err);
      setIsPlaying(false);
    };

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      setCurrentTrack(track);
      setCurrentIndex(index);
    } catch (err) {
      console.error('Playback failed:', err);
      setIsPlaying(false);
      // If autoplay is blocked, user needs to click play button
      if (err.name === 'NotAllowedError' || err.name === 'NotSupportedError') {
        console.log('Autoplay blocked. User interaction required.');
      }
    }
  };

  const togglePlay = async () => {
    if (!currentTrack && playlist.length > 0) {
      playTrack(playlist[0], 0);
      return;
    }

    if (!currentTrack) {
      fileInputRef.current?.click();
      return;
    }

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      // Resume AudioContext if suspended
      if (audioContextRef.current?.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
        } catch (err) {
          console.error('Failed to resume AudioContext:', err);
        }
      }

      try {
        await audioRef.current?.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Playback failed:', err);
        setIsPlaying(false);
      }
    }
  };

  const skipToNext = () => {
    if (playlist.length === 0) return;

    const nextIndex = (currentIndex + 1) % playlist.length;

    if (currentIndex === playlist.length - 1) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setCurrentIndex(0);
      setCurrentTrack(playlist[0]);
      return;
    }

    playTrack(playlist[nextIndex], nextIndex);
  };

  const skipToPrevious = () => {
    if (playlist.length === 0) return;

    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    playTrack(playlist[prevIndex], prevIndex);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current && !isNaN(audioRef.current.duration)) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const removeTrack = (index) => {
    const newPlaylist = playlist.filter((_, i) => i !== index);
    setPlaylist(newPlaylist);

    if (index === currentIndex) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setCurrentTrack(null);
    } else if (index < currentIndex) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="app-container">
      <AudioVisualizer
        analyser={analyserRef.current}
        isPlaying={isPlaying}
        mode={visualizerMode}
      />
      <FloatingControls
        isPlaying={isPlaying}
        currentTrack={currentTrack}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        playlist={playlist}
        currentIndex={currentIndex}
        controlsVisible={controlsVisible}
        visualizerMode={visualizerMode}
        onToggleControls={() => setControlsVisible(!controlsVisible)}
        onTogglePlay={togglePlay}
        onSkipNext={skipToNext}
        onSkipPrevious={skipToPrevious}
        onVolumeChange={handleVolumeChange}
        onSeek={handleSeek}
        onFileUpload={handleFileUpload}
        onPlayTrack={playTrack}
        onRemoveTrack={removeTrack}
        onModeChange={setVisualizerMode}
        fileInputRef={fileInputRef}
        formatTime={formatTime}
      />
    </div>
  );
};

export default SimpleApp;
*/



// src/SimpleApp.jsx
// Simple standalone version (no Hero page, direct to visualizer)
/*
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Upload, X, ChevronDown, ChevronUp } from 'lucide-react';
import AudioVisualizer from './visualizers/AudioVisualizer';
import './visualizercss.css';

const SimpleApp = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [visualizerMode, setVisualizerMode] = useState('ball'); // 'ball' or 'canvas'

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        setDuration(audioRef.current.duration || 0);
      }
    };
    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, []);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;
      analyserRef.current.smoothingTimeConstant = 0.7;
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));

    if (audioFiles.length === 0) return;

    const newTracks = audioFiles.map(file => ({
      name: file.name.replace(/\.[^/.]+$/, ''),
      url: URL.createObjectURL(file),
      file: file
    }));

    setPlaylist(prev => {
      const updated = [...prev, ...newTracks];

      if (prev.length === 0 && newTracks.length > 0) {
        const firstIndex = 0;
        const firstTrack = newTracks[0];
        setCurrentTrack(firstTrack);
        setCurrentIndex(firstIndex);
      }

      return updated;
    });

    if (e.target) {
      e.target.value = '';
    }
  };

  const playTrack = async (track, index) => {
    initAudio();

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch (err) {
        console.error('Failed to resume AudioContext:', err);
      }
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {}
      }
    }

    audioRef.current = new Audio(track.url);
    audioRef.current.volume = volume;

    try {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }

      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    } catch (err) {
      console.error('Failed to connect audio source:', err);
      initAudio();
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }

    audioRef.current.onended = () => {
      skipToNext();
    };

    audioRef.current.onloadedmetadata = () => {
      setDuration(audioRef.current.duration);
    };

    audioRef.current.onerror = (err) => {
      console.error('Audio playback error:', err);
      setIsPlaying(false);
    };

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      setCurrentTrack(track);
      setCurrentIndex(index);
    } catch (err) {
      console.error('Playback failed:', err);
      setIsPlaying(false);
      if (err.name === 'NotAllowedError' || err.name === 'NotSupportedError') {
        console.log('Autoplay blocked. User interaction required.');
      }
    }
  };

  const togglePlay = async () => {
    if (!currentTrack && playlist.length > 0) {
      playTrack(playlist[0], 0);
      return;
    }

    if (!currentTrack) {
      fileInputRef.current?.click();
      return;
    }

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (audioContextRef.current?.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
        } catch (err) {
          console.error('Failed to resume AudioContext:', err);
        }
      }

      try {
        await audioRef.current?.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Playback failed:', err);
        setIsPlaying(false);
      }
    }
  };

  const skipToNext = () => {
    if (playlist.length === 0) return;

    const nextIndex = (currentIndex + 1) % playlist.length;

    if (currentIndex === playlist.length - 1) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setCurrentIndex(0);
      setCurrentTrack(playlist[0]);
      return;
    }

    playTrack(playlist[nextIndex], nextIndex);
  };

  const skipToPrevious = () => {
    if (playlist.length === 0) return;

    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    playTrack(playlist[prevIndex], prevIndex);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current && !isNaN(audioRef.current.duration)) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const removeTrack = (index) => {
    const newPlaylist = playlist.filter((_, i) => i !== index);
    setPlaylist(newPlaylist);

    if (index === currentIndex) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setCurrentTrack(null);
    } else if (index < currentIndex) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="app-container">
      <AudioVisualizer
        analyser={analyserRef.current}
        isPlaying={isPlaying}
        mode={visualizerMode}
      />

      <div className={`floating-controls ${!controlsVisible ? 'hidden' : ''}`}>
        <button
          className="toggle-controls"
          onClick={() => setControlsVisible(!controlsVisible)}
        >
          {controlsVisible ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>

        <div className="controls-content">

          <div className="mode-toggle">
            <button
              className={`mode-btn ${visualizerMode === 'ball' ? 'active' : ''}`}
              onClick={() => setVisualizerMode('ball')}
              title="Ball Mode"
            >
              Ball
            </button>
            <button
              className={`mode-btn ${visualizerMode === 'canvas' ? 'active' : ''}`}
              onClick={() => setVisualizerMode('canvas')}
              title="Canvas Mode"
            >
              Canvas
            </button>
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
                onChange={handleSeek}
                className="timeline-slider"
              />
            </div>
          )}

          <div className="mini-controls">
            <button
              onClick={skipToPrevious}
              className="mini-btn"
              title="Previous"
              disabled={playlist.length === 0}
            >
              <SkipBack size={14} />
            </button>

            <button
              onClick={togglePlay}
              className="mini-btn primary"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>

            <button
              onClick={skipToNext}
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
                onChange={handleVolumeChange}
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
                  onClick={() => playTrack(track, index)}
                >
                  <span className="mini-track-name">{track.name}</span>
                  <button
                    className="mini-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTrack(index);
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
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>


      {!isPlaying && (
        <div className="integration-banner">
          <p>Spotify, Soundcloud + Apple Music integration coming soon</p>
        </div>
      )}
    </div>
  );
};

export default SimpleApp;
*/









/*
// src/SimpleApp.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Upload, X, ChevronDown, ChevronUp } from 'lucide-react';
import Hero from './components/Hero';
import AudioVisualizer from './visualizers/AudioVisualizer';
import './visualizercss.css';

const SimpleApp = () => {
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [visualizerMode, setVisualizerMode] = useState('ball');

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        setDuration(audioRef.current.duration || 0);
      }
    };
    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, []);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;
      analyserRef.current.smoothingTimeConstant = 0.7;
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));
    if (audioFiles.length === 0) return;

    const newTracks = audioFiles.map(file => ({
      name: file.name.replace(/\.[^/.]+$/, ''),
      url: URL.createObjectURL(file),
      file
    }));

    setPlaylist(prev => {
      const updated = [...prev, ...newTracks];
      if (prev.length === 0 && newTracks.length > 0) {
        // autoplay first
        setTimeout(() => playTrack(newTracks[0], 0), 120);
      }
      return updated;
    });

    if (e.target) e.target.value = '';
  };

  const playTrack = async (track, index) => {
    initAudio();
    if (audioContextRef.current?.state === 'suspended') {
      try { await audioContextRef.current.resume(); } catch (e) {}
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      try { sourceRef.current?.disconnect(); } catch (e) {}
    }

    const audio = new Audio(track.url);
    audio.volume = volume;
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    try {
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch (e) {}
      }
      sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    } catch (err) {
      console.error('Audio source connect error:', err);
    }

    audio.onended = () => skipToNext();
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.onerror = (err) => { console.error('Audio error:', err); setIsPlaying(false); };

    try {
      await audio.play();
      setIsPlaying(true);
      setCurrentTrack(track);
      setCurrentIndex(index);
      console.log('Audio playing:', track.name);
    } catch (err) {
      console.error('Play failed:', err);
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    if (!currentTrack && playlist.length > 0) { playTrack(playlist[0], 0); return; }
    if (!currentTrack) { fileInputRef.current?.click(); return; }

    if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false); }
    else {
      if (audioContextRef.current?.state === 'suspended') {
        try { await audioContextRef.current.resume(); } catch (e) {}
      }
      try { await audioRef.current?.play(); setIsPlaying(true); } catch (err) { console.error(err); setIsPlaying(false); }
    }
  };

  const skipToNext = () => {
    if (playlist.length === 0) return;
    const nextIndex = (currentIndex + 1) % playlist.length;
    playTrack(playlist[nextIndex], nextIndex);
  };

  const skipToPrevious = () => {
    if (playlist.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    playTrack(playlist[prevIndex], prevIndex);
  };

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const handleSeek = (e) => {
    const t = parseFloat(e.target.value);
    if (audioRef.current && !isNaN(audioRef.current.duration)) {
      audioRef.current.currentTime = t;
      setCurrentTime(t);
    }
  };

  const formatTime = (s) => {
    if (isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const removeTrack = (index) => {
    const newList = playlist.filter((_, i) => i !== index);
    setPlaylist(newList);
    if (index === currentIndex) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setCurrentTrack(null);
    } else if (index < currentIndex) setCurrentIndex(currentIndex - 1);
  };

  // show hero first
  if (!showVisualizer) {
    return <Hero onLaunch={() => { setIsTransitioning(true); setTimeout(()=>{ setShowVisualizer(true); setIsTransitioning(false); }, 1000); }} />;
  }

  return (
    <div className="app-container">
      <AudioVisualizer analyser={analyserRef.current} isPlaying={isPlaying} mode={visualizerMode} />
      <div className={`floating-controls ${!controlsVisible ? 'hidden' : ''}`}>
        <button className="toggle-controls" onClick={() => setControlsVisible(!controlsVisible)}>
          {controlsVisible ? <ChevronDown size={16}/> : <ChevronUp size={16}/>}
        </button>
        <div className="controls-content">
          <div className="mode-toggle">
            <button className={`mode-btn ${visualizerMode==='ball' ? 'active' : ''}`} onClick={()=>setVisualizerMode('ball')}>Ball</button>
            <button className={`mode-btn ${visualizerMode==='canvas' ? 'active' : ''}`} onClick={()=>setVisualizerMode('canvas')}>Canvas</button>
          </div>

          {currentTrack && (
            <div className="track-info-minimal">
              <p className="track-name-minimal">{currentTrack.name}</p>
              <div className="time-display"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
            </div>
          )}

          {currentTrack && (
            <div className="timeline-container">
              <input type="range" min="0" max={duration||0} step="0.1" value={currentTime} onChange={handleSeek} className="timeline-slider" />
            </div>
          )}

          <div className="mini-controls">
            <button onClick={skipToPrevious} className="mini-btn" title="Previous" disabled={playlist.length===0}><SkipBack size={14}/></button>
            <button onClick={togglePlay} className="mini-btn primary" title={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause size={16}/> : <Play size={16}/>}</button>
            <button onClick={skipToNext} className="mini-btn" title="Next" disabled={playlist.length===0}><SkipForward size={14}/></button>
            <button onClick={() => fileInputRef.current?.click()} className="mini-btn" title="Add"><Upload size={14}/></button>
            <div className="mini-volume">
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} className="mini-slider" />
            </div>
          </div>

          {playlist.length > 0 ? (
            <div className="mini-playlist">
              {playlist.map((track, idx) => (
                <div key={idx} className={`mini-playlist-item ${idx===currentIndex ? 'active' : ''}`} onClick={() => playTrack(track, idx)}>
                  <span className="mini-track-name">{track.name}</span>
                  <button className="mini-remove" onClick={(e)=>{e.stopPropagation(); removeTrack(idx);}}><X size={12}/></button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mini-empty"><p onClick={() => fileInputRef.current?.click()}>Add music</p></div>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="audio/*" multiple onChange={handleFileUpload} style={{display:'none'}} />
      </div>

      {!isPlaying && (
        <div className="integration-banner">
          <p>Spotify, Soundcloud + Apple Music integration coming soon</p>
        </div>
      )}
    </div>
  );
};

export default SimpleApp;
*/
