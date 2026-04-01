// src/App.jsx



/*
import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, SkipForward, SkipBack, Upload, X, ChevronDown, ChevronUp
} from 'lucide-react';
import Hero from './components/Hero';
import AudioVisualizer from './visualizers/AudioVisualizer';
import './visualizercss.css';

const App = () => {
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

  const handleLaunch = () => {
    setIsTransitioning(true);

    // Transition to visualizer after animation
    setTimeout(() => {
      setShowVisualizer(true);
      setIsTransitioning(false);
    }, 800);
  };

  const initAudio = async () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;
      analyserRef.current.smoothingTimeConstant = 0.85;
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
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
        setTimeout(() => {
          playTrack(newTracks[0], 0);
        }, 120);
      }

      return updated;
    });

    if (e.target) e.target.value = '';
  };

  const playTrack = async (track, index) => {
    try {
      await initAudio();

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch (e) {}
      }

      const audio = new Audio(track.url);
      audio.volume = volume;
      audio.crossOrigin = "anonymous";
      audioRef.current = audio;

      sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      audio.onended = () => skipToNext();
      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.onerror = (err) => { console.error('Audio playback error:', err); setIsPlaying(false); };

      await audio.play();
      setIsPlaying(true);
      setCurrentTrack(track);
      setCurrentIndex(index);
    } catch (err) {
      console.error('Playback failed:', err);
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    if (!currentTrack && playlist.length > 0) { playTrack(playlist[0], 0); return; }
    if (!currentTrack) { fileInputRef.current?.click(); return; }

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      try {
        if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();
        await audioRef.current?.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Play error:', err);
        setIsPlaying(false);
      }
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
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) audioRef.current.volume = newVolume;
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
      audioRef.current?.pause();
      setIsPlaying(false);
      setCurrentTrack(null);
    } else if (index < currentIndex) setCurrentIndex(currentIndex - 1);
  };

  if (!showVisualizer) {
    return <Hero onLaunch={handleLaunch} isTransitioning={isTransitioning} />;
  }

  return (
    <div className="app-container">
      <AudioVisualizer
        analyser={analyserRef.current}
        isPlaying={isPlaying}
        mode={visualizerMode}
      />

      <div className={`floating-controls ${!controlsVisible ? 'hidden' : ''}`}>
        <button className="toggle-controls" onClick={() => setControlsVisible(!controlsVisible)}>
          {controlsVisible ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>

        <div className="controls-content">
          <div className="mode-toggle">
            <button className={`mode-btn ${visualizerMode === 'ball' ? 'active' : ''}`} onClick={() => setVisualizerMode('ball')}>Ball</button>
            <button className={`mode-btn ${visualizerMode === 'canvas' ? 'active' : ''}`} onClick={() => setVisualizerMode('canvas')}>Canvas</button>
            <button className={`mode-btn ${visualizerMode === 'aurora' ? 'active' : ''}`} onClick={() => setVisualizerMode('aurora')}>Aurora</button>
          </div>

          {currentTrack && (
            <div className="track-info-minimal">
              <p className="track-name-minimal">{currentTrack.name}</p>
              <div className="time-display"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
            </div>
          )}

          {currentTrack && (
            <div className="timeline-container">
              <input type="range" min="0" max={duration || 0} step="0.1" value={currentTime} onChange={handleSeek} className="timeline-slider" />
            </div>
          )}

          <div className="mini-controls">
            <button onClick={skipToPrevious} className="mini-btn" title="Previous" disabled={playlist.length === 0}><SkipBack size={14} /></button>
            <button onClick={togglePlay} className="mini-btn primary" title={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause size={16} /> : <Play size={16} />}</button>
            <button onClick={skipToNext} className="mini-btn" title="Next" disabled={playlist.length === 0}><SkipForward size={14} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="mini-btn" title="Add"><Upload size={14} /></button>
            <div className="mini-volume">
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} className="mini-slider" />
            </div>
          </div>

          {playlist.length > 0 ? (
            <div className="mini-playlist">
              {playlist.map((track, idx) => (
                <div key={idx} className={`mini-playlist-item ${idx === currentIndex ? 'active' : ''}`} onClick={() => playTrack(track, idx)}>
                  <span className="mini-track-name">{track.name}</span>
                  <button className="mini-remove" onClick={(e) => { e.stopPropagation(); removeTrack(idx); }}><X size={12} /></button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mini-empty"><p onClick={() => fileInputRef.current?.click()}>Add music to start</p></div>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="audio/*" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
      </div>

      {!isPlaying && (
        <div className="integration-banner">
          <p>Spotify, Soundcloud + Apple Music integration coming soon</p>
        </div>
      )}
    </div>
  );
};

export default App;
*/







/*
// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, SkipForward, SkipBack, Upload, X, ChevronDown, ChevronUp
} from 'lucide-react';
import Hero from './components/Hero';
import AudioVisualizer from './visualizers/AudioVisualizer';
import './visualizercss.css';

const App = () => {
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

  const handleLaunch = () => {
    setIsTransitioning(true);

    // Transition to visualizer after animation
    setTimeout(() => {
      setShowVisualizer(true);
      setIsTransitioning(false);
    }, 800);
  };

  const initAudio = async () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;
      analyserRef.current.smoothingTimeConstant = 0.85;
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
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
        setTimeout(() => {
          playTrack(newTracks[0], 0);
        }, 120);
      }

      return updated;
    });

    if (e.target) e.target.value = '';
  };

  const playTrack = async (track, index) => {
    try {
      await initAudio();

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch (e) {}
      }

      const audio = new Audio(track.url);
      audio.volume = volume;
      audio.crossOrigin = "anonymous";
      audioRef.current = audio;

      sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      audio.onended = () => skipToNext();
      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.onerror = (err) => { console.error('Audio playback error:', err); setIsPlaying(false); };

      await audio.play();
      setIsPlaying(true);
      setCurrentTrack(track);
      setCurrentIndex(index);
    } catch (err) {
      console.error('Playback failed:', err);
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    if (!currentTrack && playlist.length > 0) { playTrack(playlist[0], 0); return; }
    if (!currentTrack) { fileInputRef.current?.click(); return; }

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      try {
        if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();
        await audioRef.current?.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Play error:', err);
        setIsPlaying(false);
      }
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
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) audioRef.current.volume = newVolume;
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
      audioRef.current?.pause();
      setIsPlaying(false);
      setCurrentTrack(null);
    } else if (index < currentIndex) setCurrentIndex(currentIndex - 1);
  };

  if (!showVisualizer) {
    return <Hero onLaunch={handleLaunch} isTransitioning={isTransitioning} />;
  }

  return (
    <div className="app-container">
      <AudioVisualizer
        analyser={analyserRef.current}
        isPlaying={isPlaying}
        mode={visualizerMode}
      />

      <div className={`floating-controls ${!controlsVisible ? 'hidden' : ''}`}>
        <button className="toggle-controls" onClick={() => setControlsVisible(!controlsVisible)}>
          {controlsVisible ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>

        <div className="controls-content">
          <div className="mode-toggle">
            <button className={`mode-btn ${visualizerMode === 'ball' ? 'active' : ''}`} onClick={() => setVisualizerMode('ball')}>Ball</button>
            <button className={`mode-btn ${visualizerMode === 'canvas' ? 'active' : ''}`} onClick={() => setVisualizerMode('canvas')}>Canvas</button>
            <button className={`mode-btn ${visualizerMode === 'aurora' ? 'active' : ''}`} onClick={() => setVisualizerMode('aurora')}>Aurora</button>
          </div>

          {currentTrack && (
            <div className="track-info-minimal">
              <p className="track-name-minimal">{currentTrack.name}</p>
              <div className="time-display"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
            </div>
          )}

          {currentTrack && (
            <div className="timeline-container">
              <input type="range" min="0" max={duration || 0} step="0.1" value={currentTime} onChange={handleSeek} className="timeline-slider" />
            </div>
          )}

          <div className="mini-controls">
            <button onClick={skipToPrevious} className="mini-btn" title="Previous" disabled={playlist.length === 0}><SkipBack size={14} /></button>
            <button onClick={togglePlay} className="mini-btn primary" title={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause size={16} /> : <Play size={16} />}</button>
            <button onClick={skipToNext} className="mini-btn" title="Next" disabled={playlist.length === 0}><SkipForward size={14} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="mini-btn" title="Add"><Upload size={14} /></button>
            <div className="mini-volume">
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} className="mini-slider" />
            </div>
          </div>

          {playlist.length > 0 ? (
            <div className="mini-playlist">
              {playlist.map((track, idx) => (
                <div key={idx} className={`mini-playlist-item ${idx === currentIndex ? 'active' : ''}`} onClick={() => playTrack(track, idx)}>
                  <span className="mini-track-name">{track.name}</span>
                  <button className="mini-remove" onClick={(e) => { e.stopPropagation(); removeTrack(idx); }}><X size={12} /></button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mini-empty"><p onClick={() => fileInputRef.current?.click()}>Add music to start</p></div>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="audio/*" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
      </div>

      {!isPlaying && (
        <div className="integration-banner">
          <p>Spotify, Soundcloud + Apple Music integration coming soon</p>
        </div>
      )}
    </div>
  );
};

export default App;
*/







// src/App.jsx
/*
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hero from './components/Hero';
// NOTE: Make sure the visualizer file is named 'AudioVisualizer.jsx' (no 'e')
import AudioVisualizer from "./visualizers/AudioVisualizer";
import FloatingControls from './components/FloatingControls';
import Footer from './components/Footer';
import './visualizercss.css';

const App = () => {
  const [showVisualizer, setShowVisualizer] = useState(false);
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
  const audioRef = useRef(new Audio());
  const fileInputRef = useRef(null);

  // --- AUDIO INITIALIZATION ---
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;

      const audioSource = audioContextRef.current.createMediaElementSource(audioRef.current);
      audioSource.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      sourceRef.current = audioSource;

      // Start the context if it's suspended (e.g., due to browser policy)
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    const handleEnded = () => skipToNext();
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [volume]);

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

  // --- PLAYER CONTROLS ---

  const playTrack = (track, index) => {
    initAudioContext();
    const audio = audioRef.current;

    // Check if the source needs to be changed
    if (track.url !== audio.src) {
        audio.src = track.url;
    }

    audio.play()
      .then(() => {
        setIsPlaying(true);
        setCurrentTrack(track);
        setCurrentIndex(index);
      })
      .catch(error => {
        console.error("Error playing audio:", error);
      });
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!currentTrack && playlist.length > 0) {
      // If no track is loaded, start with the first one
      playTrack(playlist[0], 0);
      return;
    }

    if (isPlaying) {
      audio.pause();
    } else {
      initAudioContext();
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const skipToNext = () => {
    if (playlist.length === 0) return;
    const nextIndex = (currentIndex + 1) % playlist.length;
    playTrack(playlist[nextIndex], nextIndex);
  };

  const skipToPrevious = () => {
    if (playlist.length === 0) return;
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    playTrack(playlist[prevIndex], prevIndex);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    audio.currentTime = e.target.value;
    setCurrentTime(audio.currentTime);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audioRef.current.volume = newVolume;
  };

  const formatTime = (time) => {
    if (isNaN(time) || time === 0) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const removeTrack = (index) => {
    const newPlaylist = playlist.filter((_, i) => i !== index);
    setPlaylist(newPlaylist);

    if (index === currentIndex) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentTrack(null);
      // Try to load the next track if available
      if (newPlaylist.length > 0) {
          playTrack(newPlaylist[0], 0);
      }
    } else if (index < currentIndex) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // --- FILE HANDLING ---

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newTracks = files.map(file => ({
      name: file.name,
      url: URL.createObjectURL(file)
    }));

    const startingNew = playlist.length === 0;
    setPlaylist(prev => [...prev, ...newTracks]);

    if (startingNew && newTracks.length > 0) {
        // Automatically start playing the first new track
        setTimeout(() => playTrack(newTracks[0], 0), 100);
    }
  };

  // --- RENDER ---

  const handleLaunch = () => {
    initAudioContext();
    setShowVisualizer(true);
  };

  if (!showVisualizer) {
    return (
      <div className="app">
        <Hero onLaunch={handleLaunch} />
        <Footer />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="visualizer-wrapper fade-in">

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
          onToggleControls={() => setControlsVisible(prev => !prev)}
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

        <Footer />
      </div>

      {!isPlaying && (
        <div className="integration-banner">
          <p>Spotify, Soundcloud + Apple Music integration coming soon</p>
        </div>
      )}
    </div>
  );
};

export default App;
*/






/*
// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, SkipForward, SkipBack, Upload, X, ChevronDown, ChevronUp
} from 'lucide-react';
import Hero from './components/Hero';
import AudioVisualizer from './visualizers/Audiovizballcanvasref';
import './visualizercss.css';





const App = () => {
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

  const handleLaunch = () => {
    setIsTransitioning(true);

    // Transition to visualizer after animation
    setTimeout(() => {
      setShowVisualizer(true);
      setIsTransitioning(false);
    }, 800);
  };

  const initAudio = async () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;
      analyserRef.current.smoothingTimeConstant = 0.85;
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
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
        setTimeout(() => {
          playTrack(newTracks[0], 0);
        }, 120);
      }

      return updated;
    });

    if (e.target) e.target.value = '';
  };

  const playTrack = async (track, index) => {
    try {
      await initAudio();

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch (e) {}
      }

      const audio = new Audio(track.url);
      audio.volume = volume;
      audio.crossOrigin = "anonymous";
      audioRef.current = audio;

      sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      audio.onended = () => skipToNext();
      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.onerror = (err) => { console.error('Audio playback error:', err); setIsPlaying(false); };

      await audio.play();
      setIsPlaying(true);
      setCurrentTrack(track);
      setCurrentIndex(index);
    } catch (err) {
      console.error('Playback failed:', err);
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    if (!currentTrack && playlist.length > 0) { playTrack(playlist[0], 0); return; }
    if (!currentTrack) { fileInputRef.current?.click(); return; }

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      try {
        if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();
        await audioRef.current?.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Play error:', err);
        setIsPlaying(false);
      }
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
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) audioRef.current.volume = newVolume;
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
      audioRef.current?.pause();
      setIsPlaying(false);
      setCurrentTrack(null);
    } else if (index < currentIndex) setCurrentIndex(currentIndex - 1);
  };





  if (!showVisualizer) {
    return <Hero onLaunch={handleLaunch} isTransitioning={isTransitioning} />;
  }

  return (
    <div className="app-container">
      <AudioVisualizer
        analyser={analyserRef.current}
        isPlaying={isPlaying}
        mode={visualizerMode}
      />

      <div className={`floating-controls ${!controlsVisible ? 'hidden' : ''}`}>
        <button className="toggle-controls" onClick={() => setControlsVisible(!controlsVisible)}>
          {controlsVisible ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>

        <div className="controls-content">
          <div className="mode-toggle">
            <button className={`mode-btn ${visualizerMode === 'ball' ? 'active' : ''}`} onClick={() => setVisualizerMode('ball')}>Ball</button>
            <button className={`mode-btn ${visualizerMode === 'canvas' ? 'active' : ''}`} onClick={() => setVisualizerMode('canvas')}>Canvas</button>
            <button className={`mode-btn ${visualizerMode === 'aurora' ? 'active' : ''}`} onClick={() => setVisualizerMode('aurora')}>Aurora</button>
          </div>

          {currentTrack && (
            <div className="track-info-minimal">
              <p className="track-name-minimal">{currentTrack.name}</p>
              <div className="time-display"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
            </div>
          )}

          {currentTrack && (
            <div className="timeline-container">
              <input type="range" min="0" max={duration || 0} step="0.1" value={currentTime} onChange={handleSeek} className="timeline-slider" />
            </div>
          )}

          <div className="mini-controls">
            <button onClick={skipToPrevious} className="mini-btn" title="Previous" disabled={playlist.length === 0}><SkipBack size={14} /></button>
            <button onClick={togglePlay} className="mini-btn primary" title={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause size={16} /> : <Play size={16} />}</button>
            <button onClick={skipToNext} className="mini-btn" title="Next" disabled={playlist.length === 0}><SkipForward size={14} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="mini-btn" title="Add"><Upload size={14} /></button>
            <div className="mini-volume">
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} className="mini-slider" />
            </div>
          </div>

          {playlist.length > 0 ? (
            <div className="mini-playlist">
              {playlist.map((track, idx) => (
                <div key={idx} className={`mini-playlist-item ${idx === currentIndex ? 'active' : ''}`} onClick={() => playTrack(track, idx)}>
                  <span className="mini-track-name">{track.name}</span>
                  <button className="mini-remove" onClick={(e) => { e.stopPropagation(); removeTrack(idx); }}><X size={12} /></button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mini-empty"><p onClick={() => fileInputRef.current?.click()}>Add music to start</p></div>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="audio/*" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
      </div>

      {!isPlaying && (
        <div className="integration-banner">
          <p>Spotify, Soundcloud + Apple Music integration coming soon</p>
        </div>
      )}
    </div>


  );
};

export default App;
*/




/*
import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import VisualizerWrapper from './components/VisualizerWrapper';
import Audiovizballcanvasref from './visualizers/Audiovizballcanvasref';
import './visualizercss.css';

const App = () => {
  const [hasEntered, setHasEntered] = useState(false);
  const [scrollMode, setScrollMode] = useState('ball');

  // Logic to switch background modes based on landing page scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (hasEntered) return;
      const position = window.scrollY;
      const threshold = window.innerHeight;

      if (position < threshold * 0.8) {
        setScrollMode('ball');
      } else if (position < threshold * 1.8) {
        setScrollMode('canvas');
      } else {
        setScrollMode('aurora');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasEntered]);

  return (
    <div className="app-main-container">

      <div className={`global-bg-engine ${hasEntered ? 'active' : 'idle'}`}>
        <Audiovizballcanvasref
          mode={scrollMode}
          isPlaying={hasEntered}
          analyser={null} // Passing null keeps visualizers in "Idle" movement
        />
        <div className="grain-overlay"></div>
      </div>


      {!hasEntered ? (
        <LandingPage onEnter={() => setHasEntered(true)} />
      ) : (

        <VisualizerWrapper initialMode={scrollMode} />
      )}
    </div>
  );
};

export default App;
*/





/*
import { useState } from "react";
import LandingPage from "./components/LandingPage";
import VisualizerWrapper from "./components/VisualizerWrapper";


export default function App() {
  const [mode, setMode] = useState("landing");
  // 'landing' | 'enter' | 'visualizer'

  return (
    <>
      {mode !== "visualizer" && (
        <LandingPage onEnter={() => setMode("enter")} />
      )}

      {mode !== "landing" && (
        <VisualizerWrapper
          active={mode === "visualizer"}
          onReady={() => setMode("visualizer")}
        />
      )}
    </>
  );
}
*/






























/*
import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, SkipForward, SkipBack, Upload, X,
  ChevronDown, ChevronUp
} from 'lucide-react';

// --- Components ---
// Ensure these paths match your folder structure
import AudioVisualizer from './visualizers/Audiovizballcanvasref';
import LandingPage from './components/LandingPage';

// --- Styles ---
import './visualizercss.css';

const App = () => {
  // 1. MISSING STATE VARIABLES (Filling the gaps)
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [volume, setVolume] = useState(0.5);

  // 2. YOUR ORIGINAL STATE BLOCK
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [visualizerMode, setVisualizerMode] = useState('aurora'); // Defaulted to aurora

  // --- Refs ---
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- Effects ---
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

  // --- Handlers ---
  const handleLaunch = () => {
    setIsTransitioning(true);
    // Transition to visualizer after animation
    setTimeout(() => {
      setShowVisualizer(true);
      setIsTransitioning(false);
    }, 800);
  };

  const initAudio = async () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048; // Optimized for performance
      analyserRef.current.smoothingTimeConstant = 0.85;
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
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
        setTimeout(() => {
          playTrack(newTracks[0], 0);
        }, 120);
      }
      return updated;
    });

    if (e.target) e.target.value = '';
  };

  const playTrack = async (track, index) => {
    try {
      await initAudio();

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch (e) {}
      }

      const audio = new Audio(track.url);
      audio.volume = volume;
      audio.crossOrigin = "anonymous";
      audioRef.current = audio;

      sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      audio.onended = () => skipToNext();
      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.onerror = (err) => {
        console.error('Audio playback error:', err);
        setIsPlaying(false);
      };

      await audio.play();
      setIsPlaying(true);
      setCurrentTrack(track);
      setCurrentIndex(index);
    } catch (err) {
      console.error('Playback failed:', err);
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    if (!currentTrack && playlist.length > 0) { playTrack(playlist[0], 0); return; }
    if (!currentTrack) { fileInputRef.current?.click(); return; }

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      try {
        if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();
        await audioRef.current?.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Play error:', err);
        setIsPlaying(false);
      }
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
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) audioRef.current.volume = newVolume;
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
      audioRef.current?.pause();
      setIsPlaying(false);
      setCurrentTrack(null);
    } else if (index < currentIndex) setCurrentIndex(currentIndex - 1);
  };

  // --- Rendering Logic ---
  if (!showVisualizer) {
    return <LandingPage onLaunch={handleLaunch} />;
  }

  return (
    <div className="app-container">
   
      <AudioVisualizer
        analyser={analyserRef.current}
        isPlaying={isPlaying}
        mode={visualizerMode}
      />

      <div className={`floating-controls ${!controlsVisible ? 'hidden' : ''}`}>
        <button className="toggle-controls" onClick={() => setControlsVisible(!controlsVisible)}>
          {controlsVisible ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>

        <div className="controls-content">
          <div className="mode-toggle">
            <button className={`mode-btn ${visualizerMode === 'ball' ? 'active' : ''}`} onClick={() => setVisualizerMode('ball')}>Ball</button>
            <button className={`mode-btn ${visualizerMode === 'canvas' ? 'active' : ''}`} onClick={() => setVisualizerMode('canvas')}>Canvas</button>
            <button className={`mode-btn ${visualizerMode === 'aurora' ? 'active' : ''}`} onClick={() => setVisualizerMode('aurora')}>Aurora</button>
          </div>

          {currentTrack && (
            <div className="track-info-minimal">
              <p className="track-name-minimal">{currentTrack.name}</p>
              <div className="time-display"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
            </div>
          )}

          {currentTrack && (
            <div className="timeline-container">
              <input type="range" min="0" max={duration || 0} step="0.1" value={currentTime} onChange={handleSeek} className="timeline-slider" />
            </div>
          )}

          <div className="mini-controls">
            <button onClick={skipToPrevious} className="mini-btn" title="Previous" disabled={playlist.length === 0}><SkipBack size={14} /></button>
            <button onClick={togglePlay} className="mini-btn primary" title={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause size={16} /> : <Play size={16} />}</button>
            <button onClick={skipToNext} className="mini-btn" title="Next" disabled={playlist.length === 0}><SkipForward size={14} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="mini-btn" title="Add"><Upload size={14} /></button>
            <div className="mini-volume">
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} className="mini-slider" />
            </div>
          </div>

          {playlist.length > 0 ? (
            <div className="mini-playlist">
              {playlist.map((track, idx) => (
                <div key={idx} className={`mini-playlist-item ${idx === currentIndex ? 'active' : ''}`} onClick={() => playTrack(track, idx)}>
                  <span className="mini-track-name">{track.name}</span>
                  <button className="mini-remove" onClick={(e) => { e.stopPropagation(); removeTrack(idx); }}><X size={12} /></button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mini-empty"><p onClick={() => fileInputRef.current?.click()}>Add music to start</p></div>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="audio/*" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
      </div>

      {!isPlaying && (
        <div className="integration-banner">
          <p>Spotify, Soundcloud + Apple Music integration coming soon</p>
        </div>
      )}
    </div>
  );
};

export default App;
*/



// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// DUAL AUDIO SYSTEM — Mic Mode OR File Mode, never both at once.
//
// audioSource: 'none' | 'mic' | 'file'
//
// MIC MODE
//   • getUserMedia with music-safe constraints (no echo cancel, no noise suppress)
//   • Works on iOS Safari (15.4+) and Android Chrome
//   • Mic stream → GainNode → AnalyserNode (NOT connected to destination = no feedback)
//   • Visualiser receives analyserRef.current and isMicActive=true
//
// FILE MODE
//   • File input filtered to audio-only MIME types + explicit extensions
//   • On mobile, accept string forces the native music picker on iOS/Android
//   • MediaElementSource → AnalyserNode → destination (you hear it)
//   • Mic stream is torn down before file mode starts
//
// SWITCHING
//   • Switching from File → Mic: audio pauses, file source disconnected, mic opens
//   • Switching from Mic → File: mic stream stopped, file source connects
//   • Both paths go through teardownAudio() first for clean slate
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, SkipForward, SkipBack, Upload,
  X, ChevronDown, ChevronUp, Mic, MicOff, Music
} from 'lucide-react';

// ── Import your existing components ──────────────────────────────────────────
// Adjust paths to match your actual folder structure
import AudioVisualizer from './visualizers/Audiovizballcanvasref';
import LandingPage     from './components/LandingPage';
import './visualizercss.css';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

// FFT size — 2048 is the sweet spot: responsive enough for animation,
// not so large it causes jank on mid-range phones.
const FFT_SIZE   = 2048;
const SMOOTH     = 0.85;

// File input accept string.
// audio/* covers most desktop browsers.
// The explicit extension list is what triggers the native MUSIC picker on iOS
// (Files app / Music library) and Android instead of a generic document picker.
// We deliberately exclude video/* so users can't accidentally pick a video file.
const AUDIO_ACCEPT = [
  'audio/*',
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.opus',
  '.m4a', '.wma', '.aiff', '.aif', '.alac',
].join(',');

// Mic status display labels
const MIC_LABEL = {
  idle:       'Tap to listen',
  requesting: 'Requesting…',
  active:     'Listening',
  silent:     'Silence',
  error:      'Mic unavailable',
  stopped:    'Mic off',
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const App = () => {

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [showVisualizer, setShowVisualizer]   = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // ── Visualiser mode ─────────────────────────────────────────────────────────
  const [visualizerMode, setVisualizerMode] = useState('aurora');

  // ── Audio source: 'none' | 'mic' | 'file' ──────────────────────────────────
  const [audioSource, setAudioSource]   = useState('none');
  const [micStatus,   setMicStatus]     = useState('idle');   // see MIC_LABEL keys
  const [isMicActive, setIsMicActive]   = useState(false);

  // ── File player state ────────────────────────────────────────────────────────
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [volume,       setVolume]       = useState(0.7);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playlist,     setPlaylist]     = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);

  // ── UI ───────────────────────────────────────────────────────────────────────
  const [controlsVisible, setControlsVisible] = useState(true);

  // ── Refs — Audio nodes ───────────────────────────────────────────────────────
  const ctxRef        = useRef(null);   // AudioContext (shared by both modes)
  const analyserRef   = useRef(null);   // AnalyserNode (passed to visualiser)
  const fileSourceRef = useRef(null);   // MediaElementSourceNode for file playback
  const micSourceRef  = useRef(null);   // MediaStreamSourceNode for mic
  const micGainRef    = useRef(null);   // GainNode on mic path
  const micStreamRef  = useRef(null);   // MediaStream (getUserMedia)
  const audioElRef    = useRef(null);   // HTMLAudioElement for file playback
  const fileInputRef  = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // AUDIO CONTEXT — created once, shared
  // ─────────────────────────────────────────────────────────────────────────────

  const ensureContext = useCallback(async () => {
    if (!ctxRef.current) {
      const Ctx         = window.AudioContext || window.webkitAudioContext;
      ctxRef.current    = new Ctx();
      const analyser    = ctxRef.current.createAnalyser();
      analyser.fftSize                 = FFT_SIZE;
      analyser.smoothingTimeConstant   = SMOOTH;
      analyser.minDecibels             = -90;
      analyser.maxDecibels             = -10;
      analyserRef.current = analyser;
    }
    if (ctxRef.current.state === 'suspended') {
      await ctxRef.current.resume();
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // TEARDOWN — cleanly disconnects whichever source is currently active
  // ─────────────────────────────────────────────────────────────────────────────

  const teardownMic = useCallback(() => {
    // Stop all mic tracks (releases the browser mic indicator on mobile)
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    try { micSourceRef.current?.disconnect(); } catch (_) {}
    try { micGainRef.current?.disconnect();   } catch (_) {}
    micSourceRef.current = null;
    micGainRef.current   = null;
    setIsMicActive(false);
    setMicStatus('stopped');
  }, []);

  const teardownFile = useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = '';
    }
    try { fileSourceRef.current?.disconnect(); } catch (_) {}
    fileSourceRef.current = null;
    setIsPlaying(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // MIC MODE
  // ─────────────────────────────────────────────────────────────────────────────

  const startMic = useCallback(async () => {
    // If file is playing, stop it first
    teardownFile();
    setAudioSource('mic');
    setMicStatus('requesting');

    try {
      await ensureContext();

      // getUserMedia with music-safe constraints.
      // echoCancellation:false + noiseSuppression:false = raw audio signal.
      // Without these, the browser destroys bass and mid frequencies.
      // autoGainControl:false = we control gain ourselves.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl:  false,
          // Prefer high sample rate; mobile browsers may ignore this
          sampleRate:  { ideal: 44100 },
          channelCount:{ ideal: 1 },
        },
        video: false,
      });

      micStreamRef.current = stream;

      // Build: mic stream → GainNode → AnalyserNode
      // Intentionally NOT connected to destination — no feedback risk.
      const gain = ctxRef.current.createGain();
      gain.gain.value = 1.0;
      micGainRef.current = gain;

      const src = ctxRef.current.createMediaStreamSource(stream);
      micSourceRef.current = src;

      src.connect(gain);
      gain.connect(analyserRef.current);
      // analyserRef.current deliberately NOT → destination

      setIsMicActive(true);
      setMicStatus('active');
      setCurrentTrack(null);  // clear track display when mic is live

    } catch (err) {
      const isPermission = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      const isNoDevice   = err.name === 'NotFoundError'   || err.name === 'DevicesNotFoundError';
      if (isPermission) {
        setMicStatus('error');
        console.warn('[Mic] Permission denied.');
      } else if (isNoDevice) {
        setMicStatus('error');
        console.warn('[Mic] No microphone found on this device.');
      } else {
        setMicStatus('error');
        console.error('[Mic] Unexpected error:', err);
      }
      setAudioSource('none');
    }
  }, [ensureContext, teardownFile]);

  const stopMic = useCallback(() => {
    teardownMic();
    setAudioSource('none');
  }, [teardownMic]);

  const toggleMic = useCallback(async () => {
    if (audioSource === 'mic') {
      stopMic();
    } else {
      await startMic();
    }
  }, [audioSource, startMic, stopMic]);

  // ─────────────────────────────────────────────────────────────────────────────
  // FILE MODE — helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const initFileAudio = useCallback(async (track) => {
    // If mic is running, tear it down first
    teardownMic();
    // If a previous file source exists, disconnect it
    teardownFile();
    setAudioSource('file');

    await ensureContext();

    const audio       = new Audio(track.url);
    audio.volume      = volume;
    audio.crossOrigin = 'anonymous';
    audioElRef.current = audio;

    // Build: HTMLAudioElement → MediaElementSource → AnalyserNode → destination
    // This path IS connected to destination so the user hears the music.
    const src = ctxRef.current.createMediaElementSource(audio);
    fileSourceRef.current = src;
    src.connect(analyserRef.current);
    analyserRef.current.connect(ctxRef.current.destination);

    return audio;
  }, [ensureContext, teardownFile, teardownMic, volume]);

  // ─────────────────────────────────────────────────────────────────────────────
  // FILE UPLOAD — strict audio-only filtering
  // ─────────────────────────────────────────────────────────────────────────────

  const handleFileUpload = useCallback((e) => {
    const files = Array.from(e.target.files || []);

    // Double-filter: MIME type must start with audio/
    // This catches cases where mobile browsers pass through video files
    // despite the accept attribute.
    const audioFiles = files.filter(f => {
      const mime = f.type || '';
      const ext  = f.name.split('.').pop()?.toLowerCase() || '';
      const knownExts = ['mp3','wav','flac','aac','ogg','opus','m4a','wma','aiff','aif','alac'];
      return mime.startsWith('audio/') || knownExts.includes(ext);
    });

    if (audioFiles.length === 0) return;

    const newTracks = audioFiles.map(f => ({
      name: f.name.replace(/\.[^/.]+$/, ''),
      url:  URL.createObjectURL(f),
    }));

    setPlaylist(prev => {
      const updated = [...prev, ...newTracks];
      // Auto-play the first track if nothing was loaded before
      if (prev.length === 0 && newTracks.length > 0) {
        setTimeout(() => playTrack(newTracks[0], 0), 100);
      }
      return updated;
    });

    if (e.target) e.target.value = '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // PLAYBACK
  // ─────────────────────────────────────────────────────────────────────────────

  const playTrack = useCallback(async (track, index) => {
    try {
      const audio = await initFileAudio(track);

      audio.onended          = () => skipToNextRef.current?.();
      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.onerror          = () => setIsPlaying(false);

      await audio.play();
      setIsPlaying(true);
      setCurrentTrack(track);
      setCurrentIndex(index);
    } catch (err) {
      console.error('[File] Playback failed:', err);
      setIsPlaying(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initFileAudio]);

  // Stable ref so onended closure always calls the latest skipToNext
  const skipToNextRef = useRef(null);

  const skipToNext = useCallback(() => {
    if (playlist.length === 0) return;
    const next = (currentIndex + 1) % playlist.length;
    playTrack(playlist[next], next);
  }, [playlist, currentIndex, playTrack]);

  useEffect(() => { skipToNextRef.current = skipToNext; }, [skipToNext]);

  const skipToPrevious = useCallback(() => {
    if (playlist.length === 0) return;
    if (audioElRef.current && audioElRef.current.currentTime > 3) {
      audioElRef.current.currentTime = 0;
      return;
    }
    const prev = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    playTrack(playlist[prev], prev);
  }, [playlist, currentIndex, playTrack]);

  const togglePlay = useCallback(async () => {
    // If mic is active, pressing play switches to file mode (open picker)
    if (audioSource === 'mic') {
      stopMic();
      fileInputRef.current?.click();
      return;
    }
    if (!currentTrack && playlist.length > 0) {
      playTrack(playlist[0], 0);
      return;
    }
    if (!currentTrack) {
      fileInputRef.current?.click();
      return;
    }
    if (isPlaying) {
      audioElRef.current?.pause();
      setIsPlaying(false);
    } else {
      try {
        if (ctxRef.current?.state === 'suspended') await ctxRef.current.resume();
        await audioElRef.current?.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('[File] Resume failed:', err);
        setIsPlaying(false);
      }
    }
  }, [audioSource, currentTrack, isPlaying, playlist, playTrack, stopMic]);

  const handleVolumeChange = useCallback((e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioElRef.current) audioElRef.current.volume = v;
  }, []);

  const handleSeek = useCallback((e) => {
    const t = parseFloat(e.target.value);
    if (audioElRef.current && !isNaN(audioElRef.current.duration)) {
      audioElRef.current.currentTime = t;
      setCurrentTime(t);
    }
  }, []);

  const removeTrack = useCallback((index) => {
    setPlaylist(prev => {
      const next = prev.filter((_, i) => i !== index);
      return next;
    });
    if (index === currentIndex) {
      teardownFile();
      setCurrentTrack(null);
      if (audioSource === 'file') setAudioSource('none');
    } else if (index < currentIndex) {
      setCurrentIndex(i => i - 1);
    }
  }, [audioSource, currentIndex, teardownFile]);

  const formatTime = (s) => {
    if (isNaN(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // TIME UPDATE (100ms polling)
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const id = setInterval(() => {
      if (audioElRef.current) {
        setCurrentTime(audioElRef.current.currentTime || 0);
        setDuration(audioElRef.current.duration   || 0);
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // CLEANUP on unmount
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      teardownMic();
      teardownFile();
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch(() => {});
      }
    };
  }, [teardownFile, teardownMic]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HERO → VISUALISER TRANSITION
  // ─────────────────────────────────────────────────────────────────────────────

  const handleLaunch = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setShowVisualizer(true);
      setIsTransitioning(false);
    }, 800);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER — HERO
  // ─────────────────────────────────────────────────────────────────────────────

  if (!showVisualizer) {
    return <LandingPage onLaunch={handleLaunch} />;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER — VISUALISER
  // ─────────────────────────────────────────────────────────────────────────────

  const micIsOn      = audioSource === 'mic';
  const fileIsActive = audioSource === 'file';
  const micErrored   = micStatus === 'error';

  return (
    <div className="app-container">

      {/* ── Visualiser canvas ───────────────────────────────────────────────── */}
      <AudioVisualizer
        analyser={analyserRef.current}
        isPlaying={isPlaying || micIsOn}
        mode={visualizerMode}
      />

      {/* ── Floating controls panel ─────────────────────────────────────────── */}
      <div className={`floating-controls ${!controlsVisible ? 'hidden' : ''}`}>

        <button
          className="toggle-controls"
          onClick={() => setControlsVisible(v => !v)}
          aria-label={controlsVisible ? 'Hide controls' : 'Show controls'}
        >
          {controlsVisible ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>

        <div className="controls-content">

          {/* ── Visualiser mode buttons ─────────────────────────────────────── */}
          <div className="mode-toggle">
            {['ball', 'canvas', 'aurora'].map(m => (
              <button
                key={m}
                className={`mode-btn ${visualizerMode === m ? 'active' : ''}`}
                onClick={() => setVisualizerMode(m)}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {/* ── Source toggle: Mic  |  Music ───────────────────────────────── */}
          <div className="source-toggle">

            {/* MIC button */}
            <button
              className={`source-btn ${micIsOn ? 'active mic-on' : ''} ${micErrored ? 'errored' : ''}`}
              onClick={toggleMic}
              title={micIsOn ? 'Stop microphone' : 'Use microphone'}
              disabled={micStatus === 'requesting'}
            >
              {micIsOn ? <MicOff size={13} /> : <Mic size={13} />}
              <span>{micIsOn ? MIC_LABEL[micStatus] || 'Listening' : 'Mic'}</span>
            </button>

            {/* MUSIC / FILE button */}
            <button
              className={`source-btn ${fileIsActive ? 'active' : ''}`}
              onClick={() => {
                if (micIsOn) stopMic();
                fileInputRef.current?.click();
              }}
              title="Upload music"
            >
              <Music size={13} />
              <span>Music</span>
            </button>
          </div>

          {/* ── Mic status line ─────────────────────────────────────────────── */}
          {micIsOn && (
            <div className="mic-status-bar">
              <span className={`mic-dot ${micStatus === 'active' ? 'pulse' : ''}`} />
              <span className="mic-status-text">
                {micStatus === 'active'
                  ? 'Mic — capturing environment'
                  : micStatus === 'requesting'
                  ? 'Waiting for permission…'
                  : micStatus === 'error'
                  ? 'Could not access microphone'
                  : 'Mic connected'}
              </span>
            </div>
          )}

          {/* ── Track info (file mode only) ─────────────────────────────────── */}
          {currentTrack && fileIsActive && (
            <div className="track-info-minimal">
              <p className="track-name-minimal">{currentTrack.name}</p>
              <div className="time-display">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}

          {/* ── Seek timeline ───────────────────────────────────────────────── */}
          {currentTrack && fileIsActive && (
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

          {/* ── Transport controls ──────────────────────────────────────────── */}
          <div className="mini-controls">
            <button
              onClick={skipToPrevious}
              className="mini-btn"
              disabled={playlist.length === 0 || micIsOn}
              title="Previous"
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
              disabled={playlist.length === 0 || micIsOn}
              title="Next"
            >
              <SkipForward size={14} />
            </button>

            <button
              onClick={() => { if (micIsOn) stopMic(); fileInputRef.current?.click(); }}
              className="mini-btn"
              title="Add music"
            >
              <Upload size={14} />
            </button>

            {/* Volume — only visible in file mode */}
            {!micIsOn && (
              <div className="mini-volume">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="mini-slider"
                  aria-label="Volume"
                />
              </div>
            )}
          </div>

          {/* ── Playlist ────────────────────────────────────────────────────── */}
          {playlist.length > 0 ? (
            <div className="mini-playlist">
              {playlist.map((track, idx) => (
                <div
                  key={idx}
                  className={`mini-playlist-item ${idx === currentIndex && fileIsActive ? 'active' : ''}`}
                  onClick={() => { if (micIsOn) stopMic(); playTrack(track, idx); }}
                >
                  <span className="mini-track-name">{track.name}</span>
                  <button
                    className="mini-remove"
                    onClick={e => { e.stopPropagation(); removeTrack(idx); }}
                    aria-label={`Remove ${track.name}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            !micIsOn && (
              <div className="mini-empty">
                <p onClick={() => fileInputRef.current?.click()}>
                  Add music or use mic
                </p>
              </div>
            )
          )}

        </div>{/* end controls-content */}

        {/* ── Hidden file input ───────────────────────────────────────────── */}
        {/*
          accept= forces the native music picker on iOS and Android.
          audio/* tells the browser this is an audio input.
          The explicit extensions (.mp3, .wav, etc.) trigger the iOS Files app
          "Music" filter and Android's audio media picker instead of a generic
          document browser. Without the explicit extensions, iOS shows "All Files".
        */}
        <input
          ref={fileInputRef}
          type="file"
          accept={AUDIO_ACCEPT}
          multiple
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          aria-hidden="true"
        />

      </div>{/* end floating-controls */}

      {/* ── Idle banner ─────────────────────────────────────────────────────── */}
      {!isPlaying && !micIsOn && (
        <div className="integration-banner">
          <p>Upload music or tap Mic — Spotify &amp; Apple Music coming soon</p>
        </div>
      )}

    </div>
  );
};

export default App;







