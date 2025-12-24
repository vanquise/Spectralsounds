
/*
import React, { useEffect, useRef } from 'react';
import { generateUniquePalette, hslToString, getColorFromPalette, toLuminous, interpolatePalettes, getTimeOfDay } from '../utils/colorUtils';
import { initNoise, fractalNoise2D } from '../utils/noise';

const AudioVisualizerCanvas = ({ analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const colorStateRef = useRef({
    currentPalette: null,
    nextPalette: null,
    transitionProgress: 1,
    initialized: false,
    lastChangeTime: 0,
    lastTimeOfDay: null
  });

  const energyFieldRef = useRef({
    centerX: 0,
    centerY: 0,
    maxRadius: 0,
    points: [],
    velocities: [],
    energy: 0,
    flowAngle: 0,
    particles: []
  });

  const timeRef = useRef(0);
  const idleTimeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const field = energyFieldRef.current;
      field.centerX = canvas.width / 2;
      field.centerY = canvas.height / 2;
      field.maxRadius = Math.min(canvas.width, canvas.height) * 0.45;

      initializeEnergyField();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const initializeEnergyField = () => {
    initNoise(Date.now() + Math.random() * 10000);

    const field = energyFieldRef.current;
    const numPoints = 120;

    field.points = [];
    field.velocities = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      field.points.push({
        angle: angle,
        radius: field.maxRadius * 0.6,
        targetRadius: field.maxRadius * 0.6,
        noiseOffset: Math.random() * 1000,
        localEnergy: 0,
        flowInfluence: Math.random()
      });
      field.velocities.push({ radial: 0, angular: 0 });
    }

    field.particles = [];
  };

  const analyzeMusic = (dataArray, bufferLength) => {
    const bassRange = Math.floor(bufferLength * 0.08);
    const midRange = Math.floor(bufferLength * 0.5);
    const highMidRange = Math.floor(bufferLength * 0.7);

    const bass = dataArray.slice(0, bassRange).reduce((a, b) => a + b, 0) / bassRange;
    const mid = dataArray.slice(bassRange, midRange).reduce((a, b) => a + b, 0) / (midRange - bassRange);
    const high = dataArray.slice(highMidRange).reduce((a, b) => a + b, 0) / (bufferLength - highMidRange);
    const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;

    let weightedSum = 0, totalWeight = 0;
    dataArray.forEach((value, index) => {
      weightedSum += value * index;
      totalWeight += value;
    });
    const spectralCentroid = totalWeight > 0 ? (weightedSum / totalWeight) / bufferLength : 0.5;
    const activeFreqs = dataArray.filter(v => v > 10).length;
    const harmonicRichness = activeFreqs / bufferLength;

    return {
      bassIntensity: bass / 255,
      midIntensity: mid / 255,
      highIntensity: high / 255,
      energy: avg / 255,
      spectralCentroid,
      harmonicRichness
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const bufferLength = analyser ? analyser.frequencyBinCount : 1024;
    const dataArray = new Uint8Array(bufferLength);

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      timeRef.current += 0.016;

      const colorState = colorStateRef.current;
      const field = energyFieldRef.current;

      // Audio analysis
      let audioData = {
        bassIntensity: 0,
        midIntensity: 0,
        highIntensity: 0,
        energy: 0,
        spectralCentroid: 0.5,
        harmonicRichness: 0
      };

      const isIdle = !analyser || !isPlaying;

      if (!isIdle) {
        analyser.getByteFrequencyData(dataArray);
        idleTimeRef.current = 0;
        audioData = analyzeMusic(dataArray, bufferLength);
      } else {
        idleTimeRef.current += 0.016;
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = 0;
        }
      }

      // Initialize palette
      if (!colorState.initialized) {
        try {
          colorState.currentPalette = generateUniquePalette({
            bassAvg: 0.5,
            midAvg: 0.5,
            highAvg: 0.5,
            spectralCentroid: 0.5,
            harmonicRichness: 0.5
          });
          colorState.transitionProgress = 1;
          colorState.lastChangeTime = timeRef.current;
          colorState.initialized = true;
        } catch (err) {
          colorState.currentPalette = {
            colors: [{ h: 200, s: 70, l: 60 }],
            baseHue: 200,
            type: 'fallback'
          };
          colorState.initialized = true;
        }
      }

      // Check if time of day has changed
      const currentTimeOfDay = getTimeOfDay();
      const timeOfDayChanged = colorState.lastTimeOfDay &&
                               colorState.lastTimeOfDay !== currentTimeOfDay;

      // Smooth palette transitions
      const timeSinceLastChange = timeRef.current - colorState.lastChangeTime;
      const shouldChangePalette = (
        timeOfDayChanged || // Immediate change when time period shifts
        timeSinceLastChange > 12 + Math.random() * 6 ||
        (audioData.harmonicRichness > 0.75 && timeSinceLastChange > 6)
      );

      if (timeOfDayChanged) {
        colorState.lastTimeOfDay = currentTimeOfDay;
      } else if (!colorState.lastTimeOfDay) {
        colorState.lastTimeOfDay = currentTimeOfDay;
      }

      if (shouldChangePalette && colorState.transitionProgress >= 1) {
        try {
          colorState.nextPalette = generateUniquePalette({
            bassAvg: audioData.bassIntensity,
            midAvg: audioData.midIntensity,
            highAvg: audioData.highIntensity,
            spectralCentroid: audioData.spectralCentroid,
            harmonicRichness: audioData.harmonicRichness
          });
          colorState.transitionProgress = 0;
          colorState.lastChangeTime = timeRef.current;
        } catch (err) {
          console.error('Palette generation error:', err);
        }
      }

      // Smooth palette transition
      if (colorState.transitionProgress < 1 && colorState.nextPalette) {
        colorState.transitionProgress += 0.004;
        if (colorState.transitionProgress >= 1) {
          colorState.currentPalette = colorState.nextPalette;
          colorState.nextPalette = null;
        }
      }

      // Get active palette
      const activePalette = colorState.transitionProgress < 1 && colorState.nextPalette
        ? interpolatePalettes(colorState.currentPalette, colorState.nextPalette, colorState.transitionProgress)
        : colorState.currentPalette;

      // Background gradient
      const bgGradient = ctx.createRadialGradient(
        field.centerX, field.centerY, 0,
        field.centerX, field.centerY, field.maxRadius * 1.5
      );
      const bgColor1 = getColorFromPalette(activePalette, 0.05, audioData.energy * 0.2);
      const bgColor2 = getColorFromPalette(activePalette, 0.15, audioData.energy * 0.2);
      bgGradient.addColorStop(0, hslToString({ h: bgColor1.h, s: bgColor1.s, l: Math.max(3, bgColor1.l - 42) }, 1));
      bgGradient.addColorStop(0.7, hslToString({ h: bgColor2.h, s: bgColor2.s, l: Math.max(3, bgColor2.l - 45) }, 1));
      bgGradient.addColorStop(1, hslToString({ h: bgColor2.h, s: bgColor2.s, l: Math.max(2, bgColor2.l - 50) }, 1));
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update field energy and flow
      field.energy += (audioData.energy - field.energy) * 0.08;

      if (isIdle) {
        field.flowAngle += 0.003;
      } else {
        field.flowAngle += (audioData.midIntensity * 0.02 + audioData.bassIntensity * 0.01);
      }

      // Update field points
      field.points.forEach((point, i) => {
        const freqIndex = Math.floor((i / field.points.length) * bufferLength);
        const freqValue = dataArray[freqIndex] / 255;

        if (isIdle) {
          const driftNoise = fractalNoise2D(
            Math.cos(point.angle) * 0.3 + idleTimeRef.current * 0.04,
            Math.sin(point.angle) * 0.3 + idleTimeRef.current * 0.04,
            3,
            0.5
          );

          const baseRadius = field.maxRadius * 0.6;
          const driftAmount = driftNoise * 0.15;
          point.targetRadius = baseRadius * (1 + driftAmount);
          point.localEnergy = 0.1;
        } else {
          const noiseValue = fractalNoise2D(
            Math.cos(point.angle + field.flowAngle) * 0.5 + timeRef.current * 0.15,
            Math.sin(point.angle + field.flowAngle) * 0.5 + timeRef.current * 0.15,
            4,
            0.5
          );

          const freqInfluence = freqValue * 0.4;
          const noiseInfluence = noiseValue * 0.25;
          const bassInfluence = audioData.bassIntensity * 0.3;
          const flowInfluence = Math.sin(point.angle + field.flowAngle) * audioData.midIntensity * 0.2;

          point.localEnergy += (freqValue - point.localEnergy) * 0.12;
          const localInfluence = point.localEnergy * 0.2;

          const totalInfluence = freqInfluence + noiseInfluence + bassInfluence + flowInfluence + localInfluence;

          const energySize = 0.5 + field.energy * 0.5;
          const baseRadius = field.maxRadius * energySize;

          point.targetRadius = baseRadius * (1 + totalInfluence);
        }

        const responseSpeed = isIdle ? 0.03 : 0.06;
        const diff = point.targetRadius - point.radius;
        field.velocities[i].radial += diff * responseSpeed;
        field.velocities[i].radial *= 0.88;

        point.radius += field.velocities[i].radial;
        point.radius = Math.min(point.radius, field.maxRadius);

        const rotationSpeed = isIdle ? 0.0002 : audioData.midIntensity * 0.001;
        point.angle += rotationSpeed;
      });

      // Draw main energy field
      ctx.save();
      ctx.translate(field.centerX, field.centerY);

      for (let layer = 0; layer < 3; layer++) {
        const layerScale = 1 + layer * 0.4;
        const layerAlpha = (1 - layer * 0.3) * (0.2 + field.energy * 0.3);

        ctx.beginPath();
        field.points.forEach((point, i) => {
          const x = Math.cos(point.angle) * point.radius * layerScale;
          const y = Math.sin(point.angle) * point.radius * layerScale;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevPoint = field.points[i - 1];
            const prevX = Math.cos(prevPoint.angle) * prevPoint.radius * layerScale;
            const prevY = Math.sin(prevPoint.angle) * prevPoint.radius * layerScale;
            const cpX = (prevX + x) / 2;
            const cpY = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
          }
        });
        ctx.closePath();

        const avgRadius = field.points.reduce((sum, p) => sum + p.radius, 0) / field.points.length;
        const layerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, avgRadius * layerScale);

        const colorPos = 0.3 + layer * 0.2;
        const layerColor = getColorFromPalette(activePalette, colorPos, field.energy + 0.3);
        const luminousColor = toLuminous(layerColor, field.energy);

        layerGradient.addColorStop(0, hslToString(luminousColor, layerAlpha * 0.8));
        layerGradient.addColorStop(0.5, hslToString(layerColor, layerAlpha * 0.6));
        layerGradient.addColorStop(1, hslToString(layerColor, layerAlpha * 0.1));

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = layerGradient;
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();

      // Spawn particles
      if (!isIdle && audioData.energy > 0.4 && Math.random() < audioData.energy * 0.2) {
        const randomPoint = field.points[Math.floor(Math.random() * field.points.length)];
        const x = field.centerX + Math.cos(randomPoint.angle) * randomPoint.radius;
        const y = field.centerY + Math.sin(randomPoint.angle) * randomPoint.radius;

        field.particles.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          life: 1,
          colorOffset: Math.random(),
          size: 2 + Math.random() * 3
        });
      }

      // Update and render particles
      field.particles = field.particles.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.98;
        particle.vy *= 0.98;
        particle.life -= 0.015;

        if (particle.life <= 0) return false;

        const particleColor = getColorFromPalette(activePalette, particle.colorOffset, field.energy);
        ctx.fillStyle = hslToString(particleColor, particle.life * 0.7);
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        return true;
      });
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isPlaying]);

  return <canvas ref={canvasRef} className="visualizer-canvas" />;
};

export default AudioVisualizerCanvas;
*/












/*
// src/visualizers/AudioVisualizer-Canvas.jsx
import React, { useEffect, useRef } from 'react';
import {
  generateUniquePalette,
  getColorFromPalette,
  hslToString,
  toLuminous,
  interpolatePalettes
} from '../utils/colorUtils';
import { initNoise, fractalNoise2D } from '../utils/noise';

const AudioVisualizerCanvas = ({ analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const timeRef = useRef(0);

  const smoothed = {
    energy: useRef(0),
    bass: useRef(0),
    mid: useRef(0),
    treble: useRef(0),
  };

  const paletteTransitionRef = useRef({
    current: null,
    next: null,
    progress: 1,
    lastChangeTime: 0
  });

  useEffect(() => {
    initNoise(Date.now() + Math.random() * 10000);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let raf = null;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const bufferLength = analyser ? analyser.frequencyBinCount : 2048;
    const dataArray = new Uint8Array(bufferLength);

    const smooth = (ref, target, speed = 0.12) => {
      ref.current += (target - ref.current) * speed;
    };

    const updatePalette = (audioSignature, forceNew = false) => {
      const transition = paletteTransitionRef.current;

      if (forceNew || !transition.current) {
        const newPalette = generateUniquePalette(audioSignature);

        if (transition.current && transition.progress >= 1) {
          transition.next = newPalette;
          transition.progress = 0;
        } else {
          transition.current = newPalette;
          transition.progress = 1;
        }
      }

      if (transition.next && transition.progress < 1) {
        transition.progress += 0.003;
        if (transition.progress >= 1) {
          transition.current = transition.next;
          transition.next = null;
          transition.progress = 1;
        }
      }

      if (transition.next && transition.progress < 1) {
        return interpolatePalettes(transition.current, transition.next, transition.progress);
      }
      return transition.current;
    };

    // CANVAS IDLE - Living gradient
    const drawCanvasIdle = () => {
      timeRef.current += 0.016;

      if (!paletteTransitionRef.current.current) {
        updatePalette({
          bassAvg: 0.2,
          midAvg: 0.25,
          highAvg: 0.25,
          spectralCentroid: 0.5,
          harmonicRichness: 0.2
        });
      }

      const palette = paletteTransitionRef.current.current;
      const w = canvas.width;
      const h = canvas.height;

      // FULLSCREEN ANIMATED GRADIENT
      const gradientCount = 5;
      for (let i = 0; i < gradientCount; i++) {
        const colorPos = i / gradientCount;
        const color = getColorFromPalette(palette, colorPos, 0.3);
        const brightColor = {
          h: color.h + Math.sin(timeRef.current * 0.2 + i) * 15,
          s: Math.min(100, color.s + 30),
          l: Math.min(65, color.l + 15)
        };

        const xOffset = Math.sin(timeRef.current * 0.15 + i * 0.5) * w * 0.3;
        const yOffset = Math.cos(timeRef.current * 0.12 + i * 0.7) * h * 0.3;

        const cx = w * (0.3 + i * 0.15) + xOffset;
        const cy = h * (0.3 + i * 0.15) + yOffset;
        const radius = Math.max(w, h) * (0.4 + Math.sin(timeRef.current * 0.3 + i) * 0.1);

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        g.addColorStop(0, hslToString(brightColor, 0.15));
        g.addColorStop(0.5, hslToString(brightColor, 0.08));
        g.addColorStop(1, 'transparent');

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(drawCanvasIdle);
    };

    // CANVAS ACTIVE - Living fullscreen neon gradient
    const drawCanvas = () => {
      analyser.getByteFrequencyData(dataArray);

      const bassRange = Math.max(2, Math.floor(bufferLength * 0.12));
      const midStart = bassRange;
      const midEnd = Math.max(midStart + 2, Math.floor(bufferLength * 0.45));
      const trebleStart = midEnd;

      const bassAvg = dataArray.slice(0, bassRange).reduce((a, b) => a + b, 0) / bassRange;
      const midAvg = dataArray.slice(midStart, midEnd).reduce((a, b) => a + b, 0) / (midEnd - midStart);
      const trebleAvg = dataArray.slice(trebleStart).reduce((a, b) => a + b, 0) / (bufferLength - trebleStart);
      const energy = dataArray.reduce((a, b) => a + b, 0) / bufferLength;

      smooth(smoothed.bass, bassAvg);
      smooth(smoothed.mid, midAvg);
      smooth(smoothed.treble, trebleAvg);
      smooth(smoothed.energy, energy, 0.09);

      const timeSinceChange = timeRef.current - paletteTransitionRef.current.lastChangeTime;
      if (timeSinceChange > 6 && (smoothed.energy.current / 255) > 0.5 && Math.random() < 0.01) {
        updatePalette({
          bassAvg: smoothed.bass.current / 255,
          midAvg: smoothed.mid.current / 255,
          highAvg: smoothed.treble.current / 255,
          spectralCentroid: 0.2 + (smoothed.treble.current / 255) * 0.8,
          harmonicRichness: Math.min(1, (smoothed.mid.current / 255) * 1.2)
        }, true);
        paletteTransitionRef.current.lastChangeTime = timeRef.current;
      }

      const palette = updatePalette({
        bassAvg: smoothed.bass.current / 255,
        midAvg: smoothed.mid.current / 255,
        highAvg: smoothed.treble.current / 255,
        spectralCentroid: 0.2 + (smoothed.treble.current / 255) * 0.8,
        harmonicRichness: Math.min(1, (smoothed.mid.current / 255) * 1.2)
      });

      const w = canvas.width;
      const h = canvas.height;
      const bassNorm = smoothed.bass.current / 255;
      const midNorm = smoothed.mid.current / 255;
      const energyNorm = smoothed.energy.current / 255;

      // FULLSCREEN LIVING NEON GRADIENT
      const blobCount = 8 + Math.floor(energyNorm * 6);

      for (let i = 0; i < blobCount; i++) {
        const colorPos = i / blobCount;
        const blobColor = getColorFromPalette(palette, colorPos, energyNorm);

        // INTENSE NEON COLORS
        const neonColor = {
          h: blobColor.h + midNorm * 40 * Math.sin(timeRef.current * 0.5 + i),
          s: Math.min(100, blobColor.s + 45),
          l: Math.min(80, blobColor.l + 25)
        };

        // Dynamic position based on music
        const xBase = w * ((i / blobCount) + 0.1);
        const yBase = h * 0.5;

        const xNoise = fractalNoise2D(i * 0.3 + timeRef.current * 0.2, timeRef.current * 0.15, 4, 0.6);
        const yNoise = fractalNoise2D(i * 0.4, timeRef.current * 0.18 + i, 4, 0.6);

        const xOffset = xNoise * w * 0.4 + Math.sin(timeRef.current * 0.8 + i * 0.5) * w * 0.2 * bassNorm;
        const yOffset = yNoise * h * 0.4 + Math.cos(timeRef.current * 0.6 + i * 0.7) * h * 0.2 * midNorm;

        const cx = xBase + xOffset;
        const cy = yBase + yOffset;

        // Dynamic size based on energy
        const baseSize = Math.max(w, h) * 0.35;
        const sizeMultiplier = 1 + bassNorm * 0.5 + midNorm * 0.3 * Math.sin(timeRef.current * 2 + i);
        const radius = baseSize * sizeMultiplier;

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        g.addColorStop(0, hslToString(toLuminous(neonColor, 1.5), 0.4 + energyNorm * 0.3));
        g.addColorStop(0.3, hslToString(neonColor, 0.3 + energyNorm * 0.2));
        g.addColorStop(0.7, hslToString(neonColor, 0.15));
        g.addColorStop(1, 'transparent');

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(0, 0, 0, ${0.03 - energyNorm * 0.02})`;
      ctx.fillRect(0, 0, w, h);

      timeRef.current += 0.016;
      raf = requestAnimationFrame(drawCanvas);
    };

    const loop = () => {
      if (!analyser || !isPlaying) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(drawCanvasIdle);
        return;
      }

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(drawCanvas);
    };

    loop();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, [analyser, isPlaying]);

  return <canvas ref={canvasRef} className="visualizer-canvas" style={{ position: 'absolute', inset: 0 }} />;
};

export default AudioVisualizerCanvas;
*/






/*
// src/visualizers/AudioVisualizer-Canvas.jsx
import React, { useEffect, useRef } from 'react';
import {
  generateUniquePalette,
  getColorFromPalette,
  hslToString,
  toLuminous,
  interpolatePalettes
} from '../utils/colorUtils';
import { initNoise, fractalNoise2D } from '../utils/noise';

const AudioVisualizerCanvas = ({ analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const timeRef = useRef(0);

  const smoothed = {
    energy: useRef(0),
    bass: useRef(0),
    mid: useRef(0),
    treble: useRef(0),
  };

  const paletteTransitionRef = useRef({
    current: null,
    next: null,
    progress: 1,
    lastChangeTime: 0
  });

  useEffect(() => {
    initNoise(Date.now() + Math.random() * 10000);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let raf = null;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const bufferLength = analyser ? analyser.frequencyBinCount : 2048;
    const dataArray = new Uint8Array(bufferLength);

    const smooth = (ref, target, speed = 0.12) => {
      ref.current += (target - ref.current) * speed;
    };

    const updatePalette = (audioSignature, forceNew = false) => {
      const transition = paletteTransitionRef.current;

      if (forceNew || !transition.current) {
        const newPalette = generateUniquePalette(audioSignature);

        if (transition.current && transition.progress >= 1) {
          transition.next = newPalette;
          transition.progress = 0;
        } else {
          transition.current = newPalette;
          transition.progress = 1;
        }
      }

      if (transition.next && transition.progress < 1) {
        transition.progress += 0.003;
        if (transition.progress >= 1) {
          transition.current = transition.next;
          transition.next = null;
          transition.progress = 1;
        }
      }

      if (transition.next && transition.progress < 1) {
        return interpolatePalettes(transition.current, transition.next, transition.progress);
      }
      return transition.current;
    };

    // CANVAS IDLE - Living gradient
    const drawCanvasIdle = () => {
      timeRef.current += 0.016;

      if (!paletteTransitionRef.current.current) {
        updatePalette({
          bassAvg: 0.2,
          midAvg: 0.25,
          highAvg: 0.25,
          spectralCentroid: 0.5,
          harmonicRichness: 0.2
        });
      }

      const palette = paletteTransitionRef.current.current;
      const w = canvas.width;
      const h = canvas.height;
      const centerScale = 0.5;

      // FULLSCREEN ANIMATED GRADIENT
      const gradientCount = 5;
      for (let i = 0; i < gradientCount; i++) {
        const colorPos = i / gradientCount;
        const color = getColorFromPalette(palette, colorPos, 0.3);
        const brightColor = {
          h: color.h + Math.sin(timeRef.current * 0.2 + i) * 15,
          s: Math.min(75, color.s + 15), // Adjusted for lower saturation
          l: Math.min(55, color.l + 10) // Adjusted for lower brightness
        };

        // Centered movement logic applied here too
        const xBase = w * (0.5 + (colorPos - 0.5) * centerScale);
        const yBase = h * 0.5;

        const xOffset = Math.sin(timeRef.current * 0.15 + i * 0.5) * w * 0.1; // Reduced offset
        const yOffset = Math.cos(timeRef.current * 0.12 + i * 0.7) * h * 0.1; // Reduced offset

        const cx = xBase + xOffset;
        const cy = yBase + yOffset;
        const radius = Math.max(w, h) * (0.2 + Math.sin(timeRef.current * 0.3 + i) * 0.05); // Reduced size

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        g.addColorStop(0, hslToString(brightColor, 0.1)); // Reduced opacity
        g.addColorStop(0.5, hslToString(brightColor, 0.05)); // Reduced opacity
        g.addColorStop(1, 'transparent');

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; // Slightly more fade
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(drawCanvasIdle);
    };

    // CANVAS ACTIVE - Living fullscreen neon gradient (Tweaked to be contained and subtle)
    const drawCanvas = () => {
      analyser.getByteFrequencyData(dataArray);

      const bassRange = Math.max(2, Math.floor(bufferLength * 0.12));
      const midStart = bassRange;
      const midEnd = Math.max(midStart + 2, Math.floor(bufferLength * 0.45));
      const trebleStart = midEnd;

      const bassAvg = dataArray.slice(0, bassRange).reduce((a, b) => a + b, 0) / bassRange;
      const midAvg = dataArray.slice(midStart, midEnd).reduce((a, b) => a + b, 0) / (midEnd - midStart);
      const trebleAvg = dataArray.slice(trebleStart).reduce((a, b) => a + b, 0) / (bufferLength - trebleStart);
      const energy = dataArray.reduce((a, b) => a + b, 0) / bufferLength;

      smooth(smoothed.bass, bassAvg);
      smooth(smoothed.mid, midAvg);
      smooth(smoothed.treble, trebleAvg);
      smooth(smoothed.energy, energy, 0.09);

      const timeSinceChange = timeRef.current - paletteTransitionRef.current.lastChangeTime;
      if (timeSinceChange > 6 && (smoothed.energy.current / 255) > 0.5 && Math.random() < 0.01) {
        updatePalette({
          bassAvg: smoothed.bass.current / 255,
          midAvg: smoothed.mid.current / 255,
          highAvg: smoothed.treble.current / 255,
          spectralCentroid: 0.2 + (smoothed.treble.current / 255) * 0.8,
          harmonicRichness: Math.min(1, (smoothed.mid.current / 255) * 1.2)
        }, true);
        paletteTransitionRef.current.lastChangeTime = timeRef.current;
      }

      const palette = updatePalette({
        bassAvg: smoothed.bass.current / 255,
        midAvg: smoothed.mid.current / 255,
        highAvg: smoothed.treble.current / 255,
        spectralCentroid: 0.2 + (smoothed.treble.current / 255) * 0.8,
        harmonicRichness: Math.min(1, (smoothed.mid.current / 255) * 1.2)
      });

      const w = canvas.width;
      const h = canvas.height;
      const bassNorm = smoothed.bass.current / 255;
      const midNorm = smoothed.mid.current / 255;
      const energyNorm = smoothed.energy.current / 255;

      const centerScale = 0.5; // New variable to focus blobs near the center

      // CONTAINED, SUBTLE GRADIENT (was FULLSCREEN LIVING NEON GRADIENT)
      const blobCount = 6 + Math.floor(energyNorm * 4); // Slightly fewer blobs

      for (let i = 0; i < blobCount; i++) {
        const colorPos = i / blobCount;
        const blobColor = getColorFromPalette(palette, colorPos, energyNorm);

        // CONTAINED, SUBTLE COLORS (Brightness/Saturation reduction)
        const neonColor = {
          h: blobColor.h + midNorm * 20 * Math.sin(timeRef.current * 0.4 + i), // Reduced hue shift
          s: Math.min(85, blobColor.s + 15 - energyNorm * 10), // REDUCED SATURATION (Max 85, added 15 instead of 45)
          l: Math.min(65, blobColor.l + 10 - energyNorm * 5)   // REDUCED BRIGHTNESS (Max 65, added 10 instead of 25)
        };

        // Dynamic position: centered movement (less chaotic)
        const xBase = w * (0.5 + (colorPos - 0.5) * centerScale); // Centered positioning, spread over centerScale width
        const yBase = h * (0.5 + Math.sin(i * 1.5) * 0.1);

        const xNoise = fractalNoise2D(i * 0.3 + timeRef.current * 0.15, timeRef.current * 0.1, 4, 0.6); // Slower noise
        const yNoise = fractalNoise2D(i * 0.4, timeRef.current * 0.13 + i, 4, 0.6); // Slower noise

        // REDUCED OFFSET MULTIPLIERS for containment (0.2 max for noise, 0.1 max for sin)
        const noiseInfluence = 0.2 * (0.5 + energyNorm * 0.5);
        const sinInfluence = 0.1 * (0.5 + bassNorm * 0.5);

        const xOffset = xNoise * w * noiseInfluence + Math.sin(timeRef.current * 0.5 + i * 0.5) * w * sinInfluence;
        const yOffset = yNoise * h * noiseInfluence + Math.cos(timeRef.current * 0.4 + i * 0.7) * h * sinInfluence;

        const cx = xBase + xOffset;
        const cy = yBase + yOffset;

        // Dynamic size: slightly smaller overall
        const baseSize = Math.max(w, h) * 0.18; // REDUCED BASE SIZE (0.18 instead of 0.35)
        const sizeMultiplier = 1 + bassNorm * 0.2 + midNorm * 0.1 * Math.sin(timeRef.current * 1.5 + i); // Reduced music influence on size
        const radius = baseSize * sizeMultiplier;

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);

        // REDUCED ALPHA for subtler glow (0.2 instead of 0.4)
        g.addColorStop(0, hslToString(toLuminous(neonColor, 1.2), 0.2 + energyNorm * 0.15));
        g.addColorStop(0.3, hslToString(neonColor, 0.15 + energyNorm * 0.1));
        g.addColorStop(0.7, hslToString(neonColor, 0.08));
        g.addColorStop(1, 'transparent');

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.globalCompositeOperation = 'source-over';
      // Increased base alpha from 0.03 to 0.05 for more blending, simulating paint
      ctx.fillStyle = `rgba(0, 0, 0, ${0.05 - energyNorm * 0.02})`;
      ctx.fillRect(0, 0, w, h);

      timeRef.current += 0.016;
      raf = requestAnimationFrame(drawCanvas);
    };

    const loop = () => {
      if (!analyser || !isPlaying) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(drawCanvasIdle);
        return;
      }

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(drawCanvas);
    };

    loop();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, [analyser, isPlaying]);

  return <canvas ref={canvasRef} className="visualizer-canvas" style={{ position: 'absolute', inset: 0 }} />;
};

export default AudioVisualizerCanvas;
*/






import React, { useEffect, useRef } from 'react';
import {
  generateUniquePalette,
  getColorFromPalette,
  hslToString,
  toLuminous,
  interpolatePalettes,
  bassToDeepColor
} from '../utils/colorUtils';
import { initNoise, fractalNoise2D } from '../utils/noise';
import { musicAnalyzer } from '../utils/musicAnalysis';

const AudioVisualizerCanvas = ({ analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const timeRef = useRef(0);
  const idleTimeRef = useRef(0);
  const lastTimeRef = useRef(performance.now()); // For throttling

  const smoothedEnergy = useRef(0);
  const paletteTransitionRef = useRef({
    current: null,
    next: null,
    progress: 1,
    lastChangeTime: 0
  });

  const bgColorRef = useRef({ h: 200, s: 12, l: 8 });

  useEffect(() => {
    initNoise(Date.now() + Math.random() * 10000);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false }); // Performance: Optimized context
    let raf = null;

    const resize = () => {
      // PERFORMANCE: Cap Pixel Ratio at 1.5 for mobile/low-spec stability
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    resize();
    window.addEventListener('resize', resize);

    const bufferLength = analyser ? analyser.frequencyBinCount : 2048;
    const dataArray = new Uint8Array(bufferLength);

    const smooth = (ref, target, speed = 0.12) => {
      ref.current += (target - ref.current) * speed;
    };

    const updatePalette = (audioSignature, forceNew = false) => {
      const transition = paletteTransitionRef.current;
      if (forceNew || !transition.current) {
        const newPalette = generateUniquePalette(audioSignature);
        if (transition.current && transition.progress >= 1) {
          transition.next = newPalette;
          transition.progress = 0;
        } else {
          transition.current = newPalette;
          transition.progress = 1;
        }
      }
      if (transition.next && transition.progress < 1) {
        transition.progress += 0.003;
        if (transition.progress >= 1) {
          transition.current = transition.next;
          transition.next = null;
          transition.progress = 1;
        }
        return interpolatePalettes(transition.current, transition.next, transition.progress);
      }
      return transition.current;
    };

    const setBackgroundSmooth = (palette, energy) => {
      if (!palette) return;
      const targetBgColor = bassToDeepColor(energy * 0.6, palette);
      const currentBg = bgColorRef.current;
      currentBg.h += (targetBgColor.h - currentBg.h) * 0.02;
      currentBg.s += (Math.max(8, targetBgColor.s * 0.3) - currentBg.s) * 0.02;
      currentBg.l += (Math.max(5, targetBgColor.l - 32) - currentBg.l) * 0.02;

      canvas.style.background = `hsl(${Math.round(currentBg.h)}, ${Math.round(currentBg.s)}%, ${Math.round(currentBg.l)}%)`;
    };

    const animate = (now) => {
      raf = requestAnimationFrame(animate);

      // PERFORMANCE: Throttle Idle frame rate to 30fps
      if (!isPlaying && now - lastTimeRef.current < 32) return;
      lastTimeRef.current = now;

      const w = window.innerWidth;
      const h = window.innerHeight;

      if (!isPlaying || !analyser) {
        // --- IDLE LOGIC (PRESERVED) ---
        timeRef.current += 0.016;
        if (!paletteTransitionRef.current.current) {
          updatePalette({ bassAvg: 0.2, midAvg: 0.25, highAvg: 0.25, spectralCentroid: 0.5, harmonicRichness: 0.2 });
        }
        const palette = paletteTransitionRef.current.current;
        setBackgroundSmooth(palette, 0.15);

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, w, h);

        const color = getColorFromPalette(palette, 0.3, 0.3);
        const brightColor = { h: color.h + Math.sin(timeRef.current * 0.2) * 15, s: Math.min(85, color.s + 20), l: Math.min(60, color.l + 12) };
        const cx = w * 0.5 + Math.sin(timeRef.current * 0.15) * w * 0.08;
        const cy = h * 0.5 + Math.cos(timeRef.current * 0.12) * h * 0.08;
        const radius = Math.max(w, h) * (0.22 + Math.sin(timeRef.current * 0.3) * 0.04);

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        g.addColorStop(0, hslToString(toLuminous(brightColor, 1.1), 0.3));
        g.addColorStop(0.5, hslToString(brightColor, 0.18));
        g.addColorStop(1, 'transparent');

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      } else {
        // --- ACTIVE LOGIC (PRESERVED) ---
        analyser.getByteFrequencyData(dataArray);
        const music = musicAnalyzer.analyze(dataArray, bufferLength, timeRef.current);
        smooth(smoothedEnergy, music.dynamics.current, 0.09);

        const timeSinceChange = timeRef.current - paletteTransitionRef.current.lastChangeTime;
        if (timeSinceChange > 6 && music.dynamics.current > 0.5 && Math.random() < 0.01) {
          updatePalette(music, true);
          paletteTransitionRef.current.lastChangeTime = timeRef.current;
        }

        const palette = updatePalette(music);
        setBackgroundSmooth(palette, music.dynamics.current);

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(0, 0, 0, ${0.05 - music.dynamics.current * 0.02})`;
        ctx.fillRect(0, 0, w, h);

        const blobCount = Math.max(1, Math.min(4, Math.floor(1 + music.texture.layering * 2 + music.harmony.complexity * 1.5)));

        for (let i = 0; i < blobCount; i++) {
          const colorPos = i / Math.max(1, blobCount - 1);
          const blobColor = getColorFromPalette(palette, colorPos * 0.7 + 0.15, music.dynamics.current);
          const neonColor = {
            h: blobColor.h + music.melody.direction * 25 * Math.sin(timeRef.current * 0.4 + i),
            s: Math.min(95, blobColor.s + 25),
            l: Math.min(68, blobColor.l + 15)
          };

          const xBase = w * (0.5 + (colorPos - 0.5) * (0.3 + music.texture.density * 0.3));
          const yBase = h * (0.5 + Math.sin(i * 1.5 + music.melody.direction) * 0.15);

          const xNoise = fractalNoise2D(i * 0.3 + timeRef.current * 0.15, timeRef.current * 0.1, 4, 0.6);
          const yNoise = fractalNoise2D(i * 0.4, timeRef.current * 0.13 + i, 4, 0.6);

          const noiseInf = 0.18 * (0.5 + music.dynamics.current * 0.5);
          const cx = xBase + (xNoise * w * noiseInf) + (music.rhythm.isBeat ? Math.sin(timeRef.current * 10) * w * 0.01 : 0);
          const cy = yBase + (yNoise * h * (noiseInf + music.melody.smoothness * 0.3));

          const radius = (Math.max(w, h) * 0.2) * (1 + music.dynamics.current * 0.4) * (1 + music.timbre.attack * 0.2) * (1 + music.pitch.movement * 0.3);

          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
          g.addColorStop(0, hslToString(toLuminous(neonColor, 1.3), 0.35 + music.dynamics.current * 0.2));
          g.addColorStop(0.35, hslToString(neonColor, 0.25 + music.dynamics.current * 0.15));
          g.addColorStop(0.7, hslToString(neonColor, 0.12));
          g.addColorStop(1, 'transparent');

          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        }
        timeRef.current += 0.016;
      }
    };

    raf = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, [analyser, isPlaying]);

  return <canvas ref={canvasRef} className="visualizer-canvas" style={{ position: 'absolute', inset: 0 }} />;
};

export default AudioVisualizerCanvas;
