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
      {/* THE VISUALIZER
         The 'mode' prop allows you to switch between Aurora and other visualizers
      */}
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
