
/*
import React, { useEffect, useRef } from 'react';
import { generateUniquePalette, hslToString, bassToDeepColor, trebleToLightColor, getColorFromPalette, toLuminous, toRadiantGlow, interpolatePalettes, getTimeOfDay } from '../utils/colorUtils';
import { initNoise, fractalNoise2D } from '../utils/noise';

const AudioVisualizerBall = ({ analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const musicAnalysisRef = useRef({
    pitch: { current: 0, prev: 0, change: 0, velocity: 0 },
    rhythm: { beat: false, tempo: 120, consistency: 0.5, syncopation: 0 },
    harmony: { complexity: 0, richness: 0, consonance: 0.5 },
    melody: { direction: 0, contour: [], smoothness: 0.5 },
    dynamics: { current: 0, range: 0, peak: 0, rms: 0 },
    timbre: { brightness: 0.5, roughness: 0, warmth: 0.5 },
    texture: { density: 0, layering: 0, clarity: 0.5 },
    form: { section: 0, transition: false, energy: 0 }
  });

  const colorStateRef = useRef({
    currentPalette: null,
    nextPalette: null,
    transitionProgress: 1,
    initialized: false,
    lastChangeTime: 0,
    lastTimeOfDay: null
  });

  const energyBallRef = useRef({
    x: 0,
    y: 0,
    baseRadius: 150,
    maxRadius: 0,
    radius: 150,
    points: [],
    velocities: [],
    energy: 0,
    pulsePhase: 0,
    shapeMode: 0,
    targetShapeMode: 0,
    shapeMorphProgress: 0,
    shapeTransitionSpeed: 0.02,
    organicFactor: 0.5,
    sentientBoundary: 0.6
  });

  const timeRef = useRef(0);
  const beatHistoryRef = useRef([]);
  const shapeTransitionTimerRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      energyBallRef.current.x = canvas.width / 2;
      energyBallRef.current.y = canvas.height / 2;

      const minDimension = Math.min(canvas.width, canvas.height);
      energyBallRef.current.maxRadius = Math.min(minDimension * 0.35, 400);
      energyBallRef.current.baseRadius = energyBallRef.current.maxRadius * 0.7;

      initializeEnergyBall();
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

  const initializeEnergyBall = () => {
    initNoise(Date.now() + Math.random() * 10000);
    const ball = energyBallRef.current;
    const numPoints = 144;

    ball.points = [];
    ball.velocities = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      ball.points.push({
        angle: angle,
        radius: ball.baseRadius,
        targetRadius: ball.baseRadius,
        noiseOffset: Math.random() * 1000,
        shapeInfluence: Math.random(),
        localEnergy: 0
      });
      ball.velocities.push({ radial: 0, angular: 0 });
    }
  };

  const getShapeRadius = (angle, shapeMode, baseRadius, point, t) => {
    switch(shapeMode) {
      case 0:
        return baseRadius * (1 + Math.sin(t * 2) * 0.05);
      case 1:
        return baseRadius * (1 + 0.35 * Math.sin(angle * 2 + t * 0.5));
      case 2:
        const starPoints = 5;
        const starAngle = (angle * starPoints) % (Math.PI * 2);
        return baseRadius * (1 + 0.45 * Math.abs(Math.cos(starAngle * 2.5 + t * 0.3)));
      case 3:
        return baseRadius * (1 + 0.4 * Math.sin(angle * 3 + point.shapeInfluence * Math.PI + t * 0.4));
      case 4:
        const petals = 6;
        return baseRadius * (1 + 0.5 * Math.abs(Math.sin(angle * petals + t * 0.6)));
      case 5:
        const hexAngle = Math.floor(angle / (Math.PI / 3)) * (Math.PI / 3);
        return baseRadius * (1 + 0.3 * Math.cos((angle - hexAngle) * 6 + t * 0.3));
      case 6:
        return baseRadius * (1 + 0.4 * Math.sin(angle * 4 + t * 2));
      case 7:
        return baseRadius * (1 + 0.35 * Math.sin(angle * 2 - t + point.shapeInfluence * Math.PI));
      default:
        return baseRadius;
    }
  };

  const analyzeMusic = (dataArray, bufferLength) => {
    const analysis = musicAnalysisRef.current;

    const bassRange = Math.floor(bufferLength * 0.08);
    const lowMidRange = Math.floor(bufferLength * 0.25);
    const midRange = Math.floor(bufferLength * 0.5);
    const highMidRange = Math.floor(bufferLength * 0.7);

    const bass = dataArray.slice(0, bassRange).reduce((a, b) => a + b, 0) / bassRange;
    const mid = dataArray.slice(lowMidRange, midRange).reduce((a, b) => a + b, 0) / (midRange - lowMidRange);
    const high = dataArray.slice(highMidRange).reduce((a, b) => a + b, 0) / (bufferLength - highMidRange);
    const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;

    let weightedSum = 0, totalWeight = 0;
    dataArray.forEach((value, index) => {
      weightedSum += value * index;
      totalWeight += value;
    });
    analysis.pitch.prev = analysis.pitch.current;
    analysis.pitch.current = totalWeight > 0 ? (weightedSum / totalWeight) / bufferLength : 0.5;
    analysis.pitch.change = analysis.pitch.current - analysis.pitch.prev;
    analysis.pitch.velocity = Math.abs(analysis.pitch.change);

    const activeFreqs = dataArray.filter(v => v > 15).length;
    analysis.harmony.richness = activeFreqs / bufferLength;

    const bins = 8, binSize = Math.floor(bufferLength / bins);
    const binEnergies = [];
    for (let i = 0; i < bins; i++) {
      const start = i * binSize;
      const end = start + binSize;
      binEnergies.push(dataArray.slice(start, end).reduce((a, b) => a + b, 0) / binSize);
    }
    const avgBinEnergy = binEnergies.reduce((a, b) => a + b) / bins;
    const binVariance = binEnergies.reduce((acc, val) => acc + Math.abs(val - avgBinEnergy), 0) / bins;
    analysis.harmony.complexity = Math.min(1, binVariance / 100);

    analysis.dynamics.current = avg / 255;
    analysis.timbre.brightness = analysis.pitch.current;

    return {
      bassIntensity: bass / 255,
      midIntensity: mid / 255,
      highIntensity: high / 255,
      energy: avg / 255
    };
  };

  useEffect(() => {
    if (!analyser || !isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let prevBass = 0;

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      analyser.getByteFrequencyData(dataArray);
      timeRef.current += 0.016;
      shapeTransitionTimerRef.current += 0.016;

      const analysis = musicAnalysisRef.current;
      const colorState = colorStateRef.current;
      const ball = energyBallRef.current;

      const audioData = analyzeMusic(dataArray, bufferLength);

      // Initialize palette
      if (!colorState.initialized) {
        try {
          colorState.currentPalette = generateUniquePalette({
            bassAvg: audioData.bassIntensity,
            midAvg: audioData.midIntensity,
            highAvg: audioData.highIntensity,
            spectralCentroid: analysis.pitch.current,
            harmonicRichness: analysis.harmony.richness
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

      const timeSinceLastChange = timeRef.current - colorState.lastChangeTime;
      const shouldChangePalette = (
        timeOfDayChanged ||
        timeSinceLastChange > 10 + Math.random() * 5 ||
        (analysis.harmony.complexity > 0.75 && timeSinceLastChange > 5)
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
            spectralCentroid: analysis.pitch.current,
            harmonicRichness: analysis.harmony.richness
          });
          colorState.transitionProgress = 0;
          colorState.lastChangeTime = timeRef.current;
        } catch (err) {
          console.error('Palette generation error:', err);
        }
      }

      // Smooth palette transition
      if (colorState.transitionProgress < 1 && colorState.nextPalette) {
        colorState.transitionProgress += 0.005;
        if (colorState.transitionProgress >= 1) {
          colorState.currentPalette = colorState.nextPalette;
          colorState.nextPalette = null;
        }
      }

      const activePalette = colorState.transitionProgress < 1 && colorState.nextPalette
        ? interpolatePalettes(colorState.currentPalette, colorState.nextPalette, colorState.transitionProgress)
        : colorState.currentPalette;

      // Shape transitions
      const shouldTransition = (
        shapeTransitionTimerRef.current > 4 + Math.random() * 2 ||
        analysis.harmony.complexity > 0.7 ||
        audioData.energy > 0.8
      );

      if (shouldTransition && ball.shapeMorphProgress >= 1) {
        const numShapes = 8;
        let newShape;

        if (audioData.bassIntensity > 0.7) {
          newShape = Math.random() < 0.5 ? 0 : 3;
        } else if (analysis.harmony.complexity > 0.6) {
          newShape = Math.floor(Math.random() * 3) + 4;
        } else if (audioData.highIntensity > 0.6) {
          newShape = Math.random() < 0.5 ? 2 : 6;
        } else {
          newShape = Math.floor(Math.random() * numShapes);
        }

        if (newShape !== ball.targetShapeMode) {
          ball.targetShapeMode = newShape;
          ball.shapeMorphProgress = 0;
          shapeTransitionTimerRef.current = 0;
        }
      }

      if (ball.shapeMode !== ball.targetShapeMode) {
        const morphSpeed = 0.008 + audioData.energy * 0.015 + analysis.harmony.complexity * 0.01;
        ball.shapeMorphProgress += morphSpeed;

        if (ball.shapeMorphProgress >= 1) {
          ball.shapeMode = ball.targetShapeMode;
          ball.shapeMorphProgress = 1;
        }
      }

      ball.energy = Math.max(0, ball.energy - 0.015);

      const energyMultiplier = 1 + audioData.energy * 0.6 + ball.energy * 0.3;
      const pulseMultiplier = 1 + Math.sin(ball.pulsePhase) * ball.energy * 0.12;
      const dynamicsMultiplier = 0.9 + analysis.dynamics.current * 0.3;
      const targetRadius = ball.baseRadius * energyMultiplier * pulseMultiplier * dynamicsMultiplier;

      ball.radius = Math.min(targetRadius, ball.maxRadius);
      ball.pulsePhase += 0.05;

      // Update points
      ball.points.forEach((point, i) => {
        const freqIndex = Math.floor((i / ball.points.length) * bufferLength);
        const freqValue = dataArray[freqIndex] / 255;

        const noiseSpeed = 0.08 + (1 - (analysis.rhythm.consistency || 0.5)) * 0.15;
        const noiseValue = fractalNoise2D(
          Math.cos(point.angle) * 0.5 + timeRef.current * noiseSpeed,
          Math.sin(point.angle) * 0.5 + timeRef.current * noiseSpeed,
          4,
          0.5
        );

        const currentShapeRadius = getShapeRadius(point.angle, ball.shapeMode, ball.radius, point, timeRef.current);
        const targetShapeRadius = getShapeRadius(point.angle, ball.targetShapeMode, ball.radius, point, timeRef.current);

        const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const easedProgress = easeInOutCubic(ball.shapeMorphProgress);
        const morphedShapeRadius = currentShapeRadius + (targetShapeRadius - currentShapeRadius) * easedProgress;

        const freqInfluence = freqValue * 0.25;
        const noiseInfluence = noiseValue * 0.15;
        const harmonyInfluence = analysis.harmony.complexity * 0.2;
        const pitchInfluence = analysis.pitch.velocity * 0.18;

        point.localEnergy += (freqValue - point.localEnergy) * 0.1;
        const localInfluence = point.localEnergy * 0.15;

        const totalInfluence = freqInfluence + noiseInfluence + harmonyInfluence + pitchInfluence + localInfluence;
        const clampedInfluence = Math.max(-ball.sentientBoundary, Math.min(ball.sentientBoundary, totalInfluence));

        point.targetRadius = morphedShapeRadius * (1 + clampedInfluence);

        const responseSpeed = 0.045 + (analysis.timbre.roughness || 0) * 0.055;
        const diff = point.targetRadius - point.radius;
        ball.velocities[i].radial += diff * responseSpeed;
        ball.velocities[i].radial *= 0.87;

        point.radius += ball.velocities[i].radial;

        const rotationSpeed = (analysis.melody.direction || 0) * 0.0004 * (analysis.texture.density || 0.5);
        point.angle += rotationSpeed;
      });

      // Render
      const bgColor = bassToDeepColor(audioData.bassIntensity * 0.5, activePalette);
      ctx.fillStyle = hslToString({ h: bgColor.h, s: bgColor.s, l: Math.max(5, bgColor.l - 35) }, 1);
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer glow
      const outerGlow = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius * 2.5);
      const glowColor = trebleToLightColor(audioData.highIntensity, activePalette);
      const radiantGlow = toRadiantGlow(glowColor, audioData.energy);
      outerGlow.addColorStop(0, hslToString(radiantGlow, 0.25 * audioData.energy));
      outerGlow.addColorStop(0.4, hslToString(glowColor, 0.12 * audioData.energy));
      outerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = outerGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw ball
      ctx.save();
      ctx.translate(ball.x, ball.y);

      ctx.beginPath();
      ball.points.forEach((point, i) => {
        const x = Math.cos(point.angle) * point.radius;
        const y = Math.sin(point.angle) * point.radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevPoint = ball.points[i - 1];
          const prevX = Math.cos(prevPoint.angle) * prevPoint.radius;
          const prevY = Math.sin(prevPoint.angle) * prevPoint.radius;
          const cpX = (prevX + x) / 2;
          const cpY = (prevY + y) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
        }
      });
      ctx.closePath();

      const mainGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, ball.radius);
      const corePosition = 0.2 + (analysis.timbre.brightness || 0.5) * 0.3;
      const midPosition = 0.5 + (analysis.harmony.complexity || 0) * 0.2;
      const edgePosition = 0.8 + audioData.energy * 0.15;

      const coreColor = toLuminous(getColorFromPalette(activePalette, corePosition, audioData.energy), audioData.energy);
      const midColor = getColorFromPalette(activePalette, midPosition, audioData.energy * 0.8);
      const edgeColor = getColorFromPalette(activePalette, edgePosition, audioData.energy * 0.6);

      mainGradient.addColorStop(0, hslToString(coreColor, 0.95));
      mainGradient.addColorStop(0.4, hslToString(midColor, 0.85));
      mainGradient.addColorStop(0.7, hslToString(edgeColor, 0.7));
      mainGradient.addColorStop(1, hslToString(edgeColor, 0.3));

      ctx.fillStyle = mainGradient;
      ctx.fill();

      ctx.strokeStyle = hslToString(coreColor, 0.6);
      ctx.lineWidth = 2 + audioData.energy * 4;
      ctx.stroke();

      ctx.restore();

      // Inner core
      const coreSize = ball.radius * 0.3 * (1 + Math.sin(timeRef.current * 3) * 0.2 * audioData.energy);
      const coreGradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, coreSize);
      const innerCoreColor = toLuminous(getColorFromPalette(activePalette, 0.1, audioData.energy), 1);

      coreGradient.addColorStop(0, hslToString(innerCoreColor, 0.95));
      coreGradient.addColorStop(0.6, hslToString(coreColor, 0.65));
      coreGradient.addColorStop(1, 'transparent');

      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, coreSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      // Rings
      if (audioData.energy > 0.3) {
        const numRings = Math.floor(2 + (analysis.texture.layering || 0) * 3);
        for (let i = 0; i < numRings; i++) {
          const ringRadius = ball.radius * (1.2 + i * 0.3);
          const ringAlpha = (1 - i * 0.3) * audioData.energy * 0.35;
          const ringPosition = 0.3 + i * 0.2;
          const ringColor = getColorFromPalette(activePalette, ringPosition, audioData.energy);

          ctx.strokeStyle = hslToString(ringColor, ringAlpha);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ringRadius + Math.sin(timeRef.current * 2 + i) * 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Particles
      if (audioData.energy > 0.5) {
        const numParticles = Math.floor(audioData.energy * 25);
        for (let i = 0; i < numParticles; i++) {
          const angle = (i / numParticles) * Math.PI * 2;
          const distance = ball.radius * 1.5 + Math.sin(timeRef.current * 3 + i) * ball.radius * 0.5;
          const x = ball.x + Math.cos(angle) * distance;
          const y = ball.y + Math.sin(angle) * distance;

          const particleSize = 2 + audioData.energy * 3;
          const particlePosition = (i / numParticles);
          const particleColor = toLuminous(getColorFromPalette(activePalette, particlePosition, audioData.energy), 0.8);

          ctx.fillStyle = hslToString(particleColor, audioData.energy * 0.6);
          ctx.beginPath();
          ctx.arc(x, y, particleSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
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

export default AudioVisualizerBall;
*/










/*
// src/visualizers/AudioVisualizer-Ball.jsx
// Ball mode with COMPLETE music component analysis
import React, { useEffect, useRef } from 'react';
import {
  generateUniquePalette,
  hslToString,
  bassToDeepColor,
  trebleToLightColor,
  getColorFromPalette,
  toLuminous,
  toRadiantGlow,
  interpolatePalettes
} from '../utils/colorUtils';
import { initNoise, fractalNoise2D } from '../utils/noise';
import { musicAnalyzer } from '../utils/musicAnalysis';

const AudioVisualizerBall = ({ analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const colorStateRef = useRef({
    currentPalette: null,
    nextPalette: null,
    transitionProgress: 1,
    initialized: false,
    lastChangeTime: 0
  });

  const energyBallRef = useRef({
    x: 0,
    y: 0,
    baseRadius: 150,
    maxRadius: 0,
    radius: 150,
    points: [],
    velocities: [],
    energy: 0,
    pulsePhase: 0,
    shapeMode: 0,
    targetShapeMode: 0,
    shapeMorphProgress: 0,
    sentientBoundary: 0.6
  });

  const timeRef = useRef(0);
  const idleTimeRef = useRef(0);
  const shapeTransitionTimerRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      energyBallRef.current.x = canvas.width / 2;
      energyBallRef.current.y = canvas.height / 2;

      const minDimension = Math.min(canvas.width, canvas.height);
      energyBallRef.current.maxRadius = Math.min(minDimension * 0.35, 400);
      energyBallRef.current.baseRadius = energyBallRef.current.maxRadius * 0.7;

      initializeEnergyBall();
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

  const initializeEnergyBall = () => {
    initNoise(Date.now() + Math.random() * 10000);
    const ball = energyBallRef.current;
    const numPoints = 144;

    ball.points = [];
    ball.velocities = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      ball.points.push({
        angle: angle,
        radius: ball.baseRadius,
        targetRadius: ball.baseRadius,
        noiseOffset: Math.random() * 1000,
        shapeInfluence: Math.random(),
        localEnergy: 0
      });
      ball.velocities.push({ radial: 0, angular: 0 });
    }
  };

  const getShapeRadius = (angle, shapeMode, baseRadius, point, t) => {
    switch(shapeMode) {
      case 0: return baseRadius * (1 + Math.sin(t * 2) * 0.05);
      case 1: return baseRadius * (1 + 0.35 * Math.sin(angle * 2 + t * 0.5));
      case 2:
        const starPoints = 5;
        const starAngle = (angle * starPoints) % (Math.PI * 2);
        return baseRadius * (1 + 0.45 * Math.abs(Math.cos(starAngle * 2.5 + t * 0.3)));
      case 3: return baseRadius * (1 + 0.4 * Math.sin(angle * 3 + point.shapeInfluence * Math.PI + t * 0.4));
      case 4: return baseRadius * (1 + 0.5 * Math.abs(Math.sin(angle * 6 + t * 0.6)));
      case 5:
        const hexAngle = Math.floor(angle / (Math.PI / 3)) * (Math.PI / 3);
        return baseRadius * (1 + 0.3 * Math.cos((angle - hexAngle) * 6 + t * 0.3));
      case 6: return baseRadius * (1 + 0.4 * Math.sin(angle * 4 + t * 2));
      case 7: return baseRadius * (1 + 0.35 * Math.sin(angle * 2 - t + point.shapeInfluence * Math.PI));
      default: return baseRadius;
    }
  };

  useEffect(() => {
    if (!analyser || !isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      analyser.getByteFrequencyData(dataArray);
      timeRef.current += 0.016;
      shapeTransitionTimerRef.current += 0.016;

      const colorState = colorStateRef.current;
      const ball = energyBallRef.current;

      // FULL MUSIC ANALYSIS
      const music = musicAnalyzer.analyze(dataArray, bufferLength, timeRef.current);

      // Initialize palette
      if (!colorState.initialized) {
        try {
          colorState.currentPalette = generateUniquePalette({
            bassAvg: music.dynamics.current,
            midAvg: music.melody.centroid,
            highAvg: music.timbre.brightness,
            spectralCentroid: music.pitch.fundamental,
            harmonicRichness: music.harmony.richness
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

      // FORM triggers palette changes
      const timeSinceLastChange = timeRef.current - colorState.lastChangeTime;
      const shouldChangePalette = (
        music.form.transition ||
        timeSinceLastChange > 10 + Math.random() * 5 ||
        (music.harmony.complexity > 0.75 && timeSinceLastChange > 5)
      );

      if (shouldChangePalette && colorState.transitionProgress >= 1) {
        try {
          colorState.nextPalette = generateUniquePalette({
            bassAvg: music.dynamics.current,
            midAvg: music.melody.centroid,
            highAvg: music.timbre.brightness,
            spectralCentroid: music.pitch.fundamental,
            harmonicRichness: music.harmony.richness
          });
          colorState.transitionProgress = 0;
          colorState.lastChangeTime = timeRef.current;
        } catch (err) {
          console.error('Palette error:', err);
        }
      }

      if (colorState.transitionProgress < 1 && colorState.nextPalette) {
        colorState.transitionProgress += 0.005;
        if (colorState.transitionProgress >= 1) {
          colorState.currentPalette = colorState.nextPalette;
          colorState.nextPalette = null;
        }
      }

      const activePalette = colorState.transitionProgress < 1 && colorState.nextPalette
        ? interpolatePalettes(colorState.currentPalette, colorState.nextPalette, colorState.transitionProgress)
        : colorState.currentPalette;

      // SHAPE transitions based on harmony & rhythm
      const shouldTransition = (
        shapeTransitionTimerRef.current > 4 + Math.random() * 2 ||
        music.harmony.complexity > 0.7 ||
        music.rhythm.isBeat && music.dynamics.current > 0.7
      );

      if (shouldTransition && ball.shapeMorphProgress >= 1) {
        let newShape;
        if (music.dynamics.current > 0.7) newShape = Math.random() < 0.5 ? 0 : 3;
        else if (music.harmony.complexity > 0.6) newShape = Math.floor(Math.random() * 3) + 4;
        else if (music.timbre.brightness > 0.6) newShape = Math.random() < 0.5 ? 2 : 6;
        else newShape = Math.floor(Math.random() * 8);

        if (newShape !== ball.targetShapeMode) {
          ball.targetShapeMode = newShape;
          ball.shapeMorphProgress = 0;
          shapeTransitionTimerRef.current = 0;
        }
      }

      if (ball.shapeMode !== ball.targetShapeMode) {
        const morphSpeed = 0.008 + music.dynamics.current * 0.015 + music.harmony.complexity * 0.01;
        ball.shapeMorphProgress += morphSpeed;

        if (ball.shapeMorphProgress >= 1) {
          ball.shapeMode = ball.targetShapeMode;
          ball.shapeMorphProgress = 1;
        }
      }

      // RHYTHM beat detection creates energy bursts
      if (music.rhythm.isBeat) {
        ball.energy = Math.min(2, ball.energy + music.rhythm.strength * 1.2);
        ball.pulsePhase = 0;
      }

      ball.energy = Math.max(0, ball.energy - 0.015);

      // DYNAMICS + TIMBRE affect size
      const energyMultiplier = 1 + music.dynamics.current * 0.6 + ball.energy * 0.3;
      const pulseMultiplier = 1 + Math.sin(ball.pulsePhase) * ball.energy * 0.12;
      const timbreMultiplier = 0.9 + music.timbre.attack * 0.4;
      const targetRadius = ball.baseRadius * energyMultiplier * pulseMultiplier * timbreMultiplier;

      ball.radius = Math.min(targetRadius, ball.maxRadius);
      ball.pulsePhase += 0.05 + music.rhythm.tempo / 1200;

      // Update points
      ball.points.forEach((point, i) => {
        const freqIndex = Math.floor((i / ball.points.length) * bufferLength);
        const freqValue = dataArray[freqIndex] / 255;

        // TEXTURE affects noise characteristics
        const noiseSpeed = 0.08 + music.texture.density * 0.15;
        const noiseValue = fractalNoise2D(
          Math.cos(point.angle) * 0.5 + timeRef.current * noiseSpeed,
          Math.sin(point.angle) * 0.5 + timeRef.current * noiseSpeed,
          4,
          0.5
        );

        const currentShapeRadius = getShapeRadius(point.angle, ball.shapeMode, ball.radius, point, timeRef.current);
        const targetShapeRadius = getShapeRadius(point.angle, ball.targetShapeMode, ball.radius, point, timeRef.current);

        const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const easedProgress = easeInOutCubic(ball.shapeMorphProgress);
        const morphedShapeRadius = currentShapeRadius + (targetShapeRadius - currentShapeRadius) * easedProgress;

        // Multiple music components affect deformation
        const freqInfluence = freqValue * 0.25;
        const noiseInfluence = noiseValue * 0.15;
        const harmonyInfluence = music.harmony.complexity * 0.2;
        const pitchInfluence = music.pitch.movement * 0.18;
        const melodyInfluence = Math.abs(music.melody.direction) * music.melody.smoothness * 0.15;

        point.localEnergy += (freqValue - point.localEnergy) * 0.1;
        const localInfluence = point.localEnergy * 0.15;

        const totalInfluence = freqInfluence + noiseInfluence + harmonyInfluence + pitchInfluence + melodyInfluence + localInfluence;
        const clampedInfluence = Math.max(-ball.sentientBoundary, Math.min(ball.sentientBoundary, totalInfluence));

        point.targetRadius = morphedShapeRadius * (1 + clampedInfluence);

        // TIMBRE roughness affects response speed
        const responseSpeed = 0.045 + music.timbre.roughness * 0.055;
        const diff = point.targetRadius - point.radius;
        ball.velocities[i].radial += diff * responseSpeed;
        ball.velocities[i].radial *= 0.87;

        point.radius += ball.velocities[i].radial;

        // MELODY direction affects rotation
        const rotationSpeed = music.melody.direction * 0.0004 * music.texture.density;
        point.angle += rotationSpeed;
      });

      // Render
      const bgColor = bassToDeepColor(music.dynamics.current * 0.5, activePalette);
      ctx.fillStyle = hslToString({ h: bgColor.h, s: bgColor.s, l: Math.max(5, bgColor.l - 35) }, 1);
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer glow
      const outerGlow = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius * 2.5);
      const glowColor = trebleToLightColor(music.timbre.brightness, activePalette);
      const radiantGlow = toRadiantGlow(glowColor, music.dynamics.current);
      outerGlow.addColorStop(0, hslToString(radiantGlow, 0.25 * music.dynamics.current));
      outerGlow.addColorStop(0.4, hslToString(glowColor, 0.12 * music.dynamics.current));
      outerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = outerGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw ball
      ctx.save();
      ctx.translate(ball.x, ball.y);

      ctx.beginPath();
      ball.points.forEach((point, i) => {
        const x = Math.cos(point.angle) * point.radius;
        const y = Math.sin(point.angle) * point.radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevPoint = ball.points[i - 1];
          const prevX = Math.cos(prevPoint.angle) * prevPoint.radius;
          const prevY = Math.sin(prevPoint.angle) * prevPoint.radius;
          const cpX = (prevX + x) / 2;
          const cpY = (prevY + y) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
        }
      });
      ctx.closePath();

      const mainGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, ball.radius);
      const corePosition = 0.2 + music.timbre.brightness * 0.3;
      const midPosition = 0.5 + music.harmony.complexity * 0.2;
      const edgePosition = 0.8 + music.dynamics.current * 0.15;

      const coreColor = toLuminous(getColorFromPalette(activePalette, corePosition, music.dynamics.current), music.dynamics.current);
      const midColor = getColorFromPalette(activePalette, midPosition, music.dynamics.current * 0.8);
      const edgeColor = getColorFromPalette(activePalette, edgePosition, music.dynamics.current * 0.6);

      mainGradient.addColorStop(0, hslToString(coreColor, 0.95));
      mainGradient.addColorStop(0.4, hslToString(midColor, 0.85));
      mainGradient.addColorStop(0.7, hslToString(edgeColor, 0.7));
      mainGradient.addColorStop(1, hslToString(edgeColor, 0.3));

      ctx.fillStyle = mainGradient;
      ctx.fill();

      ctx.strokeStyle = hslToString(coreColor, 0.6);
      ctx.lineWidth = 2 + music.dynamics.current * 4;
      ctx.stroke();

      ctx.restore();

      // Inner core pulse
      const coreSize = ball.radius * 0.3 * (1 + Math.sin(timeRef.current * 3) * 0.2 * music.dynamics.current);
      const coreGradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, coreSize);
      const innerCoreColor = toLuminous(getColorFromPalette(activePalette, 0.1, music.dynamics.current), 1);

      coreGradient.addColorStop(0, hslToString(innerCoreColor, 0.95));
      coreGradient.addColorStop(0.6, hslToString(coreColor, 0.65));
      coreGradient.addColorStop(1, 'transparent');

      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, coreSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      // TEXTURE layering = rings
      if (music.dynamics.current > 0.3) {
        const numRings = Math.floor(2 + music.texture.layering * 3);
        for (let i = 0; i < numRings; i++) {
          const ringRadius = ball.radius * (1.2 + i * 0.3);
          const ringAlpha = (1 - i * 0.3) * music.dynamics.current * 0.35;
          const ringPosition = 0.3 + i * 0.2;
          const ringColor = getColorFromPalette(activePalette, ringPosition, music.dynamics.current);

          ctx.strokeStyle = hslToString(ringColor, ringAlpha);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ringRadius + Math.sin(timeRef.current * 2 + i) * 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // MELODY smoothness = particles
      if (music.dynamics.current > 0.5) {
        const numParticles = Math.floor(music.dynamics.current * 25);
        for (let i = 0; i < numParticles; i++) {
          const angle = (i / numParticles) * Math.PI * 2;
          const distance = ball.radius * (1.5 + music.melody.smoothness * 0.5) + Math.sin(timeRef.current * 3 + i) * ball.radius * 0.5;
          const x = ball.x + Math.cos(angle) * distance;
          const y = ball.y + Math.sin(angle) * distance;

          const particleSize = 2 + music.dynamics.current * 3;
          const particlePosition = (i / numParticles);
          const particleColor = toLuminous(getColorFromPalette(activePalette, particlePosition, music.dynamics.current), 0.8);

          ctx.fillStyle = hslToString(particleColor, music.dynamics.current * 0.6);
          ctx.beginPath();
          ctx.arc(x, y, particleSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
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

export default AudioVisualizerBall;
*/















import React, { useEffect, useRef } from 'react';
import {
  generateUniquePalette,
  hslToString,
  bassToDeepColor,
  trebleToLightColor,
  getColorFromPalette,
  toLuminous,
  toRadiantGlow,
  interpolatePalettes
} from '../utils/colorUtils';
import { initNoise, fractalNoise2D } from '../utils/noise';
import { musicAnalyzer } from '../utils/musicAnalysis';

const AudioVisualizerBall = ({ analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const colorStateRef = useRef({
    currentPalette: null,
    nextPalette: null,
    transitionProgress: 1,
    initialized: false,
    lastChangeTime: 0
  });

  const energyBallRef = useRef({
    x: 0,
    y: 0,
    baseRadius: 150,
    maxRadius: 0,
    radius: 150,
    points: [],
    velocities: [],
    energy: 0,
    pulsePhase: 0,
    shapeMode: 0,
    targetShapeMode: 0,
    shapeMorphProgress: 0,
    sentientBoundary: 0.6
  });

  const timeRef = useRef(0);
  const shapeTransitionTimerRef = useRef(0);

  const initializeEnergyBall = () => {
    initNoise(Date.now() + Math.random() * 10000);
    const ball = energyBallRef.current;
    const numPoints = 144;
    ball.points = [];
    ball.velocities = [];
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      ball.points.push({
        angle: angle,
        radius: ball.baseRadius,
        targetRadius: ball.baseRadius,
        noiseOffset: Math.random() * 1000,
        shapeInfluence: Math.random(),
        localEnergy: 0
      });
      ball.velocities.push({ radial: 0, angular: 0 });
    }
  };

  const getShapeRadius = (angle, shapeMode, baseRadius, point, t) => {
    switch(shapeMode) {
      case 0: return baseRadius * (1 + Math.sin(t * 2) * 0.05);
      case 1: return baseRadius * (1 + 0.35 * Math.sin(angle * 2 + t * 0.5));
      case 2:
        const starPoints = 5;
        const starAngle = (angle * starPoints) % (Math.PI * 2);
        return baseRadius * (1 + 0.45 * Math.abs(Math.cos(starAngle * 2.5 + t * 0.3)));
      case 3: return baseRadius * (1 + 0.4 * Math.sin(angle * 3 + point.shapeInfluence * Math.PI + t * 0.4));
      case 4: return baseRadius * (1 + 0.5 * Math.abs(Math.sin(angle * 6 + t * 0.6)));
      case 5:
        const hexAngle = Math.floor(angle / (Math.PI / 3)) * (Math.PI / 3);
        return baseRadius * (1 + 0.3 * Math.cos((angle - hexAngle) * 6 + t * 0.3));
      case 6: return baseRadius * (1 + 0.4 * Math.sin(angle * 4 + t * 2));
      case 7: return baseRadius * (1 + 0.35 * Math.sin(angle * 2 - t + point.shapeInfluence * Math.PI));
      default: return baseRadius;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      energyBallRef.current.x = canvas.width / 2;
      energyBallRef.current.y = canvas.height / 2;
      const minDimension = Math.min(canvas.width, canvas.height);
      energyBallRef.current.maxRadius = Math.min(minDimension * 0.35, 400);
      energyBallRef.current.baseRadius = energyBallRef.current.maxRadius * 0.7;
      initializeEnergyBall();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      // --- IDLE DATA GENERATOR ---
      let bufferLength = 128;
      let dataArray = new Uint8Array(bufferLength);

      if (isPlaying && analyser) {
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
      } else {
        // Create a faint "breathing" movement for idle mode
        const idlePulse = (Math.sin(Date.now() * 0.001) + 1) * 15;
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = idlePulse + (Math.random() * 2);
        }
      }

      timeRef.current += 0.016;
      shapeTransitionTimerRef.current += 0.016;

      const colorState = colorStateRef.current;
      const ball = energyBallRef.current;

      const music = musicAnalyzer.analyze(dataArray, bufferLength, timeRef.current);

      // --- START ORIGINAL RENDERING LOGIC ---
      if (!colorState.initialized) {
        try {
          colorState.currentPalette = generateUniquePalette({
            bassAvg: music.dynamics.current,
            midAvg: music.melody.centroid,
            highAvg: music.timbre.brightness,
            spectralCentroid: music.pitch.fundamental,
            harmonicRichness: music.harmony.richness
          });
          colorState.transitionProgress = 1;
          colorState.lastChangeTime = timeRef.current;
          colorState.initialized = true;
        } catch (err) {
          colorState.currentPalette = { colors: [{ h: 200, s: 70, l: 60 }], baseHue: 200, type: 'fallback' };
          colorState.initialized = true;
        }
      }

      const timeSinceLastChange = timeRef.current - colorState.lastChangeTime;
      const shouldChangePalette = (music.form.transition || timeSinceLastChange > 10 + Math.random() * 5 || (music.harmony.complexity > 0.75 && timeSinceLastChange > 5));

      if (shouldChangePalette && colorState.transitionProgress >= 1) {
        try {
          colorState.nextPalette = generateUniquePalette({
            bassAvg: music.dynamics.current, midAvg: music.melody.centroid, highAvg: music.timbre.brightness, spectralCentroid: music.pitch.fundamental, harmonicRichness: music.harmony.richness
          });
          colorState.transitionProgress = 0;
          colorState.lastChangeTime = timeRef.current;
        } catch (err) { console.error('Palette error:', err); }
      }

      if (colorState.transitionProgress < 1 && colorState.nextPalette) {
        colorState.transitionProgress += 0.005;
        if (colorState.transitionProgress >= 1) {
          colorState.currentPalette = colorState.nextPalette;
          colorState.nextPalette = null;
        }
      }

      const activePalette = colorState.transitionProgress < 1 && colorState.nextPalette
        ? interpolatePalettes(colorState.currentPalette, colorState.nextPalette, colorState.transitionProgress)
        : colorState.currentPalette;

      const shouldTransition = (shapeTransitionTimerRef.current > 4 + Math.random() * 2 || music.harmony.complexity > 0.7 || (music.rhythm.isBeat && music.dynamics.current > 0.7));

      if (shouldTransition && ball.shapeMorphProgress >= 1) {
        let newShape;
        if (music.dynamics.current > 0.7) newShape = Math.random() < 0.5 ? 0 : 3;
        else if (music.harmony.complexity > 0.6) newShape = Math.floor(Math.random() * 3) + 4;
        else if (music.timbre.brightness > 0.6) newShape = Math.random() < 0.5 ? 2 : 6;
        else newShape = Math.floor(Math.random() * 8);

        if (newShape !== ball.targetShapeMode) {
          ball.targetShapeMode = newShape;
          ball.shapeMorphProgress = 0;
          shapeTransitionTimerRef.current = 0;
        }
      }

      if (ball.shapeMode !== ball.targetShapeMode) {
        const morphSpeed = 0.008 + music.dynamics.current * 0.015 + music.harmony.complexity * 0.01;
        ball.shapeMorphProgress += morphSpeed;
        if (ball.shapeMorphProgress >= 1) {
          ball.shapeMode = ball.targetShapeMode;
          ball.shapeMorphProgress = 1;
        }
      }

      if (music.rhythm.isBeat) {
        ball.energy = Math.min(2, ball.energy + music.rhythm.strength * 1.2);
        ball.pulsePhase = 0;
      }
      ball.energy = Math.max(0, ball.energy - 0.015);

      const energyMultiplier = 1 + music.dynamics.current * 0.6 + ball.energy * 0.3;
      const pulseMultiplier = 1 + Math.sin(ball.pulsePhase) * ball.energy * 0.12;
      const timbreMultiplier = 0.9 + music.timbre.attack * 0.4;
      const targetRadius = ball.baseRadius * energyMultiplier * pulseMultiplier * timbreMultiplier;
      ball.radius = Math.min(targetRadius, ball.maxRadius);
      ball.pulsePhase += 0.05 + music.rhythm.tempo / 1200;

      ball.points.forEach((point, i) => {
        const freqIndex = Math.floor((i / ball.points.length) * bufferLength);
        const freqValue = dataArray[freqIndex] / 255;
        const noiseSpeed = 0.08 + music.texture.density * 0.15;
        const noiseValue = fractalNoise2D(Math.cos(point.angle) * 0.5 + timeRef.current * noiseSpeed, Math.sin(point.angle) * 0.5 + timeRef.current * noiseSpeed, 4, 0.5);
        const currentShapeRadius = getShapeRadius(point.angle, ball.shapeMode, ball.radius, point, timeRef.current);
        const targetShapeRadius = getShapeRadius(point.angle, ball.targetShapeMode, ball.radius, point, timeRef.current);
        const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const easedProgress = easeInOutCubic(ball.shapeMorphProgress);
        const morphedShapeRadius = currentShapeRadius + (targetShapeRadius - currentShapeRadius) * easedProgress;
        const totalInfluence = (freqValue * 0.25) + (noiseValue * 0.15) + (music.harmony.complexity * 0.2) + (music.pitch.movement * 0.18) + (Math.abs(music.melody.direction) * music.melody.smoothness * 0.15) + (point.localEnergy * 0.15);
        point.localEnergy += (freqValue - point.localEnergy) * 0.1;
        point.targetRadius = morphedShapeRadius * (1 + Math.max(-ball.sentientBoundary, Math.min(ball.sentientBoundary, totalInfluence)));
        const responseSpeed = 0.045 + music.timbre.roughness * 0.055;
        ball.velocities[i].radial += (point.targetRadius - point.radius) * responseSpeed;
        ball.velocities[i].radial *= 0.87;
        point.radius += ball.velocities[i].radial;
        point.angle += music.melody.direction * 0.0004 * music.texture.density;
      });

      // --- DRAWING ---
      const bgColor = bassToDeepColor(music.dynamics.current * 0.5, activePalette);
      ctx.fillStyle = hslToString({ h: bgColor.h, s: bgColor.s, l: Math.max(5, bgColor.l - 35) }, 1);
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const outerGlow = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius * 2.5);
      const glowColor = trebleToLightColor(music.timbre.brightness, activePalette);
      const radiantGlow = toRadiantGlow(glowColor, music.dynamics.current);
      outerGlow.addColorStop(0, hslToString(radiantGlow, 0.25 * music.dynamics.current));
      outerGlow.addColorStop(0.4, hslToString(glowColor, 0.12 * music.dynamics.current));
      outerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = outerGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.beginPath();
      ball.points.forEach((point, i) => {
        const x = Math.cos(point.angle) * point.radius;
        const y = Math.sin(point.angle) * point.radius;
        if (i === 0) ctx.moveTo(x, y);
        else {
          const prev = ball.points[i-1];
          const prevX = Math.cos(prev.angle) * prev.radius;
          const prevY = Math.sin(prev.angle) * prev.radius;
          ctx.quadraticCurveTo(prevX, prevY, (prevX + x) / 2, (prevY + y) / 2);
        }
      });
      ctx.closePath();

      const mainGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, ball.radius);
      const coreColor = toLuminous(getColorFromPalette(activePalette, 0.2 + music.timbre.brightness * 0.3, music.dynamics.current), music.dynamics.current);
      mainGradient.addColorStop(0, hslToString(coreColor, 0.95));
      mainGradient.addColorStop(0.4, hslToString(getColorFromPalette(activePalette, 0.5 + music.harmony.complexity * 0.2, music.dynamics.current * 0.8), 0.85));
      mainGradient.addColorStop(1, hslToString(getColorFromPalette(activePalette, 0.8 + music.dynamics.current * 0.15, music.dynamics.current * 0.6), 0.3));
      ctx.fillStyle = mainGradient;
      ctx.fill();
      ctx.strokeStyle = hslToString(coreColor, 0.6);
      ctx.lineWidth = 2 + music.dynamics.current * 4;
      ctx.stroke();
      ctx.restore();

      const coreSize = ball.radius * 0.3 * (1 + Math.sin(timeRef.current * 3) * 0.2 * music.dynamics.current);
      const coreGradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, coreSize);
      coreGradient.addColorStop(0, hslToString(toLuminous(getColorFromPalette(activePalette, 0.1, music.dynamics.current), 1), 0.95));
      coreGradient.addColorStop(1, 'transparent');
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = coreGradient;
      ctx.beginPath(); ctx.arc(ball.x, ball.y, coreSize, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      if (music.dynamics.current > 0.3) {
        for (let i = 0; i < Math.floor(2 + music.texture.layering * 3); i++) {
          ctx.strokeStyle = hslToString(getColorFromPalette(activePalette, 0.3 + i * 0.2, music.dynamics.current), (1 - i * 0.3) * music.dynamics.current * 0.35);
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius * (1.2 + i * 0.3) + Math.sin(timeRef.current * 2 + i) * 10, 0, Math.PI * 2); ctx.stroke();
        }
      }

      if (music.dynamics.current > 0.5) {
        const numParticles = Math.floor(music.dynamics.current * 25);
        for (let i = 0; i < numParticles; i++) {
          const angle = (i / numParticles) * Math.PI * 2;
          const distance = ball.radius * (1.5 + music.melody.smoothness * 0.5) + Math.sin(timeRef.current * 3 + i) * ball.radius * 0.5;
          ctx.fillStyle = hslToString(toLuminous(getColorFromPalette(activePalette, i / numParticles, music.dynamics.current), 0.8), music.dynamics.current * 0.6);
          ctx.beginPath(); ctx.arc(ball.x + Math.cos(angle) * distance, ball.y + Math.sin(angle) * distance, 2 + music.dynamics.current * 3, 0, Math.PI * 2); ctx.fill();
        }
      }
    };

    animate();
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isPlaying]);

  return <canvas ref={canvasRef} className="visualizer-canvas" />;
};

export default AudioVisualizerBall;
