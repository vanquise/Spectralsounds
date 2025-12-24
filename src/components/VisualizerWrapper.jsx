
/*
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Upload, X, ChevronDown, ChevronUp } from 'lucide-react';
import AudioVisualizer from '../visualizers/Audiovizballcanvasref';
import FloatingControls from './FloatingControls';
import Footer from './Footer';
import './VisualizerWrapper.css';

const VisualizerWrapper = () => {
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
      <Footer />
    </div>
  );
};

export default VisualizerWrapper;
*/
import { useEffect, useState } from "react";
// Fixed the path: ../ goes up to 'src', then we go into 'visualizers'
import AudioVisualizerAurora from "../visualizers/AudioVisualizer-Aurora";

export default function VisualizerWrapper({ active, onReady, analyser, isPlaying }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setVisible(true);
      // A small delay for a smooth 'emergence' effect
      setTimeout(onReady, 600);
    }
  }, [active, onReady]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0a0a0a",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.8s ease",
        zIndex: 10,
      }}
    >
      {/* Added the props here so the visualizer actually works! */}
      <AudioVisualizerAurora
        analyser={analyser}
        isPlaying={isPlaying}
      />
    </div>
  );
}
