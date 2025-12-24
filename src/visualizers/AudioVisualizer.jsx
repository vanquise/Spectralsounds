
/*
import React, { useEffect, useRef } from 'react';

const AudioVisualizer = ({ analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const blobsRef = useRef([]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
    if (!analyser || !isPlaying) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Initialize blobs
    if (blobsRef.current.length === 0) {
      for (let i = 0; i < 15; i++) {
        blobsRef.current.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          baseRadius: 100 + Math.random() * 250,
          radius: 100 + Math.random() * 250,
          frequencyBand: i / 15,
          phase: Math.random() * Math.PI * 2,
          energy: 0,
          targetEnergy: 0,
          colorOffset: (i / 15) * 360
        });
      }
    }

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      analyser.getByteFrequencyData(dataArray);

      // Background
      ctx.fillStyle = `hsla(${Math.random() * 360}, 40%, 20%, 0.1)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      blobsRef.current.forEach(blob => {
        const freqIndex = Math.floor(blob.frequencyBand * bufferLength);
        const blobFreq = dataArray[freqIndex] / 255;
        blob.vx += (Math.random() - 0.5) * 0.5;
        blob.vy += (Math.random() - 0.5) * 0.5;
        blob.x += blob.vx;
        blob.y += blob.vy;

        // Wrap around
        if (blob.x < -blob.radius) blob.x = canvas.width + blob.radius;
        if (blob.x > canvas.width + blob.radius) blob.x = -blob.radius;
        if (blob.y < -blob.radius) blob.y = canvas.height + blob.radius;
        if (blob.y > canvas.height + blob.radius) blob.y = -blob.radius;

        blob.targetEnergy = blobFreq * 2;
        blob.energy += (blob.targetEnergy - blob.energy) * 0.15;
        blob.radius = blob.baseRadius * (0.6 + blob.energy);

        // Color
        const hue = (blob.colorOffset + blobFreq * 60) % 360;
        const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
        gradient.addColorStop(0, `hsla(${hue}, 70%, 50%, 0.6)`);
        gradient.addColorStop(1, `hsla(${hue}, 50%, 40%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, [analyser, isPlaying]);

  return <canvas ref={canvasRef} className="visualizer-canvas" />;
};

export default AudioVisualizer;
*/

/*
import React, { useEffect, useRef } from 'react';
import { generateUniquePalette, hslToString, bassToDeepColor, trebleToLightColor, getColorFromPalette, toLuminous, toRadiantGlow } from './utils/colorUtils';
import { initNoise, fractalNoise2D } from './utils/noise';

const AudioVisualizer = ({ analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const colorStateRef = useRef({
    palette: null,
    baseHue: Math.random() * 360,
    energy: 0,
    bassIntensity: 0,
    midIntensity: 0,
    highIntensity: 0,
    spectralCentroid: 0,
    harmonicRichness: 0,
    initialized: false
  });

  const energyBallRef = useRef({
    x: 0,
    y: 0,
    baseRadius: 150,
    radius: 150,
    points: [],
    velocities: [],
    energy: 0,
    pulsePhase: 0
  });

  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Center the energy ball
      energyBallRef.current.x = canvas.width / 2;
      energyBallRef.current.y = canvas.height / 2;
      energyBallRef.current.baseRadius = Math.min(canvas.width, canvas.height) * 0.25;

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
    // Initialize noise with unique seed
    initNoise(Date.now() + Math.random() * 10000);

    const ball = energyBallRef.current;
    const numPoints = 64; // More points for smoother morphing

    ball.points = [];
    ball.velocities = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      ball.points.push({
        angle: angle,
        radius: ball.baseRadius,
        targetRadius: ball.baseRadius,
        noiseOffset: Math.random() * 1000
      });
      ball.velocities.push({
        radial: 0,
        angular: 0
      });
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

    let prevBass = 0;
    let beatCount = 0;

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      analyser.getByteFrequencyData(dataArray);
      timeRef.current += 0.016; // ~60fps

      const state = colorStateRef.current;
      const ball = energyBallRef.current;

      // Analyze audio in detail
      const bassRange = Math.floor(bufferLength * 0.08);
      const lowMidRange = Math.floor(bufferLength * 0.25);
      const midRange = Math.floor(bufferLength * 0.5);
      const highMidRange = Math.floor(bufferLength * 0.7);

      const bass = dataArray.slice(0, bassRange).reduce((a, b) => a + b, 0) / bassRange;
      const lowMid = dataArray.slice(bassRange, lowMidRange).reduce((a, b) => a + b, 0) / (lowMidRange - bassRange);
      const mid = dataArray.slice(lowMidRange, midRange).reduce((a, b) => a + b, 0) / (midRange - lowMidRange);
      const highMid = dataArray.slice(midRange, highMidRange).reduce((a, b) => a + b, 0) / (highMidRange - midRange);
      const high = dataArray.slice(highMidRange).reduce((a, b) => a + b, 0) / (bufferLength - highMidRange);
      const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;

      // Beat detection for pulse
      if (bass > prevBass + 30 && bass > 100) {
        beatCount++;
        ball.energy = Math.min(2, ball.energy + 0.8);
        ball.pulsePhase = 0;
      }
      prevBass = bass;

      // Calculate spectral characteristics
      let weightedSum = 0;
      let totalWeight = 0;
      dataArray.forEach((value, index) => {
        weightedSum += value * index;
        totalWeight += value;
      });
      state.spectralCentroid = totalWeight > 0 ? (weightedSum / totalWeight) / bufferLength : 0.5;

      const activeFreqs = dataArray.filter(v => v > 10).length;
      state.harmonicRichness = activeFreqs / bufferLength;

      state.energy = avg / 255;
      state.bassIntensity = bass / 255;
      state.midIntensity = mid / 255;
      state.highIntensity = high / 255;

      // Generate unique palette on first frame
      if (!state.initialized) {
        state.palette = generateUniquePalette({
          bassAvg: state.bassIntensity,
          midAvg: state.midIntensity,
          highAvg: state.highIntensity,
          spectralCentroid: state.spectralCentroid,
          harmonicRichness: state.harmonicRichness
        });
        state.initialized = true;
      }

      // Energy decay
      ball.energy = Math.max(0, ball.energy - 0.02);
      ball.pulsePhase += 0.05;

      // Dynamic radius based on overall energy
      const energyMultiplier = 1 + state.energy * 0.6 + ball.energy * 0.4;
      const pulseMultiplier = 1 + Math.sin(ball.pulsePhase) * ball.energy * 0.15;
      ball.radius = ball.baseRadius * energyMultiplier * pulseMultiplier;

      // Update each point for organic morphing
      ball.points.forEach((point, i) => {
        // Get frequency data for this point
        const freqIndex = Math.floor((i / ball.points.length) * bufferLength);
        const freqValue = dataArray[freqIndex] / 255;

        // Fractal noise for organic movement
        const noiseValue = fractalNoise2D(
          Math.cos(point.angle) * 0.5 + timeRef.current * 0.15,
          Math.sin(point.angle) * 0.5 + timeRef.current * 0.15,
          4,
          0.5
        );

        // Target radius influenced by frequency and noise
        const freqInfluence = freqValue * 0.4;
        const noiseInfluence = noiseValue * 0.25;
        const bassInfluence = state.bassIntensity * 0.3;
        const harmonicInfluence = state.harmonicRichness * 0.2;

        point.targetRadius = ball.radius * (1 + freqInfluence + noiseInfluence + bassInfluence - harmonicInfluence);

        // Smooth interpolation to target
        const diff = point.targetRadius - point.radius;
        ball.velocities[i].radial += diff * 0.05;
        ball.velocities[i].radial *= 0.85; // Damping

        point.radius += ball.velocities[i].radial;

        // Slight angular rotation for swirling effect
        const rotationSpeed = state.midIntensity * 0.002;
        point.angle += rotationSpeed;
      });

      // Clear canvas with dark background
      const bgColor = bassToDeepColor(state.bassIntensity * 0.5, state.palette.baseHue);
      ctx.fillStyle = hslToString({ h: bgColor.h, s: bgColor.s, l: Math.max(5, bgColor.l - 35) }, 1);
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw energy ball with multiple layers

      // Layer 1: Outer glow
      const outerGlow = ctx.createRadialGradient(
        ball.x, ball.y, 0,
        ball.x, ball.y, ball.radius * 2.5
      );

      const glowColor = trebleToLightColor(state.highIntensity, state.palette.baseHue);
      outerGlow.addColorStop(0, hslToString(glowColor, 0.2 * state.energy));
      outerGlow.addColorStop(0.4, hslToString(glowColor, 0.1 * state.energy));
      outerGlow.addColorStop(1, 'transparent');

      ctx.fillStyle = outerGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Layer 2: Main energy ball with morphing shape
      ctx.save();
      ctx.translate(ball.x, ball.y);

      // Create morphing path
      ctx.beginPath();
      ball.points.forEach((point, i) => {
        const x = Math.cos(point.angle) * point.radius;
        const y = Math.sin(point.angle) * point.radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          // Smooth curves between points
          const prevPoint = ball.points[i - 1];
          const prevX = Math.cos(prevPoint.angle) * prevPoint.radius;
          const prevY = Math.sin(prevPoint.angle) * prevPoint.radius;

          const cpX = (prevX + x) / 2;
          const cpY = (prevY + y) / 2;

          ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
        }
      });
      ctx.closePath();

      // Fill with gradient
      const mainGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, ball.radius);

      const coreColor = {
        h: (state.palette.baseHue + state.bassIntensity * 30) % 360,
        s: 85 + state.energy * 15,
        l: 65 + state.highIntensity * 15
      };

      const midColor = {
        h: (state.palette.baseHue + 30) % 360,
        s: 75,
        l: 55
      };

      const edgeColor = {
        h: (state.palette.baseHue - 20 + 360) % 360,
        s: 70 - state.highIntensity * 20,
        l: 35 + state.bassIntensity * 15
      };

      mainGradient.addColorStop(0, hslToString(coreColor, 0.95));
      mainGradient.addColorStop(0.4, hslToString(midColor, 0.85));
      mainGradient.addColorStop(0.7, hslToString(edgeColor, 0.7));
      mainGradient.addColorStop(1, hslToString(edgeColor, 0.3));

      ctx.fillStyle = mainGradient;
      ctx.fill();

      // Add subtle glow edge
      ctx.strokeStyle = hslToString(coreColor, 0.6);
      ctx.lineWidth = 3 + state.energy * 5;
      ctx.stroke();

      ctx.restore();

      // Layer 3: Inner core pulse
      const coreSize = ball.radius * 0.3 * (1 + Math.sin(timeRef.current * 3) * 0.2 * state.energy);
      const coreGradient = ctx.createRadialGradient(
        ball.x, ball.y, 0,
        ball.x, ball.y, coreSize
      );

      const innerCore = {
        h: (state.palette.baseHue + 60) % 360,
        s: 95,
        l: 85
      };

      coreGradient.addColorStop(0, hslToString(innerCore, 0.9));
      coreGradient.addColorStop(0.6, hslToString(coreColor, 0.6));
      coreGradient.addColorStop(1, 'transparent');

      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, coreSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      // Layer 4: Frequency rings (subtle)
      if (state.energy > 0.3) {
        for (let i = 0; i < 3; i++) {
          const ringRadius = ball.radius * (1.2 + i * 0.3);
          const ringAlpha = (1 - i * 0.3) * state.energy * 0.3;

          ctx.strokeStyle = hslToString({
            h: (state.palette.baseHue + i * 15) % 360,
            s: 70,
            l: 60
          }, ringAlpha);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ringRadius + Math.sin(timeRef.current * 2 + i) * 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Layer 5: Particles emanating from ball
      if (state.energy > 0.5) {
        const numParticles = Math.floor(state.energy * 20);
        for (let i = 0; i < numParticles; i++) {
          const angle = (i / numParticles) * Math.PI * 2;
          const distance = ball.radius * 1.5 + Math.sin(timeRef.current * 3 + i) * ball.radius * 0.5;
          const x = ball.x + Math.cos(angle) * distance;
          const y = ball.y + Math.sin(angle) * distance;

          const particleSize = 2 + state.energy * 4;
          const particleColor = {
            h: (state.palette.baseHue + i * 5) % 360,
            s: 80,
            l: 70
          };

          ctx.fillStyle = hslToString(particleColor, state.energy * 0.5);
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

export default AudioVisualizer;
*/
/*
import React, { useEffect, useRef } from 'react';
import { generateUniquePalette, hslToString, bassToDeepColor, trebleToLightColor, getColorFromPalette, toLuminous, toRadiantGlow } from './utils/colorUtils';
import { initNoise, fractalNoise2D } from './utils/noise';

const AudioVisualizer = ({ analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const colorStateRef = useRef({
    palette: null,
    baseHue: Math.random() * 360,
    energy: 0,
    bassIntensity: 0,
    midIntensity: 0,
    highIntensity: 0,
    spectralCentroid: 0,
    harmonicRichness: 0,
    initialized: false
  });

  const energyBallRef = useRef({
    x: 0,
    y: 0,
    baseRadius: 150,
    radius: 150,
    points: [],
    velocities: [],
    energy: 0,
    pulsePhase: 0,
    shapeMode: 0, // 0=circle, 1=oval, 2=star, 3=organic blob
    targetShapeMode: 0,
    shapeMorphProgress: 0
  });

  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      energyBallRef.current.x = canvas.width / 2;
      energyBallRef.current.y = canvas.height / 2;
      energyBallRef.current.baseRadius = Math.min(canvas.width, canvas.height) * 0.25;

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
    const numPoints = 96; // More points for smoother, more varied shapes

    ball.points = [];
    ball.velocities = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      ball.points.push({
        angle: angle,
        radius: ball.baseRadius,
        targetRadius: ball.baseRadius,
        noiseOffset: Math.random() * 1000,
        shapeInfluence: Math.random()
      });
      ball.velocities.push({
        radial: 0,
        angular: 0
      });
    }
  };

  // Calculate target shape based on mode
  const getShapeRadius = (angle, shapeMode, baseRadius, point) => {
    switch(shapeMode) {
      case 0: // Circle
        return baseRadius;

      case 1: // Oval
        return baseRadius * (1 + 0.3 * Math.sin(angle * 2));

      case 2: // Star (5-pointed)
        const starPoints = 5;
        const starAngle = (angle * starPoints) % (Math.PI * 2);
        return baseRadius * (1 + 0.4 * Math.abs(Math.cos(starAngle * 2.5)));

      case 3: // Organic blob
        return baseRadius * (1 + 0.35 * Math.sin(angle * 3 + point.shapeInfluence * Math.PI));

      default:
        return baseRadius;
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

    let prevBass = 0;
    let beatCount = 0;

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      analyser.getByteFrequencyData(dataArray);
      timeRef.current += 0.016;

      const state = colorStateRef.current;
      const ball = energyBallRef.current;

      const bassRange = Math.floor(bufferLength * 0.08);
      const lowMidRange = Math.floor(bufferLength * 0.25);
      const midRange = Math.floor(bufferLength * 0.5);
      const highMidRange = Math.floor(bufferLength * 0.7);

      const bass = dataArray.slice(0, bassRange).reduce((a, b) => a + b, 0) / bassRange;
      const lowMid = dataArray.slice(bassRange, lowMidRange).reduce((a, b) => a + b, 0) / (lowMidRange - bassRange);
      const mid = dataArray.slice(lowMidRange, midRange).reduce((a, b) => a + b, 0) / (midRange - lowMidRange);
      const highMid = dataArray.slice(midRange, highMidRange).reduce((a, b) => a + b, 0) / (highMidRange - midRange);
      const high = dataArray.slice(highMidRange).reduce((a, b) => a + b, 0) / (bufferLength - highMidRange);
      const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;

      // Beat detection with shape changes
      if (bass > prevBass + 30 && bass > 100) {
        beatCount++;
        ball.energy = Math.min(2, ball.energy + 0.8);
        ball.pulsePhase = 0;

        // Every 8 beats, transition to new shape
        if (beatCount % 8 === 0) {
          ball.targetShapeMode = Math.floor(Math.random() * 4);
          ball.shapeMorphProgress = 0;
        }
      }
      prevBass = bass;

      // Shape morphing
      if (ball.shapeMode !== ball.targetShapeMode) {
        ball.shapeMorphProgress += 0.02;
        if (ball.shapeMorphProgress >= 1) {
          ball.shapeMode = ball.targetShapeMode;
          ball.shapeMorphProgress = 0;
        }
      }

      let weightedSum = 0;
      let totalWeight = 0;
      dataArray.forEach((value, index) => {
        weightedSum += value * index;
        totalWeight += value;
      });
      state.spectralCentroid = totalWeight > 0 ? (weightedSum / totalWeight) / bufferLength : 0.5;

      const activeFreqs = dataArray.filter(v => v > 10).length;
      state.harmonicRichness = activeFreqs / bufferLength;

      state.energy = avg / 255;
      state.bassIntensity = bass / 255;
      state.midIntensity = mid / 255;
      state.highIntensity = high / 255;

      if (!state.initialized) {
        try {
          state.palette = generateUniquePalette({
            bassAvg: state.bassIntensity,
            midAvg: state.midIntensity,
            highAvg: state.highIntensity,
            spectralCentroid: state.spectralCentroid,
            harmonicRichness: state.harmonicRichness
          });
          state.initialized = true;
        } catch (err) {
          state.palette = {
            colors: [{ h: 200, s: 70, l: 60 }],
            baseHue: 200,
            type: 'fallback'
          };
          state.initialized = true;
        }
      }

      if (!state.palette || !state.palette.colors) {
        state.palette = {
          colors: [{ h: 200, s: 70, l: 60 }],
          baseHue: 200,
          type: 'fallback'
        };
      }

      ball.energy = Math.max(0, ball.energy - 0.02);
      ball.pulsePhase += 0.05;

      const energyMultiplier = 1 + state.energy * 0.6 + ball.energy * 0.4;
      const pulseMultiplier = 1 + Math.sin(ball.pulsePhase) * ball.energy * 0.15;
      ball.radius = ball.baseRadius * energyMultiplier * pulseMultiplier;

      // Update each point with shape awareness
      ball.points.forEach((point, i) => {
        const freqIndex = Math.floor((i / ball.points.length) * bufferLength);
        const freqValue = dataArray[freqIndex] / 255;

        // Organic noise movement
        const noiseValue = fractalNoise2D(
          Math.cos(point.angle) * 0.5 + timeRef.current * 0.15,
          Math.sin(point.angle) * 0.5 + timeRef.current * 0.15,
          4,
          0.5
        );

        // Calculate shape-based target
        const currentShapeRadius = getShapeRadius(point.angle, ball.shapeMode, ball.radius, point);
        const targetShapeRadius = getShapeRadius(point.angle, ball.targetShapeMode, ball.radius, point);
        const morphedShapeRadius = currentShapeRadius + (targetShapeRadius - currentShapeRadius) * ball.shapeMorphProgress;

        // Add frequency and noise influences (limited to stay alive but not chaotic)
        const freqInfluence = freqValue * 0.25; // Reduced for more control
        const noiseInfluence = noiseValue * 0.15; // Reduced for more control
        const bassInfluence = state.bassIntensity * 0.2;
        const harmonicInfluence = state.harmonicRichness * 0.15;

        // Maximum deviation limit (sentient boundary)
        const maxDeviation = 0.4; // 40% max change from base shape
        const totalInfluence = Math.max(-maxDeviation, Math.min(maxDeviation,
          freqInfluence + noiseInfluence + bassInfluence - harmonicInfluence
        ));

        point.targetRadius = morphedShapeRadius * (1 + totalInfluence);

        // Smooth interpolation
        const diff = point.targetRadius - point.radius;
        ball.velocities[i].radial += diff * 0.06;
        ball.velocities[i].radial *= 0.88;

        point.radius += ball.velocities[i].radial;

        // Rotation based on mids
        const rotationSpeed = state.midIntensity * 0.001;
        point.angle += rotationSpeed;
      });

      // Render
      const bgColor = bassToDeepColor(state.bassIntensity * 0.5, state.palette);
      ctx.fillStyle = hslToString({ h: bgColor.h, s: bgColor.s, l: Math.max(5, bgColor.l - 35) }, 1);
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const outerGlow = ctx.createRadialGradient(
        ball.x, ball.y, 0,
        ball.x, ball.y, ball.radius * 2.5
      );

      const glowColor = trebleToLightColor(state.highIntensity, state.palette);
      const radiantGlow = toRadiantGlow(glowColor, state.energy);
      outerGlow.addColorStop(0, hslToString(radiantGlow, 0.25 * state.energy));
      outerGlow.addColorStop(0.4, hslToString(glowColor, 0.12 * state.energy));
      outerGlow.addColorStop(1, 'transparent');

      ctx.fillStyle = outerGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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

      const corePosition = 0.2 + state.highIntensity * 0.3;
      const midPosition = 0.5;
      const edgePosition = 0.8 + state.bassIntensity * 0.2;

      const coreColor = toLuminous(getColorFromPalette(state.palette, corePosition, state.energy), state.energy);
      const midColor = getColorFromPalette(state.palette, midPosition, state.energy * 0.8);
      const edgeColor = getColorFromPalette(state.palette, edgePosition, state.energy * 0.6);

      mainGradient.addColorStop(0, hslToString(coreColor, 0.95));
      mainGradient.addColorStop(0.4, hslToString(midColor, 0.85));
      mainGradient.addColorStop(0.7, hslToString(edgeColor, 0.7));
      mainGradient.addColorStop(1, hslToString(edgeColor, 0.3));

      ctx.fillStyle = mainGradient;
      ctx.fill();

      ctx.strokeStyle = hslToString(coreColor, 0.6);
      ctx.lineWidth = 3 + state.energy * 5;
      ctx.stroke();

      ctx.restore();

      const coreSize = ball.radius * 0.3 * (1 + Math.sin(timeRef.current * 3) * 0.2 * state.energy);
      const coreGradient = ctx.createRadialGradient(
        ball.x, ball.y, 0,
        ball.x, ball.y, coreSize
      );

      const innerCoreColor = toLuminous(getColorFromPalette(state.palette, 0.1, state.energy), 1);

      coreGradient.addColorStop(0, hslToString(innerCoreColor, 0.95));
      coreGradient.addColorStop(0.6, hslToString(coreColor, 0.65));
      coreGradient.addColorStop(1, 'transparent');

      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, coreSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      if (state.energy > 0.3) {
        for (let i = 0; i < 3; i++) {
          const ringRadius = ball.radius * (1.2 + i * 0.3);
          const ringAlpha = (1 - i * 0.3) * state.energy * 0.35;
          const ringPosition = 0.3 + i * 0.2;
          const ringColor = getColorFromPalette(state.palette, ringPosition, state.energy);

          ctx.strokeStyle = hslToString(ringColor, ringAlpha);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ringRadius + Math.sin(timeRef.current * 2 + i) * 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      if (state.energy > 0.5) {
        const numParticles = Math.floor(state.energy * 20);
        for (let i = 0; i < numParticles; i++) {
          const angle = (i / numParticles) * Math.PI * 2;
          const distance = ball.radius * 1.5 + Math.sin(timeRef.current * 3 + i) * ball.radius * 0.5;
          const x = ball.x + Math.cos(angle) * distance;
          const y = ball.y + Math.sin(angle) * distance;

          const particleSize = 2 + state.energy * 4;
          const particlePosition = (i / numParticles);
          const particleColor = toLuminous(getColorFromPalette(state.palette, particlePosition, state.energy), 0.8);

          ctx.fillStyle = hslToString(particleColor, state.energy * 0.6);
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

export default AudioVisualizer;
*/

/// Energyball version this one works well but no color shirt like that
/*
import React, { useEffect, useRef } from 'react';
import { generateUniquePalette, hslToString, bassToDeepColor, trebleToLightColor, getColorFromPalette, toLuminous, toRadiantGlow } from './utils/colorUtils';
import { initNoise, fractalNoise2D } from './utils/noise';

const AudioVisualizer = ({ analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const musicAnalysisRef = useRef({
    // Pitch tracking
    pitch: { current: 0, prev: 0, change: 0, velocity: 0 },

    // Rhythm analysis
    rhythm: { beat: false, tempo: 120, consistency: 0.5, syncopation: 0 },

    // Harmony detection
    harmony: { complexity: 0, richness: 0, consonance: 0.5 },

    // Melody tracking
    melody: { direction: 0, contour: [], smoothness: 0.5 },

    // Dynamics
    dynamics: { current: 0, range: 0, peak: 0, rms: 0 },

    // Timbre
    timbre: { brightness: 0.5, roughness: 0, warmth: 0.5 },

    // Texture
    texture: { density: 0, layering: 0, clarity: 0.5 },

    // Form detection
    form: { section: 0, transition: false, energy: 0 }
  });

  const colorStateRef = useRef({
    palette: null,
    currentPalette: 0,
    initialized: false,
    transitionProgress: 0,
    thresholdBreaches: {
      highPitch: false,
      lowPitch: false,
      strongHarmony: false,
      weakHarmony: false,
      loudDynamics: false,
      quietDynamics: false,
      brightTimbre: false,
      darkTimbre: false
    }
  });

  const energyBallRef = useRef({
    x: 0,
    y: 0,
    baseRadius: 150,
    radius: 150,
    points: [],
    velocities: [],
    energy: 0,
    pulsePhase: 0,
    shapeMode: 0,
    targetShapeMode: 0,
    shapeMorphProgress: 0
  });

  const timeRef = useRef(0);
  const beatHistoryRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      energyBallRef.current.x = canvas.width / 2;
      energyBallRef.current.y = canvas.height / 2;
      energyBallRef.current.baseRadius = Math.min(canvas.width, canvas.height) * 0.25;

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
    const numPoints = 128;

    ball.points = [];
    ball.velocities = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      ball.points.push({
        angle: angle,
        radius: ball.baseRadius,
        targetRadius: ball.baseRadius,
        noiseOffset: Math.random() * 1000,
        shapeInfluence: Math.random()
      });
      ball.velocities.push({
        radial: 0,
        angular: 0
      });
    }
  };

  const getShapeRadius = (angle, shapeMode, baseRadius, point) => {
    switch(shapeMode) {
      case 0: return baseRadius;
      case 1: return baseRadius * (1 + 0.3 * Math.sin(angle * 2));
      case 2: return baseRadius * (1 + 0.4 * Math.abs(Math.cos(angle * 2.5)));
      case 3: return baseRadius * (1 + 0.35 * Math.sin(angle * 3 + point.shapeInfluence * Math.PI));
      default: return baseRadius;
    }
  };

  const analyzeMusic = (dataArray, bufferLength) => {
    const analysis = musicAnalysisRef.current;

    // Frequency ranges
    const bassRange = Math.floor(bufferLength * 0.08);
    const lowMidRange = Math.floor(bufferLength * 0.25);
    const midRange = Math.floor(bufferLength * 0.5);
    const highMidRange = Math.floor(bufferLength * 0.7);

    const bass = dataArray.slice(0, bassRange).reduce((a, b) => a + b, 0) / bassRange;
    const lowMid = dataArray.slice(bassRange, lowMidRange).reduce((a, b) => a + b, 0) / (lowMidRange - bassRange);
    const mid = dataArray.slice(lowMidRange, midRange).reduce((a, b) => a + b, 0) / (midRange - lowMidRange);
    const highMid = dataArray.slice(midRange, highMidRange).reduce((a, b) => a + b, 0) / (highMidRange - midRange);
    const high = dataArray.slice(highMidRange).reduce((a, b) => a + b, 0) / (bufferLength - highMidRange);
    const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
    const peak = Math.max(...dataArray);

    // PITCH: Spectral centroid for pitch tracking
    let weightedSum = 0;
    let totalWeight = 0;
    dataArray.forEach((value, index) => {
      weightedSum += value * index;
      totalWeight += value;
    });
    analysis.pitch.prev = analysis.pitch.current;
    analysis.pitch.current = totalWeight > 0 ? (weightedSum / totalWeight) / bufferLength : 0.5;
    analysis.pitch.change = analysis.pitch.current - analysis.pitch.prev;
    analysis.pitch.velocity = Math.abs(analysis.pitch.change);

    // RHYTHM: Beat detection and tempo
    if (bass > 100 && beatHistoryRef.current.length > 0) {
      const now = Date.now();
      const lastBeat = beatHistoryRef.current[beatHistoryRef.current.length - 1];
      const timeDiff = now - lastBeat.time;

      if (timeDiff > 200 && timeDiff < 2000) {
        analysis.rhythm.beat = true;
        analysis.rhythm.tempo = 60000 / timeDiff;
        beatHistoryRef.current.push({ time: now, intensity: bass / 255 });
        if (beatHistoryRef.current.length > 16) beatHistoryRef.current.shift();

        // Calculate rhythm consistency
        if (beatHistoryRef.current.length > 3) {
          const intervals = [];
          for (let i = 1; i < beatHistoryRef.current.length; i++) {
            intervals.push(beatHistoryRef.current[i].time - beatHistoryRef.current[i-1].time);
          }
          const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
          const variance = intervals.reduce((acc, val) => acc + Math.pow(val - avgInterval, 2), 0) / intervals.length;
          analysis.rhythm.consistency = 1 / (1 + variance / 10000);
          analysis.rhythm.syncopation = 1 - analysis.rhythm.consistency;
        }
      }
    } else {
      analysis.rhythm.beat = false;
    }

    if (beatHistoryRef.current.length === 0 && bass > 100) {
      beatHistoryRef.current.push({ time: Date.now(), intensity: bass / 255 });
    }

    // HARMONY: Spectral complexity and richness
    const activeFreqs = dataArray.filter(v => v > 15).length;
    analysis.harmony.richness = activeFreqs / bufferLength;

    // Calculate harmonic complexity by looking at frequency distribution
    const bins = 8;
    const binSize = Math.floor(bufferLength / bins);
    const binEnergies = [];
    for (let i = 0; i < bins; i++) {
      const start = i * binSize;
      const end = start + binSize;
      binEnergies.push(dataArray.slice(start, end).reduce((a, b) => a + b, 0) / binSize);
    }
    const avgBinEnergy = binEnergies.reduce((a, b) => a + b) / bins;
    const binVariance = binEnergies.reduce((acc, val) => acc + Math.abs(val - avgBinEnergy), 0) / bins;
    analysis.harmony.complexity = Math.min(1, binVariance / 100);
    analysis.harmony.consonance = 1 - analysis.harmony.complexity;

    // MELODY: Track pitch contour and direction
    analysis.melody.direction = analysis.pitch.change > 0 ? 1 : -1;
    analysis.melody.contour.push(analysis.pitch.current);
    if (analysis.melody.contour.length > 32) analysis.melody.contour.shift();

    if (analysis.melody.contour.length > 2) {
      const changes = analysis.melody.contour.slice(1).map((val, i) =>
        Math.abs(val - analysis.melody.contour[i])
      );
      analysis.melody.smoothness = 1 - (changes.reduce((a, b) => a + b) / changes.length);
    }

    // DYNAMICS: Volume analysis
    analysis.dynamics.current = avg / 255;
    analysis.dynamics.peak = peak / 255;
    analysis.dynamics.range = (peak - avg) / 255;

    // RMS for dynamics
    const rms = Math.sqrt(dataArray.reduce((acc, val) => acc + val * val, 0) / bufferLength);
    analysis.dynamics.rms = rms / 255;

    // TIMBRE: Brightness and roughness
    analysis.timbre.brightness = analysis.pitch.current;
    analysis.timbre.warmth = bass / (high + bass + 1);

    // Roughness from high-frequency content variation
    const highFreqVariance = dataArray.slice(highMidRange).reduce((acc, val, i, arr) => {
      if (i === 0) return 0;
      return acc + Math.abs(val - arr[i-1]);
    }, 0) / (bufferLength - highMidRange);
    analysis.timbre.roughness = Math.min(1, highFreqVariance / 50);

    // TEXTURE: Density and layering
    analysis.texture.density = analysis.harmony.richness;
    analysis.texture.layering = analysis.harmony.complexity;
    analysis.texture.clarity = 1 - analysis.texture.density;

    // FORM: Energy tracking for section detection
    analysis.form.energy = analysis.dynamics.current;

    return {
      bassIntensity: bass / 255,
      midIntensity: mid / 255,
      highIntensity: high / 255,
      energy: avg / 255
    };
  };

  const checkThresholds = (analysis, colorState) => {
    const thresholds = colorState.thresholdBreaches;
    const prevThresholds = { ...thresholds };

    // Pitch thresholds
    thresholds.highPitch = analysis.pitch.current > 0.7;
    thresholds.lowPitch = analysis.pitch.current < 0.3;

    // Harmony thresholds
    thresholds.strongHarmony = analysis.harmony.complexity > 0.6;
    thresholds.weakHarmony = analysis.harmony.complexity < 0.2;

    // Dynamics thresholds
    thresholds.loudDynamics = analysis.dynamics.current > 0.7;
    thresholds.quietDynamics = analysis.dynamics.current < 0.2;

    // Timbre thresholds
    thresholds.brightTimbre = analysis.timbre.brightness > 0.65;
    thresholds.darkTimbre = analysis.timbre.brightness < 0.35;

    // Check if any threshold was just crossed
    let thresholdCrossed = false;
    for (let key in thresholds) {
      if (thresholds[key] !== prevThresholds[key] && thresholds[key] === true) {
        thresholdCrossed = true;
        break;
      }
    }

    return thresholdCrossed;
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

      const analysis = musicAnalysisRef.current;
      const colorState = colorStateRef.current;
      const ball = energyBallRef.current;

      // Analyze music components
      const audioData = analyzeMusic(dataArray, bufferLength);

      // Initialize palette
      if (!colorState.initialized) {
        try {
          colorState.palette = generateUniquePalette({
            bassAvg: audioData.bassIntensity,
            midAvg: audioData.midIntensity,
            highAvg: audioData.highIntensity,
            spectralCentroid: analysis.pitch.current,
            harmonicRichness: analysis.harmony.richness
          });
          colorState.initialized = true;
        } catch (err) {
          colorState.palette = {
            colors: [{ h: 200, s: 70, l: 60 }],
            baseHue: 200,
            type: 'fallback'
          };
          colorState.initialized = true;
        }
      }

      // Check if thresholds crossed - trigger palette change
      const thresholdCrossed = checkThresholds(analysis, colorState);
      if (thresholdCrossed && Math.random() < 0.3) { // 30% chance when threshold crossed
        console.log('Threshold crossed! Generating new palette...');

        // Generate completely new palette based on current music state
        try {
          const newPalette = generateUniquePalette({
            bassAvg: audioData.bassIntensity,
            midAvg: audioData.midIntensity,
            highAvg: audioData.highIntensity,
            spectralCentroid: analysis.pitch.current,
            harmonicRichness: analysis.harmony.richness
          });

          console.log('New palette:', newPalette.name);
          colorState.palette = newPalette;
        } catch (err) {
          console.error('Palette generation error:', err);
        }
      }

      // Continuous palette updates every 5 seconds based on music evolution
      if (Math.floor(timeRef.current) % 5 === 0 && Math.floor(timeRef.current * 60) % 60 === 0) {
        console.log('Updating palette based on current music state...');
        try {
          const updatedPalette = generateUniquePalette({
            bassAvg: audioData.bassIntensity,
            midAvg: audioData.midIntensity,
            highAvg: audioData.highIntensity,
            spectralCentroid: analysis.pitch.current,
            harmonicRichness: analysis.harmony.richness
          });

          console.log('Updated to palette:', updatedPalette.name);
          colorState.palette = updatedPalette;
        } catch (err) {
          console.error('Palette update error:', err);
        }
      }

      // Beat reactions
      if (analysis.rhythm.beat) {
        ball.energy = Math.min(2, ball.energy + 0.8 * analysis.dynamics.current);
        ball.pulsePhase = 0;

        // Shape changes based on form/section
        if (Math.random() < 0.1) {
          ball.targetShapeMode = Math.floor(Math.random() * 4);
          ball.shapeMorphProgress = 0;
        }
      }

      // Shape morphing influenced by melody smoothness
      if (ball.shapeMode !== ball.targetShapeMode) {
        const morphSpeed = 0.01 + analysis.melody.smoothness * 0.03;
        ball.shapeMorphProgress += morphSpeed;
        if (ball.shapeMorphProgress >= 1) {
          ball.shapeMode = ball.targetShapeMode;
          ball.shapeMorphProgress = 0;
        }
      }

      ball.energy = Math.max(0, ball.energy - 0.02);
      ball.pulsePhase += 0.05;

      // Dynamics affect size
      const energyMultiplier = 1 + audioData.energy * 0.8 + ball.energy * 0.5;
      const pulseMultiplier = 1 + Math.sin(ball.pulsePhase) * ball.energy * 0.2;
      const dynamicsMultiplier = 0.9 + analysis.dynamics.rms * 0.4;
      ball.radius = ball.baseRadius * energyMultiplier * pulseMultiplier * dynamicsMultiplier;

      // Update each point with music-driven movement
      ball.points.forEach((point, i) => {
        const freqIndex = Math.floor((i / ball.points.length) * bufferLength);
        const freqValue = dataArray[freqIndex] / 255;

        // Organic noise influenced by rhythm consistency
        const noiseSpeed = 0.1 + (1 - analysis.rhythm.consistency) * 0.2;
        const noiseValue = fractalNoise2D(
          Math.cos(point.angle) * 0.5 + timeRef.current * noiseSpeed,
          Math.sin(point.angle) * 0.5 + timeRef.current * noiseSpeed,
          4,
          0.5
        );

        // Shape-based target
        const currentShapeRadius = getShapeRadius(point.angle, ball.shapeMode, ball.radius, point);
        const targetShapeRadius = getShapeRadius(point.angle, ball.targetShapeMode, ball.radius, point);
        const morphedShapeRadius = currentShapeRadius + (targetShapeRadius - currentShapeRadius) * ball.shapeMorphProgress;

        // Music component influences
        const pitchInfluence = analysis.pitch.velocity * 0.3;
        const rhythmInfluence = analysis.rhythm.syncopation * 0.2;
        const harmonyInfluence = analysis.harmony.complexity * 0.25;
        const melodyInfluence = Math.abs(analysis.melody.direction) * analysis.melody.smoothness * 0.15;
        const freqInfluence = freqValue * 0.3;
        const noiseInfluence = noiseValue * 0.2;
        const textureInfluence = analysis.texture.layering * 0.15;

        const maxDeviation = 0.5;
        const totalInfluence = Math.max(-maxDeviation, Math.min(maxDeviation,
          pitchInfluence + rhythmInfluence + harmonyInfluence + melodyInfluence +
          freqInfluence + noiseInfluence + textureInfluence
        ));

        point.targetRadius = morphedShapeRadius * (1 + totalInfluence);

        // Smooth interpolation with timbre affecting response speed
        const responseSpeed = 0.04 + analysis.timbre.roughness * 0.06;
        const diff = point.targetRadius - point.radius;
        ball.velocities[i].radial += diff * responseSpeed;
        ball.velocities[i].radial *= 0.88;

        point.radius += ball.velocities[i].radial;

        // Angular rotation influenced by melody direction and texture
        const rotationSpeed = analysis.melody.direction * 0.0005 * analysis.texture.density;
        point.angle += rotationSpeed;
      });

      // Render
      const bgColor = bassToDeepColor(audioData.bassIntensity * 0.5, colorState.palette);
      ctx.fillStyle = hslToString({ h: bgColor.h, s: bgColor.s, l: Math.max(5, bgColor.l - 35) }, 1);
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const outerGlow = ctx.createRadialGradient(
        ball.x, ball.y, 0,
        ball.x, ball.y, ball.radius * 2.5
      );

      const glowColor = trebleToLightColor(audioData.highIntensity, colorState.palette);
      const radiantGlow = toRadiantGlow(glowColor, audioData.energy);
      outerGlow.addColorStop(0, hslToString(radiantGlow, 0.25 * audioData.energy));
      outerGlow.addColorStop(0.4, hslToString(glowColor, 0.12 * audioData.energy));
      outerGlow.addColorStop(1, 'transparent');

      ctx.fillStyle = outerGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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

      // Color positions influenced by music components
      const corePosition = 0.2 + analysis.timbre.brightness * 0.3;
      const midPosition = 0.5 + analysis.harmony.complexity * 0.2;
      const edgePosition = 0.8 + analysis.dynamics.current * 0.15;

      const coreColor = toLuminous(getColorFromPalette(colorState.palette, corePosition, audioData.energy), audioData.energy);
      const midColor = getColorFromPalette(colorState.palette, midPosition, audioData.energy * 0.8);
      const edgeColor = getColorFromPalette(colorState.palette, edgePosition, audioData.energy * 0.6);

      mainGradient.addColorStop(0, hslToString(coreColor, 0.95));
      mainGradient.addColorStop(0.4, hslToString(midColor, 0.85));
      mainGradient.addColorStop(0.7, hslToString(edgeColor, 0.7));
      mainGradient.addColorStop(1, hslToString(edgeColor, 0.3));

      ctx.fillStyle = mainGradient;
      ctx.fill();

      ctx.strokeStyle = hslToString(coreColor, 0.6);
      ctx.lineWidth = 3 + audioData.energy * 5;
      ctx.stroke();

      ctx.restore();

      // Inner core pulse
      const coreSize = ball.radius * 0.3 * (1 + Math.sin(timeRef.current * 3) * 0.2 * audioData.energy);
      const coreGradient = ctx.createRadialGradient(
        ball.x, ball.y, 0,
        ball.x, ball.y, coreSize
      );

      const innerCoreColor = toLuminous(getColorFromPalette(colorState.palette, 0.1, audioData.energy), 1);

      coreGradient.addColorStop(0, hslToString(innerCoreColor, 0.95));
      coreGradient.addColorStop(0.6, hslToString(coreColor, 0.65));
      coreGradient.addColorStop(1, 'transparent');

      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, coreSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      // Rings based on texture density
      if (audioData.energy > 0.3) {
        const numRings = Math.floor(2 + analysis.texture.layering * 3);
        for (let i = 0; i < numRings; i++) {
          const ringRadius = ball.radius * (1.2 + i * 0.3);
          const ringAlpha = (1 - i * 0.3) * audioData.energy * 0.35;
          const ringPosition = 0.3 + i * 0.2;
          const ringColor = getColorFromPalette(colorState.palette, ringPosition, audioData.energy);

          ctx.strokeStyle = hslToString(ringColor, ringAlpha);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ringRadius + Math.sin(timeRef.current * 2 + i) * 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Particles influenced by rhythm and melody
      if (audioData.energy > 0.5) {
        const numParticles = Math.floor(audioData.energy * 30);
        for (let i = 0; i < numParticles; i++) {
          const angle = (i / numParticles) * Math.PI * 2;
          const distance = ball.radius * (1.5 + analysis.melody.smoothness * 0.5) +
                          Math.sin(timeRef.current * 3 + i) * ball.radius * 0.5;
          const x = ball.x + Math.cos(angle) * distance;
          const y = ball.y + Math.sin(angle) * distance;

          const particleSize = 2 + audioData.energy * 4;
          const particlePosition = (i / numParticles);
          const particleColor = toLuminous(getColorFromPalette(colorState.palette, particlePosition, audioData.energy), 0.8);

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

export default AudioVisualizer;
*/


/*
// For ball version:
import AudioVisualizer from './AudioVisualizer-Ball-Enhanced';

// For canvas version:
import AudioVisualizer from './AudioVisualizer-Canvas-Field';

// canvas audio version
import React, { useEffect, useRef } from 'react';
import { generateUniquePalette, hslToString, getColorFromPalette, toLuminous, interpolatePalettes } from './utils/colorUtils';
import { initNoise, fractalNoise2D } from './utils/noise';

const AudioVisualizerCanvas = ({ analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const colorStateRef = useRef({
    currentPalette: null,
    nextPalette: null,
    transitionProgress: 1,
    initialized: false,
    lastChangeTime: 0
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

      // Max radius fits within screen bounds
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

      // Smooth palette transitions
      const timeSinceLastChange = timeRef.current - colorState.lastChangeTime;
      const shouldChangePalette = (
        timeSinceLastChange > 12 + Math.random() * 6 ||
        (audioData.harmonicRichness > 0.75 && timeSinceLastChange > 6)
      );

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
        colorState.transitionProgress += 0.004; // Very slow transition over ~4 seconds
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
        // Gentle rotation when idle
        field.flowAngle += 0.003;
      } else {
        // Music-driven flow
        field.flowAngle += (audioData.midIntensity * 0.02 + audioData.bassIntensity * 0.01);
      }

      // Update field points
      field.points.forEach((point, i) => {
        const freqIndex = Math.floor((i / field.points.length) * bufferLength);
        const freqValue = dataArray[freqIndex] / 255;

        if (isIdle) {
          // Subtle ambient movement
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
          // Dynamic music-reactive movement
          const noiseValue = fractalNoise2D(
            Math.cos(point.angle + field.flowAngle) * 0.5 + timeRef.current * 0.15,
            Math.sin(point.angle + field.flowAngle) * 0.5 + timeRef.current * 0.15,
            4,
            0.5
          );

          // Multiple layers of influence
          const freqInfluence = freqValue * 0.4;
          const noiseInfluence = noiseValue * 0.25;
          const bassInfluence = audioData.bassIntensity * 0.3;
          const flowInfluence = Math.sin(point.angle + field.flowAngle) * audioData.midIntensity * 0.2;

          point.localEnergy += (freqValue - point.localEnergy) * 0.12;
          const localInfluence = point.localEnergy * 0.2;

          const totalInfluence = freqInfluence + noiseInfluence + bassInfluence + flowInfluence + localInfluence;

          // Dynamic base size
          const energySize = 0.5 + field.energy * 0.5;
          const baseRadius = field.maxRadius * energySize;

          point.targetRadius = baseRadius * (1 + totalInfluence);
        }

        // Smooth interpolation
        const responseSpeed = isIdle ? 0.03 : 0.06;
        const diff = point.targetRadius - point.radius;
        field.velocities[i].radial += diff * responseSpeed;
        field.velocities[i].radial *= 0.88;

        point.radius += field.velocities[i].radial;

        // Clamp to max screen bounds
        point.radius = Math.min(point.radius, field.maxRadius);

        // Rotation
        const rotationSpeed = isIdle ? 0.0002 : audioData.midIntensity * 0.001;
        point.angle += rotationSpeed;
      });

      // Draw main energy field
      ctx.save();
      ctx.translate(field.centerX, field.centerY);

      // Multiple glow layers
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

        // Gradient for this layer
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

      // Spawn particles from field edge
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



// ball energy version with the new colour pallets

// src/visualizers/AudioVisualizer.jsx
// Unified visualizer with both Ball and Canvas modes
/*
import React, { useEffect, useRef } from 'react';
import { generateUniquePalette, hslToString, bassToDeepColor, trebleToLightColor, getColorFromPalette, toLuminous, toRadiantGlow, interpolatePalettes } from '../utils/colorUtils';
import { initNoise, fractalNoise2D } from '../utils/noise';

const AudioVisualizer = ({ analyser, isPlaying, mode = 'ball' }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const musicAnalysisRef = useRef({
    pitch: { current: 0, prev: 0, velocity: 0 },
    harmony: { complexity: 0, richness: 0 },
    dynamics: { current: 0 },
    timbre: { brightness: 0.5, roughness: 0 },
    texture: { layering: 0 },
    melody: { direction: 0 }
  });

  const colorStateRef = useRef({
    currentPalette: null,
    nextPalette: null,
    transitionProgress: 1,
    initialized: false,
    lastChangeTime: 0
  });

  const energyStateRef = useRef({
    centerX: 0,
    centerY: 0,
    maxRadius: 0,
    baseRadius: 150,
    radius: 150,
    points: [],
    velocities: [],
    energy: 0,
    flowAngle: 0,
    particles: [],
    pulsePhase: 0,
    shapeMode: 0,
    targetShapeMode: 0,
    shapeMorphProgress: 1,
    sentientBoundary: 0.6
  });

  const timeRef = useRef(0);
  const idleTimeRef = useRef(0);
  const shapeTransitionTimerRef = useRef(0);

  // Initialize on mount and mode change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const state = energyStateRef.current;
      state.centerX = canvas.width / 2;
      state.centerY = canvas.height / 2;

      const minDimension = Math.min(canvas.width, canvas.height);
      state.maxRadius = Math.min(minDimension * 0.4, 400);
      state.baseRadius = state.maxRadius * 0.7;

      initializePoints();
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

  const initializePoints = () => {
    initNoise(Date.now() + Math.random() * 10000);

    const state = energyStateRef.current;
    const numPoints = mode === 'canvas' ? 144 : 144;

    state.points = [];
    state.velocities = [];
    state.particles = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      state.points.push({
        angle: angle,
        radius: state.baseRadius,
        targetRadius: state.baseRadius,
        noiseOffset: Math.random() * 1000,
        shapeInfluence: Math.random(),
        localEnergy: 0,
        flowInfluence: Math.random(),
        individualOffset: Math.random() * Math.PI * 2
      });
      state.velocities.push({ radial: 0, angular: 0 });
    }
  };

  const getShapeRadius = (angle, shapeMode, baseRadius, point, t) => {
    switch(shapeMode) {
      case 0: return baseRadius * (1 + Math.sin(t * 2) * 0.05);
      case 1: return baseRadius * (1 + 0.35 * Math.sin(angle * 2 + t * 0.5));
      case 2:
        const starAngle = (angle * 5) % (Math.PI * 2);
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

  const analyzeMusic = (dataArray, bufferLength) => {
    const analysis = musicAnalysisRef.current;

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

    analysis.pitch.prev = analysis.pitch.current;
    analysis.pitch.current = totalWeight > 0 ? (weightedSum / totalWeight) / bufferLength : 0.5;
    analysis.pitch.velocity = Math.abs(analysis.pitch.current - analysis.pitch.prev);

    const activeFreqs = dataArray.filter(v => v > 10).length;
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
      energy: avg / 255,
      spectralCentroid: analysis.pitch.current,
      harmonicRichness: analysis.harmony.richness
    };
  };

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const bufferLength = analyser ? analyser.frequencyBinCount : 1024;
    const dataArray = new Uint8Array(bufferLength);

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      const isIdle = !analyser || !isPlaying;

      // Get audio data
      if (!isIdle && analyser) {
        analyser.getByteFrequencyData(dataArray);
        idleTimeRef.current = 0;
      } else {
        idleTimeRef.current += 0.016;
        dataArray.fill(0);
      }

      timeRef.current += 0.016;
      shapeTransitionTimerRef.current += 0.016;

      const analysis = musicAnalysisRef.current;
      const colorState = colorStateRef.current;
      const state = energyStateRef.current;

      const audioData = isIdle ? {
        bassIntensity: 0,
        midIntensity: 0,
        highIntensity: 0,
        energy: 0,
        spectralCentroid: 0.5,
        harmonicRichness: 0
      } : analyzeMusic(dataArray, bufferLength);

      // Initialize palette
      if (!colorState.initialized) {
        try {
          colorState.currentPalette = generateUniquePalette({
            bassAvg: 0.3,
            midAvg: 0.3,
            highAvg: 0.3,
            spectralCentroid: 0.5,
            harmonicRichness: 0.3
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

      // Palette transitions
      const timeSinceLastChange = timeRef.current - colorState.lastChangeTime;
      const shouldChangePalette = isIdle
        ? timeSinceLastChange > 20 + Math.random() * 10
        : (timeSinceLastChange > 10 + Math.random() * 5 || (audioData.harmonicRichness > 0.75 && timeSinceLastChange > 5));

      if (shouldChangePalette && colorState.transitionProgress >= 1) {
        try {
          colorState.nextPalette = generateUniquePalette({
            bassAvg: isIdle ? 0.3 : audioData.bassIntensity,
            midAvg: isIdle ? 0.3 : audioData.midIntensity,
            highAvg: isIdle ? 0.3 : audioData.highIntensity,
            spectralCentroid: audioData.spectralCentroid,
            harmonicRichness: audioData.harmonicRichness
          });
          colorState.transitionProgress = 0;
          colorState.lastChangeTime = timeRef.current;
        } catch (err) {
          console.error('Palette generation error:', err);
        }
      }

      if (colorState.transitionProgress < 1 && colorState.nextPalette) {
        colorState.transitionProgress += isIdle ? 0.002 : 0.005;
        if (colorState.transitionProgress >= 1) {
          colorState.currentPalette = colorState.nextPalette;
          colorState.nextPalette = null;
        }
      }

      const activePalette = colorState.transitionProgress < 1 && colorState.nextPalette
        ? interpolatePalettes(colorState.currentPalette, colorState.nextPalette, colorState.transitionProgress)
        : colorState.currentPalette;

      // VIVID color boost for all palettes
      const boostPalette = (palette) => {
        if (!palette || !palette.colors) return palette;
        return {
          ...palette,
          colors: palette.colors.map(c => ({
            h: c.h,
            s: Math.min(100, c.s + 15), // +15 saturation boost
            l: c.l
          }))
        };
      };
      const vividPalette = boostPalette(activePalette);

      // Shape transitions (Ball mode only)
      if (mode === 'ball' && !isIdle) {
        const shouldTransition = (
          shapeTransitionTimerRef.current > 4 + Math.random() * 2 ||
          analysis.harmony.complexity > 0.7 ||
          audioData.energy > 0.8
        );

        if (shouldTransition && state.shapeMorphProgress >= 1) {
          let newShape;
          if (audioData.bassIntensity > 0.7) newShape = Math.random() < 0.5 ? 0 : 3;
          else if (analysis.harmony.complexity > 0.6) newShape = Math.floor(Math.random() * 3) + 4;
          else if (audioData.highIntensity > 0.6) newShape = Math.random() < 0.5 ? 2 : 6;
          else newShape = Math.floor(Math.random() * 8);

          if (newShape !== state.targetShapeMode) {
            state.targetShapeMode = newShape;
            state.shapeMorphProgress = 0;
            shapeTransitionTimerRef.current = 0;
          }
        }

        if (state.shapeMode !== state.targetShapeMode) {
          const morphSpeed = 0.008 + audioData.energy * 0.015 + analysis.harmony.complexity * 0.01;
          state.shapeMorphProgress += morphSpeed;
          if (state.shapeMorphProgress >= 1) {
            state.shapeMode = state.targetShapeMode;
            state.shapeMorphProgress = 1;
          }
        }
      } else if (mode === 'ball') {
        state.shapeMode = 0;
        state.targetShapeMode = 0;
        state.shapeMorphProgress = 1;
      }

      state.energy = Math.max(0, state.energy - 0.015);

      // Update size
      if (isIdle) {
        const breathe = Math.sin(idleTimeRef.current * 0.8) * 0.03;
        state.radius = state.baseRadius * (1 + breathe);
        state.flowAngle += 0.001;
      } else {
        if (mode === 'ball') {
          const energyMultiplier = 1 + audioData.energy * 0.6 + state.energy * 0.3;
          const pulseMultiplier = 1 + Math.sin(state.pulsePhase) * state.energy * 0.12;
          const dynamicsMultiplier = 0.9 + analysis.dynamics.current * 0.3;
          const targetRadius = state.baseRadius * energyMultiplier * pulseMultiplier * dynamicsMultiplier;
          state.radius = Math.min(targetRadius, state.maxRadius);
        } else {
          state.energy += (audioData.energy - state.energy) * 0.15;
          state.flowAngle += (audioData.midIntensity * 0.03 + audioData.bassIntensity * 0.02);
        }
      }

      state.pulsePhase += 0.06;

      // Update points
      state.points.forEach((point, i) => {
        if (isIdle) {
          const breathNoise = fractalNoise2D(
            Math.cos(point.angle) * 0.15 + idleTimeRef.current * 0.015,
            Math.sin(point.angle) * 0.15 + idleTimeRef.current * 0.015,
            2, 0.5
          );

          const baseSize = mode === 'canvas' ? state.maxRadius * 0.5 : state.radius;
          const breathAmount = breathNoise * 0.08 + Math.sin(idleTimeRef.current * 0.5 + point.individualOffset) * 0.03;
          point.targetRadius = baseSize * (1 + breathAmount);
          point.localEnergy = 0.05;
        } else {
          const freqIndex = Math.floor((i / state.points.length) * bufferLength);
          const freqValue = dataArray[freqIndex] / 255;

          if (mode === 'ball') {
            // Ball mode logic
            const noiseValue = fractalNoise2D(
              Math.cos(point.angle) * 0.5 + timeRef.current * 0.08,
              Math.sin(point.angle) * 0.5 + timeRef.current * 0.08,
              4, 0.5
            );

            const currentShapeRadius = getShapeRadius(point.angle, state.shapeMode, state.radius, point, timeRef.current);
            const targetShapeRadius = getShapeRadius(point.angle, state.targetShapeMode, state.radius, point, timeRef.current);
            const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            const easedProgress = easeInOutCubic(state.shapeMorphProgress);
            const morphedShapeRadius = currentShapeRadius + (targetShapeRadius - currentShapeRadius) * easedProgress;

            const totalInfluence = freqValue * 0.25 + noiseValue * 0.15 + analysis.harmony.complexity * 0.2 + analysis.pitch.velocity * 0.18;
            point.localEnergy += (freqValue - point.localEnergy) * 0.1;
            const clampedInfluence = Math.max(-state.sentientBoundary, Math.min(state.sentientBoundary, totalInfluence + point.localEnergy * 0.15));
            point.targetRadius = morphedShapeRadius * (1 + clampedInfluence);
          } else {
            // Canvas mode - FREEFORM
            const noise1 = fractalNoise2D(
              Math.cos(point.angle + state.flowAngle) * 0.8 + timeRef.current * 0.25,
              Math.sin(point.angle + state.flowAngle) * 0.8 + timeRef.current * 0.25,
              6, 0.6
            );
            const noise2 = fractalNoise2D(
              Math.cos(point.angle * 2) * 0.5 + timeRef.current * 0.15,
              Math.sin(point.angle * 2) * 0.5 + timeRef.current * 0.15,
              4, 0.5
            );

            const flowInfluence = Math.sin(point.angle * 4 + state.flowAngle * 3) * audioData.midIntensity * 0.5;
            const harmonyInfluence = analysis.harmony.complexity * 0.4 * Math.sin(point.angle * 5 + timeRef.current);
            const individualInfluence = Math.sin(timeRef.current * 2 + point.individualOffset) * 0.2;

            point.localEnergy += (freqValue - point.localEnergy) * 0.2;

            const totalInfluence = freqValue * 0.7 + (noise1 * 0.5 + noise2 * 0.3) +
                                  audioData.bassIntensity * 0.6 + audioData.highIntensity * 0.5 +
                                  flowInfluence + harmonyInfluence + analysis.pitch.velocity * 0.6 +
                                  point.localEnergy * 0.5 + individualInfluence;

            const energySize = 0.35 + state.energy * 0.7;
            const pulseMultiplier = 1 + Math.sin(state.pulsePhase + point.angle * 3) * state.energy * 0.25;
            const baseRadius = state.maxRadius * energySize * pulseMultiplier;

            point.targetRadius = baseRadius * (1 + totalInfluence * 1.2);
          }
        }

        // Physics
        const responseSpeed = isIdle ? 0.015 : (mode === 'canvas' ? 0.12 : 0.045);
        const diff = point.targetRadius - point.radius;
        state.velocities[i].radial += diff * responseSpeed;
        state.velocities[i].radial *= isIdle ? 0.93 : (mode === 'canvas' ? 0.8 : 0.87);

        point.radius += state.velocities[i].radial;

        if (mode === 'canvas') {
          point.radius = Math.max(state.maxRadius * 0.2, Math.min(point.radius, state.maxRadius * 1.2));
        }

        const rotationSpeed = isIdle ? 0.00005 : (mode === 'canvas' ? audioData.midIntensity * 0.003 + audioData.energy * 0.002 : 0.0004);
        point.angle += rotationSpeed;
      });

      // Render
      const bgColor = isIdle
        ? getColorFromPalette(vividPalette, 0.1, 0.2)
        : bassToDeepColor(audioData.bassIntensity * 0.6, vividPalette);
      const bgLightness = isIdle ? Math.max(3, bgColor.l - 48) : Math.max(5, bgColor.l - 32);
      ctx.fillStyle = hslToString({ h: bgColor.h, s: Math.min(100, bgColor.s + 10), l: bgLightness }, 1);
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer glow
      if (!isIdle || idleTimeRef.current < 2) {
        const glowIntensity = isIdle ? 0.1 : audioData.energy;
        const glowRadius = mode === 'canvas' ? state.maxRadius * 2.5 : state.radius * 2.5;
        const outerGlow = ctx.createRadialGradient(state.centerX, state.centerY, 0, state.centerX, state.centerY, glowRadius);
        const glowColor = isIdle
          ? getColorFromPalette(vividPalette, 0.3, 0.2)
          : trebleToLightColor(audioData.highIntensity, vividPalette);
        const radiantGlow = toRadiantGlow(glowColor, glowIntensity);
        outerGlow.addColorStop(0, hslToString(radiantGlow, (mode === 'canvas' ? 0.35 : 0.15) * glowIntensity));
        outerGlow.addColorStop(0.35, hslToString(glowColor, (mode === 'canvas' ? 0.2 : 0.08) * glowIntensity));
        outerGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = outerGlow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw shape
      ctx.save();
      ctx.translate(state.centerX, state.centerY);

      const numLayers = isIdle ? 2 : (mode === 'canvas' ? 5 : 3);
      for (let layer = 0; layer < numLayers; layer++) {
        const layerScale = 1 + layer * (mode === 'canvas' ? 0.3 : 0.4);
        const layerAlpha = isIdle
          ? (1 - layer * 0.4) * 0.15
          : (1 - layer * (mode === 'canvas' ? 0.2 : 0.3)) * (mode === 'canvas' ? 0.4 + state.energy * 0.5 : 0.2 + state.energy * 0.3);

        ctx.beginPath();
        state.points.forEach((point, i) => {
          const x = Math.cos(point.angle) * point.radius * layerScale;
          const y = Math.sin(point.angle) * point.radius * layerScale;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevPoint = state.points[i - 1];
            const prevX = Math.cos(prevPoint.angle) * prevPoint.radius * layerScale;
            const prevY = Math.sin(prevPoint.angle) * prevPoint.radius * layerScale;
            const cpX = (prevX + x) / 2;
            const cpY = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
          }
        });
        ctx.closePath();

        const avgRadius = state.points.reduce((sum, p) => sum + p.radius, 0) / state.points.length;
        const layerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, avgRadius * layerScale);

        const colorPos = 0.2 + layer * (mode === 'canvas' ? 0.15 : 0.2);
        const layerColor = getColorFromPalette(vividPalette, colorPos, state.energy + 0.4);
        const luminousColor = toLuminous(layerColor, mode === 'canvas' ? state.energy * 1.2 : state.energy);

        layerGradient.addColorStop(0, hslToString(luminousColor, layerAlpha * (mode === 'canvas' ? 1 : 0.8)));
        layerGradient.addColorStop(0.5, hslToString(layerColor, layerAlpha * (mode === 'canvas' ? 0.85 : 0.6)));
        layerGradient.addColorStop(1, hslToString(layerColor, layerAlpha * (mode === 'canvas' ? 0.2 : 0.1)));

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = layerGradient;
        ctx.fill();
      }

      if (mode === 'ball') {
        const mainGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, state.radius);
        const energyLevel = isIdle ? 0.1 : audioData.energy;
        const coreColor = toLuminous(getColorFromPalette(vividPalette, 0.2, energyLevel), energyLevel);
        const midColor = getColorFromPalette(vividPalette, 0.5, energyLevel * 0.8);
        const edgeColor = getColorFromPalette(vividPalette, 0.8, energyLevel * 0.6);

        mainGradient.addColorStop(0, hslToString(coreColor, isIdle ? 0.7 : 0.95));
        mainGradient.addColorStop(0.4, hslToString(midColor, isIdle ? 0.6 : 0.85));
        mainGradient.addColorStop(0.7, hslToString(edgeColor, isIdle ? 0.4 : 0.7));
        mainGradient.addColorStop(1, hslToString(edgeColor, isIdle ? 0.15 : 0.3));

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = mainGradient;
        ctx.fill();

        ctx.strokeStyle = hslToString(coreColor, isIdle ? 0.3 : 0.6);
        ctx.lineWidth = isIdle ? 1 : 2 + audioData.energy * 4;
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();

      // Inner core
      if ((!isIdle && audioData.energy > 0.25) || (isIdle && Math.sin(idleTimeRef.current) > 0.5)) {
        const coreIntensity = isIdle ? 0.1 : audioData.energy;
        const coreSize = state.maxRadius * 0.3 * (1 + Math.sin(timeRef.current * 3) * 0.2 * coreIntensity);
        const coreGradient = ctx.createRadialGradient(state.centerX, state.centerY, 0, state.centerX, state.centerY, coreSize);
        const innerCoreColor = toLuminous(getColorFromPalette(vividPalette, 0.1, coreIntensity), isIdle ? 0.3 : (mode === 'canvas' ? 1.5 : 1));

        coreGradient.addColorStop(0, hslToString(innerCoreColor, isIdle ? 0.5 : (mode === 'canvas' ? 0.95 : 0.95)));
        coreGradient.addColorStop(0.5, hslToString(innerCoreColor, isIdle ? 0.3 : (mode === 'canvas' ? 0.7 : 0.65)));
        coreGradient.addColorStop(1, 'transparent');

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(state.centerX, state.centerY, coreSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }

      // Energy rings
      if (!isIdle && audioData.energy > 0.3) {
        const numRings = Math.floor(2 + analysis.texture.layering * (mode === 'canvas' ? 4 : 3));
        for (let i = 0; i < numRings; i++) {
          const avgRadius = state.points.reduce((sum, p) => sum + p.radius, 0) / state.points.length;
          const ringRadius = avgRadius * (1.15 + i * 0.25);
          const ringAlpha = (1 - i * (mode === 'canvas' ? 0.25 : 0.3)) * audioData.energy * (mode === 'canvas' ? 0.5 : 0.35);
          const ringPosition = 0.3 + i * (mode === 'canvas' ? 0.15 : 0.2);
          const ringColor = getColorFromPalette(vividPalette, ringPosition, audioData.energy);

          ctx.strokeStyle = hslToString(ringColor, ringAlpha);
          ctx.lineWidth = 2 + audioData.energy * 2;
          ctx.beginPath();
          ctx.arc(state.centerX, state.centerY, ringRadius + Math.sin(timeRef.current * 2 + i) * (mode === 'canvas' ? 15 : 10), 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Particles
      if (isIdle && Math.random() < (mode === 'canvas' ? 0.015 : 0.008)) {
        const randomPoint = state.points[Math.floor(Math.random() * state.points.length)];
        const x = state.centerX + Math.cos(randomPoint.angle) * randomPoint.radius * 0.8;
        const y = state.centerY + Math.sin(randomPoint.angle) * randomPoint.radius * 0.8;

        state.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          life: 1,
          colorOffset: Math.random(),
          size: 1 + Math.random() * 1.5
        });
      } else if (!isIdle && audioData.energy > 0.35 && Math.random() < audioData.energy * (mode === 'canvas' ? 0.35 : 0.25)) {
        const randomPoint = state.points[Math.floor(Math.random() * state.points.length)];
        const x = state.centerX + Math.cos(randomPoint.angle) * randomPoint.radius;
        const y = state.centerY + Math.sin(randomPoint.angle) * randomPoint.radius;

        state.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * (mode === 'canvas' ? 9 : 7),
          vy: (Math.random() - 0.5) * (mode === 'canvas' ? 9 : 7),
          life: 1,
          colorOffset: Math.random(),
          size: 2 + Math.random() * (mode === 'canvas' ? 5 : 3)
        });
      }

      // Update and render particles
      state.particles = state.particles.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.97;
        particle.vy *= 0.97;
        particle.life -= isIdle ? 0.01 : (mode === 'canvas' ? 0.02 : 0.018);

        if (particle.life <= 0) return false;

        const particleColor = getColorFromPalette(vividPalette, particle.colorOffset, state.energy + 0.3);
        ctx.fillStyle = hslToString(particleColor, particle.life * (mode === 'canvas' ? 0.85 : 0.75));
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
  }, [analyser, isPlaying, mode]);

  return <canvas ref={canvasRef} className="visualizer-canvas" />;
};

export default AudioVisualizer;
*/


















// src/visualizers/AudioVisualizer.jsx
// Unified visualizer with both Ball and Canvas modes

/*
import React, { useEffect, useRef } from 'react';
import { generateUniquePalette, hslToString, bassToDeepColor, trebleToLightColor, getColorFromPalette, toLuminous, toRadiantGlow, interpolatePalettes } from '../utils/colorUtils';
import { initNoise, fractalNoise2D } from '../utils/noise';

const AudioVisualizer = ({ analyser, isPlaying, mode = 'ball' }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const musicAnalysisRef = useRef({
    pitch: { current: 0, prev: 0, velocity: 0 },
    harmony: { complexity: 0, richness: 0 },
    dynamics: { current: 0 },
    timbre: { brightness: 0.5, roughness: 0 },
    texture: { layering: 0 },
    melody: { direction: 0 }
  });

  const colorStateRef = useRef({
    currentPalette: null,
    nextPalette: null,
    transitionProgress: 1,
    initialized: false,
    lastChangeTime: 0
  });

  const energyStateRef = useRef({
    centerX: 0,
    centerY: 0,
    maxRadius: 0,
    baseRadius: 150,
    radius: 150,
    points: [],
    velocities: [],
    energy: 0,
    flowAngle: 0,
    particles: [],
    pulsePhase: 0,
    shapeMode: 0,
    targetShapeMode: 0,
    shapeMorphProgress: 1,
    sentientBoundary: 0.6
  });

  const timeRef = useRef(0);
  const idleTimeRef = useRef(0);
  const shapeTransitionTimerRef = useRef(0);

  // Initialize on mount and mode change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const state = energyStateRef.current;
      state.centerX = canvas.width / 2;
      state.centerY = canvas.height / 2;

      const minDimension = Math.min(canvas.width, canvas.height);
      state.maxRadius = Math.min(minDimension * 0.4, 400);
      state.baseRadius = state.maxRadius * 0.7;

      initializePoints();
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

  const initializePoints = () => {
    initNoise(Date.now() + Math.random() * 10000);

    const state = energyStateRef.current;
    const numPoints = mode === 'canvas' ? 144 : 144;

    state.points = [];
    state.velocities = [];
    state.particles = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      state.points.push({
        angle: angle,
        radius: state.baseRadius,
        targetRadius: state.baseRadius,
        noiseOffset: Math.random() * 1000,
        shapeInfluence: Math.random(),
        localEnergy: 0,
        flowInfluence: Math.random(),
        individualOffset: Math.random() * Math.PI * 2
      });
      state.velocities.push({ radial: 0, angular: 0 });
    }
  };

  const getShapeRadius = (angle, shapeMode, baseRadius, point, t) => {
    switch(shapeMode) {
      case 0: return baseRadius * (1 + Math.sin(t * 2) * 0.05);
      case 1: return baseRadius * (1 + 0.35 * Math.sin(angle * 2 + t * 0.5));
      case 2:
        const starAngle = (angle * 5) % (Math.PI * 2);
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

  const analyzeMusic = (dataArray, bufferLength) => {
    const analysis = musicAnalysisRef.current;

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

    analysis.pitch.prev = analysis.pitch.current;
    analysis.pitch.current = totalWeight > 0 ? (weightedSum / totalWeight) / bufferLength : 0.5;
    analysis.pitch.velocity = Math.abs(analysis.pitch.current - analysis.pitch.prev);

    const activeFreqs = dataArray.filter(v => v > 10).length;
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
      energy: avg / 255,
      spectralCentroid: analysis.pitch.current,
      harmonicRichness: analysis.harmony.richness
    };
  };

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const bufferLength = analyser ? analyser.frequencyBinCount : 1024;
    const dataArray = new Uint8Array(bufferLength);

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      const isIdle = !analyser || !isPlaying;

      // Get audio data
      if (!isIdle && analyser) {
        analyser.getByteFrequencyData(dataArray);
        idleTimeRef.current = 0;
      } else {
        idleTimeRef.current += 0.016;
        dataArray.fill(0);
      }

      timeRef.current += 0.016;
      shapeTransitionTimerRef.current += 0.016;

      const analysis = musicAnalysisRef.current;
      const colorState = colorStateRef.current;
      const state = energyStateRef.current;

      const audioData = isIdle ? {
        bassIntensity: 0,
        midIntensity: 0,
        highIntensity: 0,
        energy: 0,
        spectralCentroid: 0.5,
        harmonicRichness: 0
      } : analyzeMusic(dataArray, bufferLength);

      // Initialize palette
      if (!colorState.initialized) {
        try {
          colorState.currentPalette = generateUniquePalette({
            bassAvg: 0.3,
            midAvg: 0.3,
            highAvg: 0.3,
            spectralCentroid: 0.5,
            harmonicRichness: 0.3
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

      // Palette transitions
      const timeSinceLastChange = timeRef.current - colorState.lastChangeTime;
      const shouldChangePalette = isIdle
        ? timeSinceLastChange > 20 + Math.random() * 10
        : (timeSinceLastChange > 10 + Math.random() * 5 || (audioData.harmonicRichness > 0.75 && timeSinceLastChange > 5));

      if (shouldChangePalette && colorState.transitionProgress >= 1) {
        try {
          colorState.nextPalette = generateUniquePalette({
            bassAvg: isIdle ? 0.3 : audioData.bassIntensity,
            midAvg: isIdle ? 0.3 : audioData.midIntensity,
            highAvg: isIdle ? 0.3 : audioData.highIntensity,
            spectralCentroid: audioData.spectralCentroid,
            harmonicRichness: audioData.harmonicRichness
          });
          colorState.transitionProgress = 0;
          colorState.lastChangeTime = timeRef.current;
        } catch (err) {
          console.error('Palette generation error:', err);
        }
      }

      if (colorState.transitionProgress < 1 && colorState.nextPalette) {
        colorState.transitionProgress += isIdle ? 0.002 : 0.005;
        if (colorState.transitionProgress >= 1) {
          colorState.currentPalette = colorState.nextPalette;
          colorState.nextPalette = null;
        }
      }

      const activePalette = colorState.transitionProgress < 1 && colorState.nextPalette
        ? interpolatePalettes(colorState.currentPalette, colorState.nextPalette, colorState.transitionProgress)
        : colorState.currentPalette;

      // VIVID color boost for all palettes - SAME FOR BOTH MODES
      const boostPalette = (palette) => {
        if (!palette || !palette.colors) return palette;
        return {
          ...palette,
          colors: palette.colors.map(c => ({
            h: c.h,
            s: Math.min(100, c.s + 20), // +20 saturation boost (same as ball)
            l: c.l
          }))
        };
      };
      const vividPalette = boostPalette(activePalette);

      // Shape transitions (Ball mode only)
      if (mode === 'ball' && !isIdle) {
        const shouldTransition = (
          shapeTransitionTimerRef.current > 4 + Math.random() * 2 ||
          analysis.harmony.complexity > 0.7 ||
          audioData.energy > 0.8
        );

        if (shouldTransition && state.shapeMorphProgress >= 1) {
          let newShape;
          if (audioData.bassIntensity > 0.7) newShape = Math.random() < 0.5 ? 0 : 3;
          else if (analysis.harmony.complexity > 0.6) newShape = Math.floor(Math.random() * 3) + 4;
          else if (audioData.highIntensity > 0.6) newShape = Math.random() < 0.5 ? 2 : 6;
          else newShape = Math.floor(Math.random() * 8);

          if (newShape !== state.targetShapeMode) {
            state.targetShapeMode = newShape;
            state.shapeMorphProgress = 0;
            shapeTransitionTimerRef.current = 0;
          }
        }

        if (state.shapeMode !== state.targetShapeMode) {
          const morphSpeed = 0.008 + audioData.energy * 0.015 + analysis.harmony.complexity * 0.01;
          state.shapeMorphProgress += morphSpeed;
          if (state.shapeMorphProgress >= 1) {
            state.shapeMode = state.targetShapeMode;
            state.shapeMorphProgress = 1;
          }
        }
      } else if (mode === 'ball') {
        state.shapeMode = 0;
        state.targetShapeMode = 0;
        state.shapeMorphProgress = 1;
      }

      state.energy = Math.max(0, state.energy - 0.015);

      // Update size
      if (isIdle) {
        const breathe = Math.sin(idleTimeRef.current * 0.8) * 0.03;
        state.radius = state.baseRadius * (1 + breathe);
        state.flowAngle += 0.001;
      } else {
        if (mode === 'ball') {
          const energyMultiplier = 1 + audioData.energy * 0.6 + state.energy * 0.3;
          const pulseMultiplier = 1 + Math.sin(state.pulsePhase) * state.energy * 0.12;
          const dynamicsMultiplier = 0.9 + analysis.dynamics.current * 0.3;
          const targetRadius = state.baseRadius * energyMultiplier * pulseMultiplier * dynamicsMultiplier;
          state.radius = Math.min(targetRadius, state.maxRadius);
        } else {
          // Canvas mode - more aggressive energy tracking
          state.energy += (audioData.energy - state.energy) * 0.2;  // Faster energy response
          state.flowAngle += (audioData.midIntensity * 0.05 + audioData.bassIntensity * 0.04);  // Faster flow
        }
      }

      state.pulsePhase += 0.06;

      // Update points
      state.points.forEach((point, i) => {
        if (isIdle) {
          const breathNoise = fractalNoise2D(
            Math.cos(point.angle) * 0.15 + idleTimeRef.current * 0.015,
            Math.sin(point.angle) * 0.15 + idleTimeRef.current * 0.015,
            2, 0.5
          );

          const baseSize = mode === 'canvas' ? state.maxRadius * 0.5 : state.radius;
          const breathAmount = breathNoise * 0.08 + Math.sin(idleTimeRef.current * 0.5 + point.individualOffset) * 0.03;
          point.targetRadius = baseSize * (1 + breathAmount);
          point.localEnergy = 0.05;
        } else {
          const freqIndex = Math.floor((i / state.points.length) * bufferLength);
          const freqValue = dataArray[freqIndex] / 255;

          if (mode === 'ball') {
            // Ball mode logic
            const noiseValue = fractalNoise2D(
              Math.cos(point.angle) * 0.5 + timeRef.current * 0.08,
              Math.sin(point.angle) * 0.5 + timeRef.current * 0.08,
              4, 0.5
            );

            const currentShapeRadius = getShapeRadius(point.angle, state.shapeMode, state.radius, point, timeRef.current);
            const targetShapeRadius = getShapeRadius(point.angle, state.targetShapeMode, state.radius, point, timeRef.current);
            const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            const easedProgress = easeInOutCubic(state.shapeMorphProgress);
            const morphedShapeRadius = currentShapeRadius + (targetShapeRadius - currentShapeRadius) * easedProgress;

            const totalInfluence = freqValue * 0.25 + noiseValue * 0.15 + analysis.harmony.complexity * 0.2 + analysis.pitch.velocity * 0.18;
            point.localEnergy += (freqValue - point.localEnergy) * 0.1;
            const clampedInfluence = Math.max(-state.sentientBoundary, Math.min(state.sentientBoundary, totalInfluence + point.localEnergy * 0.15));
            point.targetRadius = morphedShapeRadius * (1 + clampedInfluence);
          } else {
            // Canvas mode - EXTREME FREEFORM ENERGY FIELD
            // Multi-layered noise for organic, unpredictable movement
            const noise1 = fractalNoise2D(
              Math.cos(point.angle + state.flowAngle) * 1.2 + timeRef.current * 0.35,
              Math.sin(point.angle + state.flowAngle) * 1.2 + timeRef.current * 0.35,
              8, 0.65  // 8 octaves for extreme detail
            );
            const noise2 = fractalNoise2D(
              Math.cos(point.angle * 3 - state.flowAngle) * 0.8 + timeRef.current * 0.25,
              Math.sin(point.angle * 3 - state.flowAngle) * 0.8 + timeRef.current * 0.25,
              6, 0.6
            );
            const noise3 = fractalNoise2D(
              Math.cos(point.angle * 0.5) * 0.4 + timeRef.current * 0.15,
              Math.sin(point.angle * 0.5) * 0.4 + timeRef.current * 0.15,
              4, 0.5
            );

            // Complex multi-directional flow patterns
            const flowInfluence1 = Math.sin(point.angle * 5 + state.flowAngle * 4) * audioData.midIntensity * 0.7;
            const flowInfluence2 = Math.cos(point.angle * 3 - state.flowAngle * 2) * audioData.midIntensity * 0.5;
            const spiralFlow = Math.sin(point.angle * 7 + state.flowAngle * 5 + timeRef.current) * audioData.energy * 0.6;

            // Harmony creates complex patterns
            const harmonyInfluence = analysis.harmony.complexity * 0.6 * Math.sin(point.angle * 8 + timeRef.current * 2);
            const harmonyWave = analysis.harmony.richness * 0.5 * Math.cos(point.angle * 4 - timeRef.current);

            // Individual point chaos
            const individualInfluence1 = Math.sin(timeRef.current * 3 + point.individualOffset) * 0.35;
            const individualInfluence2 = Math.cos(timeRef.current * 2 + point.individualOffset * 2) * 0.25;

            // Extreme frequency response
            const freqInfluence = freqValue * 1.0;  // Maximum frequency response

            // Local energy builds over time
            point.localEnergy += (freqValue - point.localEnergy) * 0.25;
            const localBurst = point.localEnergy * 0.8;

            // Bass creates massive expansion
            const bassExpansion = audioData.bassIntensity * 0.9;
            const bassWave = audioData.bassIntensity * 0.6 * Math.sin(point.angle * 2 + timeRef.current * 3);

            // High frequencies create spikes
            const highSpikes = audioData.highIntensity * 0.8 * Math.abs(Math.sin(point.angle * 6 + timeRef.current * 4));
            const highFlutter = audioData.highIntensity * 0.5 * Math.cos(point.angle * 9);

            // Pitch velocity creates rapid changes
            const pitchInfluence = analysis.pitch.velocity * 0.8;
            const pitchWave = analysis.pitch.velocity * 0.4 * Math.sin(point.angle * 4);

            // Combine ALL influences for extreme freeform
            const totalInfluence =
              freqInfluence +
              (noise1 * 0.7 + noise2 * 0.5 + noise3 * 0.3) +
              bassExpansion + bassWave +
              highSpikes + highFlutter +
              flowInfluence1 + flowInfluence2 + spiralFlow +
              harmonyInfluence + harmonyWave +
              pitchInfluence + pitchWave +
              localBurst +
              individualInfluence1 + individualInfluence2;

            // Dynamic size with extreme pulse
            const energySize = 0.3 + state.energy * 0.8;  // Wider range
            const pulseMultiplier = 1 + Math.sin(state.pulsePhase + point.angle * 4) * state.energy * 0.35;  // Stronger pulse
            const secondaryPulse = 1 + Math.cos(state.pulsePhase * 1.5 + point.angle * 2) * state.energy * 0.2;
            const baseRadius = state.maxRadius * energySize * pulseMultiplier * secondaryPulse;

            // Allow extreme deformation (up to 1.8x multiplier)
            point.targetRadius = baseRadius * (1 + totalInfluence * 1.8);
          }
        }

        // Physics - FASTER response for canvas
        const responseSpeed = isIdle ? 0.015 : (mode === 'canvas' ? 0.18 : 0.045);  // Much faster for canvas
        const diff = point.targetRadius - point.radius;
        state.velocities[i].radial += diff * responseSpeed;
        state.velocities[i].radial *= isIdle ? 0.93 : (mode === 'canvas' ? 0.75 : 0.87);  // Less damping = more movement

        point.radius += state.velocities[i].radial;

        if (mode === 'canvas') {
          // Allow much larger range for extreme freeform
          point.radius = Math.max(state.maxRadius * 0.15, Math.min(point.radius, state.maxRadius * 1.5));
        }

        // Faster, more dynamic rotation for canvas
        const rotationSpeed = isIdle ? 0.00005 : (mode === 'canvas' ?
          audioData.midIntensity * 0.005 + audioData.energy * 0.004 + audioData.bassIntensity * 0.003 :
          0.0004);
        point.angle += rotationSpeed;
      });

      // Render - SAME VIVID BACKGROUND FOR BOTH MODES
      const bgColor = isIdle
        ? getColorFromPalette(vividPalette, 0.1, 0.2)
        : bassToDeepColor(audioData.bassIntensity * 0.6, vividPalette);
      const bgLightness = isIdle ? Math.max(3, bgColor.l - 48) : Math.max(5, bgColor.l - 30);  // Brighter for canvas
      ctx.fillStyle = hslToString({
        h: bgColor.h,
        s: Math.min(100, bgColor.s + (mode === 'canvas' ? 15 : 10)),  // Extra saturation for canvas
        l: bgLightness
      }, 1);
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer glow - MORE INTENSE FOR CANVAS
      if (!isIdle || idleTimeRef.current < 2) {
        const glowIntensity = isIdle ? 0.1 : audioData.energy;
        const glowRadius = mode === 'canvas' ? state.maxRadius * 3 : state.radius * 2.5;  // Larger glow for canvas
        const outerGlow = ctx.createRadialGradient(state.centerX, state.centerY, 0, state.centerX, state.centerY, glowRadius);
        const glowColor = isIdle
          ? getColorFromPalette(vividPalette, 0.3, 0.2)
          : trebleToLightColor(audioData.highIntensity, vividPalette);
        const radiantGlow = toRadiantGlow(glowColor, glowIntensity);

        // Canvas has stronger glow
        const glowAlpha1 = mode === 'canvas' ? 0.45 : 0.15;
        const glowAlpha2 = mode === 'canvas' ? 0.25 : 0.08;

        outerGlow.addColorStop(0, hslToString(radiantGlow, glowAlpha1 * glowIntensity));
        outerGlow.addColorStop(0.35, hslToString(glowColor, glowAlpha2 * glowIntensity));
        outerGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = outerGlow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw shape
      ctx.save();
      ctx.translate(state.centerX, state.centerY);

      const numLayers = isIdle ? 2 : (mode === 'canvas' ? 6 : 3);  // More layers for canvas
      for (let layer = 0; layer < numLayers; layer++) {
        const layerScale = 1 + layer * (mode === 'canvas' ? 0.25 : 0.4);
        const layerAlpha = isIdle
          ? (1 - layer * 0.4) * 0.15
          : (1 - layer * (mode === 'canvas' ? 0.15 : 0.3)) * (mode === 'canvas' ? 0.5 + state.energy * 0.6 : 0.2 + state.energy * 0.3);  // Much brighter for canvas

        ctx.beginPath();
        state.points.forEach((point, i) => {
          const x = Math.cos(point.angle) * point.radius * layerScale;
          const y = Math.sin(point.angle) * point.radius * layerScale;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevPoint = state.points[i - 1];
            const prevX = Math.cos(prevPoint.angle) * prevPoint.radius * layerScale;
            const prevY = Math.sin(prevPoint.angle) * prevPoint.radius * layerScale;
            const cpX = (prevX + x) / 2;
            const cpY = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
          }
        });
        ctx.closePath();

        const avgRadius = state.points.reduce((sum, p) => sum + p.radius, 0) / state.points.length;
        const layerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, avgRadius * layerScale);

        const colorPos = 0.2 + layer * (mode === 'canvas' ? 0.12 : 0.2);
        const layerColor = getColorFromPalette(vividPalette, colorPos, state.energy + 0.5);  // Higher energy offset
        const luminousColor = toLuminous(layerColor, mode === 'canvas' ? state.energy * 1.5 : state.energy);  // More luminous for canvas

        // Extra saturation boost for canvas layers
        if (mode === 'canvas') {
          layerColor.s = Math.min(100, layerColor.s + 10);
          luminousColor.s = Math.min(100, luminousColor.s + 10);
        }

        layerGradient.addColorStop(0, hslToString(luminousColor, layerAlpha * (mode === 'canvas' ? 1 : 0.8)));
        layerGradient.addColorStop(0.5, hslToString(layerColor, layerAlpha * (mode === 'canvas' ? 0.9 : 0.6)));
        layerGradient.addColorStop(1, hslToString(layerColor, layerAlpha * (mode === 'canvas' ? 0.25 : 0.1)));

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = layerGradient;
        ctx.fill();
      }

      if (mode === 'ball') {
        const mainGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, state.radius);
        const energyLevel = isIdle ? 0.1 : audioData.energy;
        const coreColor = toLuminous(getColorFromPalette(vividPalette, 0.2, energyLevel), energyLevel);
        const midColor = getColorFromPalette(vividPalette, 0.5, energyLevel * 0.8);
        const edgeColor = getColorFromPalette(vividPalette, 0.8, energyLevel * 0.6);

        mainGradient.addColorStop(0, hslToString(coreColor, isIdle ? 0.7 : 0.95));
        mainGradient.addColorStop(0.4, hslToString(midColor, isIdle ? 0.6 : 0.85));
        mainGradient.addColorStop(0.7, hslToString(edgeColor, isIdle ? 0.4 : 0.7));
        mainGradient.addColorStop(1, hslToString(edgeColor, isIdle ? 0.15 : 0.3));

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = mainGradient;
        ctx.fill();

        ctx.strokeStyle = hslToString(coreColor, isIdle ? 0.3 : 0.6);
        ctx.lineWidth = isIdle ? 1 : 2 + audioData.energy * 4;
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();

      // Inner core
      if ((!isIdle && audioData.energy > 0.25) || (isIdle && Math.sin(idleTimeRef.current) > 0.5)) {
        const coreIntensity = isIdle ? 0.1 : audioData.energy;
        const coreSize = state.maxRadius * 0.3 * (1 + Math.sin(timeRef.current * 3) * 0.2 * coreIntensity);
        const coreGradient = ctx.createRadialGradient(state.centerX, state.centerY, 0, state.centerX, state.centerY, coreSize);
        const innerCoreColor = toLuminous(getColorFromPalette(vividPalette, 0.1, coreIntensity), isIdle ? 0.3 : (mode === 'canvas' ? 1.5 : 1));

        coreGradient.addColorStop(0, hslToString(innerCoreColor, isIdle ? 0.5 : (mode === 'canvas' ? 0.95 : 0.95)));
        coreGradient.addColorStop(0.5, hslToString(innerCoreColor, isIdle ? 0.3 : (mode === 'canvas' ? 0.7 : 0.65)));
        coreGradient.addColorStop(1, 'transparent');

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(state.centerX, state.centerY, coreSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }

      // Energy rings
      if (!isIdle && audioData.energy > 0.3) {
        const numRings = Math.floor(2 + analysis.texture.layering * (mode === 'canvas' ? 4 : 3));
        for (let i = 0; i < numRings; i++) {
          const avgRadius = state.points.reduce((sum, p) => sum + p.radius, 0) / state.points.length;
          const ringRadius = avgRadius * (1.15 + i * 0.25);
          const ringAlpha = (1 - i * (mode === 'canvas' ? 0.25 : 0.3)) * audioData.energy * (mode === 'canvas' ? 0.5 : 0.35);
          const ringPosition = 0.3 + i * (mode === 'canvas' ? 0.15 : 0.2);
          const ringColor = getColorFromPalette(vividPalette, ringPosition, audioData.energy);

          ctx.strokeStyle = hslToString(ringColor, ringAlpha);
          ctx.lineWidth = 2 + audioData.energy * 2;
          ctx.beginPath();
          ctx.arc(state.centerX, state.centerY, ringRadius + Math.sin(timeRef.current * 2 + i) * (mode === 'canvas' ? 15 : 10), 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Particles
      if (isIdle && Math.random() < (mode === 'canvas' ? 0.015 : 0.008)) {
        const randomPoint = state.points[Math.floor(Math.random() * state.points.length)];
        const x = state.centerX + Math.cos(randomPoint.angle) * randomPoint.radius * 0.8;
        const y = state.centerY + Math.sin(randomPoint.angle) * randomPoint.radius * 0.8;

        state.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          life: 1,
          colorOffset: Math.random(),
          size: 1 + Math.random() * 1.5
        });
      } else if (!isIdle && audioData.energy > 0.35 && Math.random() < audioData.energy * (mode === 'canvas' ? 0.35 : 0.25)) {
        const randomPoint = state.points[Math.floor(Math.random() * state.points.length)];
        const x = state.centerX + Math.cos(randomPoint.angle) * randomPoint.radius;
        const y = state.centerY + Math.sin(randomPoint.angle) * randomPoint.radius;

        state.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * (mode === 'canvas' ? 9 : 7),
          vy: (Math.random() - 0.5) * (mode === 'canvas' ? 9 : 7),
          life: 1,
          colorOffset: Math.random(),
          size: 2 + Math.random() * (mode === 'canvas' ? 5 : 3)
        });
      }

      // Update and render particles
      state.particles = state.particles.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.97;
        particle.vy *= 0.97;
        particle.life -= isIdle ? 0.01 : (mode === 'canvas' ? 0.02 : 0.018);

        if (particle.life <= 0) return false;

        const particleColor = getColorFromPalette(vividPalette, particle.colorOffset, state.energy + 0.3);
        ctx.fillStyle = hslToString(particleColor, particle.life * (mode === 'canvas' ? 0.85 : 0.75));
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
  }, [analyser, isPlaying, mode]);

  return <canvas ref={canvasRef} className="visualizer-canvas" />;
};

export default AudioVisualizer;
*/





















/*
// src/visualizers/AudioVisualizer.jsx
import React, { useEffect, useRef } from 'react';
import {
  generateUniquePalette,
  getColorFromPalette,
  hslToString,
  toLuminous,
  interpolatePalettes
} from '../utils/colorUtils';
import { initNoise, fractalNoise2D } from '../utils/noise';

const AudioVisualizer = ({ analyser, isPlaying, mode = 'ball' }) => {
  const canvasRef = useRef(null);
  const timeRef = useRef(0);
  const idleTimeRef = useRef(0);

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

    const setBackground = (palette) => {
      const bgColor = getColorFromPalette(palette, 0.08, smoothed.energy.current * 0.4);
      const lowSat = Math.max(8, bgColor.s * 0.25);
      const lowL = Math.max(4, bgColor.l - 40);
      canvas.style.background = `hsl(${Math.round(bgColor.h)}, ${Math.round(lowSat)}%, ${Math.round(lowL)}%)`;
    };

    // ==================== BALL IDLE ====================
    const drawBallIdle = () => {
      timeRef.current += 0.016;
      idleTimeRef.current += 0.016;

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
      setBackground(palette);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      const floatY = Math.sin(idleTimeRef.current * 0.6) * 15;
      const breathe = 1 + Math.sin(idleTimeRef.current * 0.8) * 0.08;
      const baseSize = Math.min(canvas.width, canvas.height) * 0.12;
      const radius = baseSize * breathe;

      const hueShift = Math.sin(idleTimeRef.current * 0.15) * 20;
      const coreColor = getColorFromPalette(palette, 0.2, 0.3);
      const driftColor = {
        h: (coreColor.h + hueShift + 360) % 360,
        s: Math.min(100, coreColor.s + 20),
        l: Math.min(70, coreColor.l + 15)
      };

      for (let layer = 0; layer < 3; layer++) {
        const layerScale = 1 + layer * 0.5;
        const layerAlpha = (1 - layer * 0.3) * 0.6;

        const g = ctx.createRadialGradient(
          cx, cy + floatY, 0,
          cx, cy + floatY, radius * layerScale * 2
        );

        g.addColorStop(0, hslToString(toLuminous(driftColor, 1), layerAlpha * 0.9));
        g.addColorStop(0.5, hslToString(driftColor, layerAlpha * 0.6));
        g.addColorStop(1, 'transparent');

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy + floatY, radius * layerScale, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(drawBallIdle);
    };

    // ==================== CANVAS IDLE ====================
    const drawCanvasIdle = () => {
      timeRef.current += 0.016;
      idleTimeRef.current += 0.016;

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
      setBackground(palette);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const points = 120;
      const baseR = Math.min(canvas.width, canvas.height) * 0.15;
      const breathe = 1 + Math.sin(idleTimeRef.current * 0.7) * 0.05;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();

      for (let i = 0; i < points; i++) {
        const a = (i / points) * Math.PI * 2;
        const noise = fractalNoise2D(
          Math.cos(a) * 0.4 + idleTimeRef.current * 0.08,
          Math.sin(a) * 0.4 + idleTimeRef.current * 0.08,
          3, 0.5
        );

        const radius = baseR * breathe * (1 + noise * 0.15);
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const shapeColor = getColorFromPalette(palette, 0.3, 0.25);
      const brightShape = {
        h: shapeColor.h,
        s: Math.min(100, shapeColor.s + 30),
        l: Math.min(68, shapeColor.l + 18)
      };

      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, baseR * 3);
      g.addColorStop(0, hslToString(toLuminous(brightShape, 1), 0.8));
      g.addColorStop(0.5, hslToString(brightShape, 0.6));
      g.addColorStop(1, 'transparent');

      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = g;
      ctx.fill();

      ctx.restore();
      raf = requestAnimationFrame(drawCanvasIdle);
    };

    // ==================== AURORA IDLE ====================
    const drawAuroraIdle = () => {
      timeRef.current += 0.016;
      idleTimeRef.current += 0.016;

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
      setBackground(palette);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;
      const ribbonCount = 4;

      for (let i = 0; i < ribbonCount; i++) {
        const xPos = (i + 1) * (w / (ribbonCount + 1));
        const offset = idleTimeRef.current * 8 + i * 100;
        const colorPos = i / ribbonCount;
        const ribbonColor = getColorFromPalette(palette, colorPos, 0.3);

        const intenseRibbon = {
          h: ribbonColor.h,
          s: Math.min(100, ribbonColor.s + 35),
          l: Math.min(65, ribbonColor.l + 18)
        };

        ctx.strokeStyle = hslToString(intenseRibbon, 0.45);
        ctx.lineWidth = 40;
        ctx.beginPath();

        for (let y = 0; y < h; y += 8) {
          const x = xPos + Math.sin((y + offset) * 0.008) * 80;
          ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = hslToString(intenseRibbon, 0.25);
        ctx.lineWidth = 60;
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }

      raf = requestAnimationFrame(drawAuroraIdle);
    };

    // ==================== BALL ACTIVE ====================
    const drawBall = () => {
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
      if (timeSinceChange > 8 && Math.random() < 0.005) {
        updatePalette({
          bassAvg: smoothed.bass.current / 255,
          midAvg: smoothed.mid.current / 255,
          highAvg: smoothed.treble.current / 255,
          spectralCentroid: 0.3 + (smoothed.treble.current / 255) * 0.7,
          harmonicRichness: Math.min(1, (smoothed.mid.current / 255) * 1.2)
        }, true);
        paletteTransitionRef.current.lastChangeTime = timeRef.current;
      }

      const palette = updatePalette({
        bassAvg: smoothed.bass.current / 255,
        midAvg: smoothed.mid.current / 255,
        highAvg: smoothed.treble.current / 255,
        spectralCentroid: 0.3 + (smoothed.treble.current / 255) * 0.7,
        harmonicRichness: Math.min(1, (smoothed.mid.current / 255) * 1.2)
      });

      setBackground(palette);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const base = Math.min(canvas.width, canvas.height) * 0.06;
      const radius = base + (smoothed.bass.current / 255) * base * 1.2 + Math.sin(timeRef.current * 1.5) * 6;

      const mainColor = getColorFromPalette(palette, 0.2, smoothed.energy.current / 255);
      const midColor = getColorFromPalette(palette, 0.5, smoothed.energy.current / 255);

      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2.2);
      g.addColorStop(0, hslToString(toLuminous(mainColor, 0.9), 0.95));
      g.addColorStop(0.5, hslToString(midColor, 0.85));
      g.addColorStop(1, 'transparent');

      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 2 + (smoothed.energy.current / 255) * 3;
      ctx.strokeStyle = hslToString(mainColor, 0.35);
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
      ctx.stroke();

      timeRef.current += 0.016;
      raf = requestAnimationFrame(drawBall);
    };

    // ==================== CANVAS ACTIVE ====================
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
      if (timeSinceChange > 10 && (smoothed.energy.current / 255) > 0.6 && Math.random() < 0.008) {
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

      setBackground(palette);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      const bassNorm = smoothed.bass.current / 255;
      const midNorm = smoothed.mid.current / 255;
      const trebleNorm = smoothed.treble.current / 255;
      const energyNorm = smoothed.energy.current / 255;

      const baseR = Math.min(w, h) * (0.08 + energyNorm * 0.15);
      const points = 180;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();

      for (let i = 0; i < points; i++) {
        const a = (i / points) * Math.PI * 2;

        const noise1 = fractalNoise2D(
          Math.cos(a) * 0.8 + timeRef.current * 0.25,
          Math.sin(a) * 0.8 + timeRef.current * 0.25,
          6, 0.65
        );
        const noise2 = fractalNoise2D(
          Math.cos(a * 2.5) * 0.5 - timeRef.current * 0.15,
          Math.sin(a * 2.5) * 0.5 + timeRef.current * 0.18,
          4, 0.6
        );

        const melodyInfluence = trebleNorm * 1.2 * Math.sin(a * 8 + timeRef.current * 4);
        const harmonyInfluence = midNorm * 1.8 * Math.sin(a * 2.2 + timeRef.current * 0.8);
        const rhythmInfluence = bassNorm * 2.0 * Math.cos(a * 2.5 + timeRef.current * 2.2);

        const radius = baseR +
          noise1 * baseR * (1.2 + energyNorm * 2.5) +
          noise2 * baseR * 0.9 +
          melodyInfluence * baseR * 0.6 +
          harmonyInfluence * baseR * 0.8 +
          rhythmInfluence * baseR * 1.2;

        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const layerColor = getColorFromPalette(palette, 0.25, energyNorm);
      const luminous = toLuminous(layerColor, 1.2);

      const superLuminous = {
        h: luminous.h,
        s: Math.min(100, luminous.s + 35),
        l: Math.min(75, luminous.l + 20)
      };
      const brightLayer = {
        h: layerColor.h,
        s: Math.min(100, layerColor.s + 30),
        l: Math.min(70, layerColor.l + 15)
      };

      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, baseR * 6);
      g.addColorStop(0, hslToString(superLuminous, 0.95));
      g.addColorStop(0.45, hslToString(brightLayer, 0.85));
      g.addColorStop(1, 'transparent');

      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = g;
      ctx.fill();

      ctx.strokeStyle = hslToString(superLuminous, 0.7);
      ctx.lineWidth = 3 + energyNorm * 5;
      ctx.stroke();

      ctx.restore();

      if (trebleNorm > 0.3) {
        const sparkCount = Math.floor(trebleNorm * 25);
        for (let i = 0; i < sparkCount; i++) {
          const sparkColor = getColorFromPalette(palette, Math.random(), energyNorm);
          const brightSpark = {
            h: sparkColor.h,
            s: Math.min(100, sparkColor.s + 40),
            l: Math.min(80, sparkColor.l + 25)
          };

          const sx = cx + (Math.random() - 0.5) * w * 0.8;
          const sy = cy + (Math.random() - 0.5) * h * 0.8;
          const size = 2 + Math.random() * 4;

          ctx.fillStyle = hslToString(brightSpark, 0.8 + Math.random() * 0.2);
          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (midNorm > 0.2) {
        const curveColor = getColorFromPalette(palette, 0.5, energyNorm);
        const vividCurve = {
          h: curveColor.h,
          s: Math.min(100, curveColor.s + 35),
          l: Math.min(65, curveColor.l + 18)
        };

        ctx.strokeStyle = hslToString(vividCurve, 0.7 + midNorm * 0.3);
        ctx.lineWidth = 4 + midNorm * 6;
        ctx.beginPath();

        for (let x = 0; x < w; x += 25) {
          const y = cy + Math.sin((x + timeRef.current * 60) * 0.015) * 120 * midNorm;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      if (bassNorm > 0.25) {
        const ringColor = getColorFromPalette(palette, 0.8, energyNorm);
        const saturatedRing = {
          h: ringColor.h,
          s: Math.min(100, ringColor.s + 30),
          l: Math.min(60, ringColor.l + 12)
        };

        const expansion = bassNorm * 250;
        ctx.strokeStyle = hslToString(saturatedRing, bassNorm * 0.8);
        ctx.lineWidth = 6 + bassNorm * 8;

        const lineCount = 8;
        for (let i = 0; i < lineCount; i++) {
          const angle = (i / lineCount) * Math.PI * 2;
          const dist = 100 + expansion;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist);
          ctx.stroke();
        }
      }

      timeRef.current += 0.016;
      raf = requestAnimationFrame(drawCanvas);
    };

    // ==================== AURORA ACTIVE ====================
    const drawAurora = () => {
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
      if (timeSinceChange > 12 && smoothed.mid.current / 255 > 0.5 && Math.random() < 0.006) {
        updatePalette({
          bassAvg: smoothed.bass.current / 255,
          midAvg: smoothed.mid.current / 255,
          highAvg: smoothed.treble.current / 255,
          spectralCentroid: 0.2 + (smoothed.treble.current / 255) * 0.8,
          harmonicRichness: Math.min(1, (smoothed.mid.current / 255))
        }, true);
        paletteTransitionRef.current.lastChangeTime = timeRef.current;
      }

      const palette = updatePalette({
        bassAvg: smoothed.bass.current / 255,
        midAvg: smoothed.mid.current / 255,
        highAvg: smoothed.treble.current / 255,
        spectralCentroid: 0.2 + (smoothed.treble.current / 255) * 0.8,
        harmonicRichness: Math.min(1, (smoothed.mid.current / 255))
      });

      setBackground(palette);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      const bassNorm = smoothed.bass.current / 255;
      const midNorm = smoothed.mid.current / 255;
      const trebleNorm = smoothed.treble.current / 255;
      const energyNorm = smoothed.energy.current / 255;

      const ribbonCount = 6 + Math.floor(midNorm * 8);

      for (let i = 0; i < ribbonCount; i++) {
        const xPos = (i + 1) * (w / (ribbonCount + 1));
        const offset = timeRef.current * (40 + bassNorm * 80) + i * 150;
        const colorPos = i / ribbonCount;
        const ribbonColor = getColorFromPalette(palette, colorPos * 0.7 + 0.2, energyNorm);

        const intenseAurora = {
          h: ribbonColor.h + midNorm * 30,
          s: Math.min(100, ribbonColor.s + 45),
          l: Math.min(70, ribbonColor.l + 22)
        };

        const baseAmplitude = 100;
        const dynamicAmplitude = baseAmplitude +
          bassNorm * 120 +
          trebleNorm * 60 * Math.sin(i * 0.3 + timeRef.current);

        ctx.strokeStyle = hslToString(intenseAurora, 0.5 + energyNorm * 0.35);
        ctx.lineWidth = 32 + i * 6 + midNorm * 18;
        ctx.beginPath();

        for (let y = 0; y < h; y += 5) {
          const noise = fractalNoise2D(
            i * 0.2 + timeRef.current * 0.12,
            y * 0.002 + timeRef.current * 0.1,
            3, 0.5
          );

          const x = xPos +
            Math.sin((y + offset) * 0.009) * dynamicAmplitude +
            noise * 40 * midNorm;

          ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = hslToString(intenseAurora, 0.3 + energyNorm * 0.2);
        ctx.lineWidth = (32 + i * 6 + midNorm * 18) * 1.8;
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }

      if (trebleNorm > 0.3) {
        const shimmerCount = Math.floor(trebleNorm * 30);
        for (let i = 0; i < shimmerCount; i++) {
          const shimmerColor = getColorFromPalette(palette, Math.random(), energyNorm);
          const brightShimmer = {
            h: shimmerColor.h,
            s: Math.min(100, shimmerColor.s + 45),
            l: Math.min(85, shimmerColor.l + 28)
          };

          const sx = Math.random() * w;
          const sy = Math.random() * h;
          const size = 1 + Math.random() * 3;

          ctx.fillStyle = hslToString(brightShimmer, 0.7 + Math.random() * 0.3);
          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
export default AudioVisualizer;
*/











/*
// src/visualizers/AudioVisualizer.jsx
import React, { useEffect, useRef } from 'react';
import {
  generateUniquePalette,
  getColorFromPalette,
  hslToString,
  toLuminous,
  interpolatePalettes
} from '../utils/colorUtils';
import { initNoise, fractalNoise2D } from '../utils/noise';

const AudioVisualizer = ({ analyser, isPlaying, mode = 'ball' }) => {
  const canvasRef = useRef(null);
  const timeRef = useRef(0);
  const idleTimeRef = useRef(0);

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

    const setBackground = (palette) => {
      if (!palette) return;
      const bgColor = getColorFromPalette(palette, 0.08, smoothed.energy.current * 0.4);
      const lowSat = Math.max(8, bgColor.s * 0.25);
      const lowL = Math.max(4, bgColor.l - 40);
      canvas.style.background = `hsl(${Math.round(bgColor.h)}, ${Math.round(lowSat)}%, ${Math.round(lowL)}%)`;
    };

    // BALL IDLE
    const drawBallIdle = () => {
      timeRef.current += 0.016;
      idleTimeRef.current += 0.016;

      if (!paletteTransitionRef.current.current) {
        updatePalette({
          bassAvg: 0.2, midAvg: 0.25, highAvg: 0.25,
          spectralCentroid: 0.5, harmonicRichness: 0.2
        });
      }

      const palette = paletteTransitionRef.current.current;
      setBackground(palette);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const floatY = Math.sin(idleTimeRef.current * 0.6) * 15;
      const breathe = 1 + Math.sin(idleTimeRef.current * 0.8) * 0.08;
      const baseSize = Math.min(canvas.width, canvas.height) * 0.12;
      const radius = baseSize * breathe;

      const hueShift = Math.sin(idleTimeRef.current * 0.15) * 20;
      const coreColor = getColorFromPalette(palette, 0.2, 0.3);
      const driftColor = {
        h: (coreColor.h + hueShift + 360) % 360,
        s: Math.min(100, coreColor.s + 20),
        l: Math.min(70, coreColor.l + 15)
      };

      for (let layer = 0; layer < 3; layer++) {
        const layerScale = 1 + layer * 0.5;
        const layerAlpha = (1 - layer * 0.3) * 0.6;
        const g = ctx.createRadialGradient(cx, cy + floatY, 0, cx, cy + floatY, radius * layerScale * 2);
        g.addColorStop(0, hslToString(toLuminous(driftColor, 1), layerAlpha * 0.9));
        g.addColorStop(0.5, hslToString(driftColor, layerAlpha * 0.6));
        g.addColorStop(1, 'transparent');
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy + floatY, radius * layerScale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(drawBallIdle);
    };

    // CANVAS IDLE
    const drawCanvasIdle = () => {
      timeRef.current += 0.016;
      idleTimeRef.current += 0.016;

      if (!paletteTransitionRef.current.current) {
        updatePalette({
          bassAvg: 0.2, midAvg: 0.25, highAvg: 0.25,
          spectralCentroid: 0.5, harmonicRichness: 0.2
        });
      }

      const palette = paletteTransitionRef.current.current;
      setBackground(palette);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const points = 120;
      const baseR = Math.min(canvas.width, canvas.height) * 0.15;
      const breathe = 1 + Math.sin(idleTimeRef.current * 0.7) * 0.05;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();

      for (let i = 0; i < points; i++) {
        const a = (i / points) * Math.PI * 2;
        const noise = fractalNoise2D(
          Math.cos(a) * 0.4 + idleTimeRef.current * 0.08,
          Math.sin(a) * 0.4 + idleTimeRef.current * 0.08, 3, 0.5
        );
        const radius = baseR * breathe * (1 + noise * 0.15);
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const shapeColor = getColorFromPalette(palette, 0.3, 0.25);
      const brightShape = {
        h: shapeColor.h,
        s: Math.min(100, shapeColor.s + 30),
        l: Math.min(68, shapeColor.l + 18)
      };

      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, baseR * 3);
      g.addColorStop(0, hslToString(toLuminous(brightShape, 1), 0.8));
      g.addColorStop(0.5, hslToString(brightShape, 0.6));
      g.addColorStop(1, 'transparent');
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
      raf = requestAnimationFrame(drawCanvasIdle);
    };

    // AURORA IDLE
    const drawAuroraIdle = () => {
      timeRef.current += 0.016;
      idleTimeRef.current += 0.016;

      if (!paletteTransitionRef.current.current) {
        updatePalette({
          bassAvg: 0.2, midAvg: 0.25, highAvg: 0.25,
          spectralCentroid: 0.5, harmonicRichness: 0.2
        });
      }

      const palette = paletteTransitionRef.current.current;
      setBackground(palette);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;
      const ribbonCount = 4;

      for (let i = 0; i < ribbonCount; i++) {
        const xPos = (i + 1) * (w / (ribbonCount + 1));
        const offset = idleTimeRef.current * 8 + i * 100;
        const colorPos = i / ribbonCount;
        const ribbonColor = getColorFromPalette(palette, colorPos, 0.3);
        const intenseRibbon = {
          h: ribbonColor.h,
          s: Math.min(100, ribbonColor.s + 35),
          l: Math.min(65, ribbonColor.l + 18)
        };

        ctx.strokeStyle = hslToString(intenseRibbon, 0.45);
        ctx.lineWidth = 40;
        ctx.beginPath();
        for (let y = 0; y < h; y += 8) {
          const x = xPos + Math.sin((y + offset) * 0.008) * 80;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = hslToString(intenseRibbon, 0.25);
        ctx.lineWidth = 60;
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
      raf = requestAnimationFrame(drawAuroraIdle);
    };

    // BALL ACTIVE
    const drawBall = () => {
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
      if (timeSinceChange > 8 && Math.random() < 0.005) {
        updatePalette({
          bassAvg: smoothed.bass.current / 255,
          midAvg: smoothed.mid.current / 255,
          highAvg: smoothed.treble.current / 255,
          spectralCentroid: 0.3 + (smoothed.treble.current / 255) * 0.7,
          harmonicRichness: Math.min(1, (smoothed.mid.current / 255) * 1.2)
        }, true);
        paletteTransitionRef.current.lastChangeTime = timeRef.current;
      }

      const palette = updatePalette({
        bassAvg: smoothed.bass.current / 255,
        midAvg: smoothed.mid.current / 255,
        highAvg: smoothed.treble.current / 255,
        spectralCentroid: 0.3 + (smoothed.treble.current / 255) * 0.7,
        harmonicRichness: Math.min(1, (smoothed.mid.current / 255) * 1.2)
      });

      setBackground(palette);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const base = Math.min(canvas.width, canvas.height) * 0.06;
      const radius = base + (smoothed.bass.current / 255) * base * 1.2 + Math.sin(timeRef.current * 1.5) * 6;

      const mainColor = getColorFromPalette(palette, 0.2, smoothed.energy.current / 255);
      const midColor = getColorFromPalette(palette, 0.5, smoothed.energy.current / 255);

      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2.2);
      g.addColorStop(0, hslToString(toLuminous(mainColor, 0.9), 0.95));
      g.addColorStop(0.5, hslToString(midColor, 0.85));
      g.addColorStop(1, 'transparent');

      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 2 + (smoothed.energy.current / 255) * 3;
      ctx.strokeStyle = hslToString(mainColor, 0.35);
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
      ctx.stroke();

      timeRef.current += 0.016;
      raf = requestAnimationFrame(drawBall);
    };

    // CANVAS ACTIVE
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
      if (timeSinceChange > 10 && (smoothed.energy.current / 255) > 0.6 && Math.random() < 0.008) {
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

      setBackground(palette);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const bassNorm = smoothed.bass.current / 255;
      const midNorm = smoothed.mid.current / 255;
      const trebleNorm = smoothed.treble.current / 255;
      const energyNorm = smoothed.energy.current / 255;
      const baseR = Math.min(w, h) * (0.08 + energyNorm * 0.15);
      const points = 180;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();

      for (let i = 0; i < points; i++) {
        const a = (i / points) * Math.PI * 2;
        const noise1 = fractalNoise2D(Math.cos(a) * 0.8 + timeRef.current * 0.25, Math.sin(a) * 0.8 + timeRef.current * 0.25, 6, 0.65);
        const noise2 = fractalNoise2D(Math.cos(a * 2.5) * 0.5 - timeRef.current * 0.15, Math.sin(a * 2.5) * 0.5 + timeRef.current * 0.18, 4, 0.6);
        const melodyInfluence = trebleNorm * 1.2 * Math.sin(a * 8 + timeRef.current * 4);
        const harmonyInfluence = midNorm * 1.8 * Math.sin(a * 2.2 + timeRef.current * 0.8);
        const rhythmInfluence = bassNorm * 2.0 * Math.cos(a * 2.5 + timeRef.current * 2.2);
        const radius = baseR + noise1 * baseR * (1.2 + energyNorm * 2.5) + noise2 * baseR * 0.9 + melodyInfluence * baseR * 0.6 + harmonyInfluence * baseR * 0.8 + rhythmInfluence * baseR * 1.2;
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const layerColor = getColorFromPalette(palette, 0.25, energyNorm);
      const luminous = toLuminous(layerColor, 1.2);
      const superLuminous = { h: luminous.h, s: Math.min(100, luminous.s + 35), l: Math.min(75, luminous.l + 20) };
      const brightLayer = { h: layerColor.h, s: Math.min(100, layerColor.s + 30), l: Math.min(70, layerColor.l + 15) };

      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, baseR * 6);
      g.addColorStop(0, hslToString(superLuminous, 0.95));
      g.addColorStop(0.45, hslToString(brightLayer, 0.85));
      g.addColorStop(1, 'transparent');

      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = hslToString(superLuminous, 0.7);
      ctx.lineWidth = 3 + energyNorm * 5;
      ctx.stroke();
      ctx.restore();

      if (trebleNorm > 0.3) {
        const sparkCount = Math.floor(trebleNorm * 25);
        for (let i = 0; i < sparkCount; i++) {
          const sparkColor = getColorFromPalette(palette, Math.random(), energyNorm);
          const brightSpark = { h: sparkColor.h, s: Math.min(100, sparkColor.s + 40), l: Math.min(80, sparkColor.l + 25) };
          const sx = cx + (Math.random() - 0.5) * w * 0.8;
          const sy = cy + (Math.random() - 0.5) * h * 0.8;
          const size = 2 + Math.random() * 4;
          ctx.fillStyle = hslToString(brightSpark, 0.8 + Math.random() * 0.2);
          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (midNorm > 0.2) {
        const curveColor = getColorFromPalette(palette, 0.5, energyNorm);
        const vividCurve = { h: curveColor.h, s: Math.min(100, curveColor.s + 35), l: Math.min(65, curveColor.l + 18) };
        ctx.strokeStyle = hslToString(vividCurve, 0.7 + midNorm * 0.3);
        ctx.lineWidth = 4 + midNorm * 6;
        ctx.beginPath();
        for (let x = 0; x < w; x += 25) {
          const y = cy + Math.sin((x + timeRef.current * 60) * 0.015) * 120 * midNorm;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      if (bassNorm > 0.25) {
        const ringColor = getColorFromPalette(palette, 0.8, energyNorm);
        const saturatedRing = { h: ringColor.h, s: Math.min(100, ringColor.s + 30), l: Math.min(60, ringColor.l + 12) };
        const expansion = bassNorm * 250;
        ctx.strokeStyle = hslToString(saturatedRing, bassNorm * 0.8);
        ctx.lineWidth = 6 + bassNorm * 8;
        const lineCount = 8;
        for (let i = 0; i < lineCount; i++) {
          const angle = (i / lineCount) * Math.PI * 2;
          const dist = 100 + expansion;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist);
          ctx.stroke();
        }
      }

      timeRef.current += 0.016;
      raf = requestAnimationFrame(drawCanvas);
    };

    // AURORA ACTIVE
    const drawAurora = () => {
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
      if (timeSinceChange > 12 && smoothed.mid.current / 255 > 0.5 && Math.random() < 0.006) {
        updatePalette({
          bassAvg: smoothed.bass.current / 255,
          midAvg: smoothed.mid.current / 255,
          highAvg: smoothed.treble.current / 255,
          spectralCentroid: 0.2 + (smoothed.treble.current / 255) * 0.8,
          harmonicRichness: Math.min(1, (smoothed.mid.current / 255))
        }, true);
        paletteTransitionRef.current.lastChangeTime = timeRef.current;
      }

      const palette = updatePalette({
        bassAvg: smoothed.bass.current / 255,
        midAvg: smoothed.mid.current / 255,
        highAvg: smoothed.treble.current / 255,
        spectralCentroid: 0.2 + (smoothed.treble.current / 255) * 0.8,
        harmonicRichness: Math.min(1, (smoothed.mid.current / 255))
      });

      setBackground(palette);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;
      const bassNorm = smoothed.bass.current / 255;
      const midNorm = smoothed.mid.current / 255;
      const trebleNorm = smoothed.treble.current / 255;
      const energyNorm = smoothed.energy.current / 255;
      const ribbonCount = 6 + Math.floor(midNorm * 8);

      for (let i = 0; i < ribbonCount; i++) {
        const xPos = (i + 1) * (w / (ribbonCount + 1));
        const offset = timeRef.current * (40 + bassNorm * 80) + i * 150;
        const colorPos = i / ribbonCount;
        const ribbonColor = getColorFromPalette(palette, colorPos * 0.7 + 0.2, energyNorm);
        const intenseAurora = { h: ribbonColor.h + midNorm * 30, s: Math.min(100, ribbonColor.s + 45), l: Math.min(70, ribbonColor.l + 22) };
        const baseAmplitude = 100;
        const dynamicAmplitude = baseAmplitude + bassNorm * 120 + trebleNorm * 60 * Math.sin(i * 0.3 + timeRef.current);

        ctx.strokeStyle = hslToString(intenseAurora, 0.5 + energyNorm * 0.35);
        ctx.lineWidth = 32 + i * 6 + midNorm * 18;
        ctx.beginPath();

        for (let y = 0; y < h; y += 5) {
          const noise = fractalNoise2D(i * 0.2 + timeRef.current * 0.12, y * 0.002 + timeRef.current * 0.1, 3, 0.5);
          const x = xPos + Math.sin((y + offset) * 0.009) * dynamicAmplitude + noise * 40 * midNorm;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = hslToString(intenseAurora, 0.3 + energyNorm * 0.2);
        ctx.lineWidth = (32 + i * 6 + midNorm * 18) * 1.8;
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }

      if (trebleNorm > 0.3) {
        const shimmerCount = Math.floor(trebleNorm * 30);
        for (let i = 0; i < shimmerCount; i++) {
          const shimmerColor = getColorFromPalette(palette, Math.random(), energyNorm);
          const brightShimmer = { h: shimmerColor.h, s: Math.min(100, shimmerColor.s + 45), l: Math.min(85, shimmerColor.l + 28) };
          const sx = Math.random() * w;
          const sy = Math.random() * h;
          const size = 1 + Math.random() * 3;
          ctx.fillStyle = hslToString(brightShimmer, 0.7 + Math.random() * 0.3);
          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      timeRef.current += 0.016;
      raf = requestAnimationFrame(drawAurora);
    };

    // MAIN LOOP
    const loop = () => {
      if (!analyser || !isPlaying) {
        cancelAnimationFrame(raf);
        if (mode === 'ball') raf = requestAnimationFrame(drawBallIdle);
        else if (mode === 'canvas') raf = requestAnimationFrame(drawCanvasIdle);
        else if (mode === 'aurora') raf = requestAnimationFrame(drawAuroraIdle);
        return;
      }

      cancelAnimationFrame(raf);
      if (mode === 'ball') raf = requestAnimationFrame(drawBall);
      else if (mode === 'canvas') raf = requestAnimationFrame(drawCanvas);
      else if (mode === 'aurora') raf = requestAnimationFrame(drawAurora);
    };

    loop();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, [analyser, isPlaying, mode]);

  return <canvas ref={canvasRef} className="visualizer-canvas" style={{ position: 'absolute', inset: 0 }} />;
};

export default AudioVisualizer;
*/


























/*
import React, { useEffect, useRef } from 'react';
import { generateUniquePalette, getColorFromPalette, hslToString, toLuminous, interpolatePalettes } from '../utils/colorUtils';
import { initNoise, fractalNoise2D } from '../utils/noise';

const AudioVisualizer = ({ analyser, isPlaying, mode = 'ball' }) => {
  const canvasRef = useRef(null);
  const timeRef = useRef(0);
  const smoothed = { energy: useRef(0), bass: useRef(0), mid: useRef(0), treble: useRef(0) };
  const paletteTransitionRef = useRef({ current: null, next: null, progress: 1, lastChangeTime: 0 });
  const bgColorRef = useRef({ h: 200, s: 20, l: 8 }); // For smooth ball background

  useEffect(() => {
    initNoise(Date.now() + Math.random() * 10000);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf = null;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const bufferLength = analyser ? analyser.frequencyBinCount : 2048;
    const dataArray = new Uint8Array(bufferLength);
    const smooth = (ref, target, speed = 0.12) => { ref.current += (target - ref.current) * speed; };

    const updatePalette = (sig, forceNew = false) => {
      const t = paletteTransitionRef.current;
      if (forceNew || !t.current) {
        const newP = generateUniquePalette(sig);
        if (t.current && t.progress >= 1) { t.next = newP; t.progress = 0; }
        else { t.current = newP; t.progress = 1; }
      }
      if (t.next && t.progress < 1) {
        t.progress += 0.003;
        if (t.progress >= 1) { t.current = t.next; t.next = null; t.progress = 1; }
      }
      return (t.next && t.progress < 1) ? interpolatePalettes(t.current, t.next, t.progress) : t.current;
    };

    const setBackgroundSmooth = (palette) => {
      if (!palette) return;
      const tgt = getColorFromPalette(palette, 0.08, smoothed.energy.current * 0.4);
      const bg = bgColorRef.current;
      bg.h += (tgt.h - bg.h) * 0.02;
      bg.s += (Math.max(8, tgt.s * 0.25) - bg.s) * 0.02;
      bg.l += (Math.max(4, tgt.l - 40) - bg.l) * 0.02;
      canvas.style.background = `hsl(${Math.round(bg.h)}, ${Math.round(bg.s)}%, ${Math.round(bg.l)}%)`;
    };

    // BALL IDLE/ACTIVE combined
    const drawBall = (idle = false) => {
      timeRef.current += 0.016;
      if (!paletteTransitionRef.current.current) updatePalette({ bassAvg: 0.2, midAvg: 0.25, highAvg: 0.25, spectralCentroid: 0.5, harmonicRichness: 0.2 });

      if (!idle) {
        analyser.getByteFrequencyData(dataArray);
        const bassRange = Math.floor(bufferLength * 0.12);
        const midEnd = Math.floor(bufferLength * 0.45);
        const bassAvg = dataArray.slice(0, bassRange).reduce((a,b)=>a+b,0) / bassRange;
        const midAvg = dataArray.slice(bassRange, midEnd).reduce((a,b)=>a+b,0) / (midEnd - bassRange);
        const trebleAvg = dataArray.slice(midEnd).reduce((a,b)=>a+b,0) / (bufferLength - midEnd);
        const energy = dataArray.reduce((a,b)=>a+b,0) / bufferLength;
        smooth(smoothed.bass, bassAvg); smooth(smoothed.mid, midAvg); smooth(smoothed.treble, trebleAvg); smooth(smoothed.energy, energy, 0.09);

        if (timeRef.current - paletteTransitionRef.current.lastChangeTime > 8 && Math.random() < 0.005) {
          updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.3 + smoothed.treble.current/255*0.7, harmonicRichness: Math.min(1, smoothed.mid.current/255*1.2) }, true);
          paletteTransitionRef.current.lastChangeTime = timeRef.current;
        }
      }

      const palette = updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.3, harmonicRichness: 0.3 });
      setBackgroundSmooth(palette);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2, cy = canvas.height / 2;
      const breathe = 1 + Math.sin(timeRef.current * 0.8) * 0.08;
      const base = Math.min(canvas.width, canvas.height) * (idle ? 0.12 : 0.06);
      const radius = base * breathe + (idle ? 0 : (smoothed.bass.current / 255) * base * 1.2);
      const mainColor = getColorFromPalette(palette, 0.2, smoothed.energy.current / 255);

      for (let layer = 0; layer < 3; layer++) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * (1 + layer * 0.5) * 2);
        const layerAlpha = (1 - layer * 0.3) * 0.6;
        g.addColorStop(0, hslToString(toLuminous(mainColor, 1), layerAlpha * 0.9));
        g.addColorStop(0.5, hslToString(mainColor, layerAlpha * 0.6));
        g.addColorStop(1, 'transparent');
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * (1 + layer * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(() => drawBall(idle));
    };

    // CANVAS - Living fullscreen neon gradient
    const drawCanvas = (idle = false) => {
      timeRef.current += 0.016;
      if (!paletteTransitionRef.current.current) updatePalette({ bassAvg: 0.2, midAvg: 0.25, highAvg: 0.25, spectralCentroid: 0.5, harmonicRichness: 0.2 });

      if (!idle) {
        analyser.getByteFrequencyData(dataArray);
        const bassRange = Math.floor(bufferLength * 0.12);
        const midEnd = Math.floor(bufferLength * 0.45);
        const bassAvg = dataArray.slice(0, bassRange).reduce((a,b)=>a+b,0) / bassRange;
        const midAvg = dataArray.slice(bassRange, midEnd).reduce((a,b)=>a+b,0) / (midEnd - bassRange);
        const trebleAvg = dataArray.slice(midEnd).reduce((a,b)=>a+b,0) / (bufferLength - midEnd);
        const energy = dataArray.reduce((a,b)=>a+b,0) / bufferLength;
        smooth(smoothed.bass, bassAvg); smooth(smoothed.mid, midAvg); smooth(smoothed.treble, trebleAvg); smooth(smoothed.energy, energy, 0.09);

        if (timeRef.current - paletteTransitionRef.current.lastChangeTime > 6 && smoothed.energy.current/255 > 0.5 && Math.random() < 0.01) {
          updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.2 + smoothed.treble.current/255*0.8, harmonicRichness: Math.min(1, smoothed.mid.current/255*1.2) }, true);
          paletteTransitionRef.current.lastChangeTime = timeRef.current;
        }
      }

      const palette = updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.3, harmonicRichness: 0.3 });
      const w = canvas.width, h = canvas.height;
      const energyNorm = smoothed.energy.current / 255;
      const bassNorm = smoothed.bass.current / 255;
      const midNorm = smoothed.mid.current / 255;

      const blobCount = idle ? 5 : 8 + Math.floor(energyNorm * 6);
      for (let i = 0; i < blobCount; i++) {
        const color = getColorFromPalette(palette, i / blobCount, idle ? 0.3 : energyNorm);
        const neon = { h: color.h + (idle ? Math.sin(timeRef.current*0.2+i)*15 : midNorm*40*Math.sin(timeRef.current*0.5+i)), s: Math.min(100, color.s + (idle?30:45)), l: Math.min(idle?65:80, color.l + (idle?15:25)) };

        const xNoise = fractalNoise2D(i*0.3 + timeRef.current*0.2, timeRef.current*0.15, 4, 0.6);
        const yNoise = fractalNoise2D(i*0.4, timeRef.current*0.18+i, 4, 0.6);
        const cx = w*((i/blobCount)+0.1) + xNoise*w*0.4 + Math.sin(timeRef.current*0.8+i*0.5)*w*0.2*(idle?0:bassNorm);
        const cy = h*0.5 + yNoise*h*0.4 + Math.cos(timeRef.current*0.6+i*0.7)*h*0.2*(idle?0:midNorm);
        const radius = Math.max(w,h) * (idle?0.4:0.35) * (idle ? 1+Math.sin(timeRef.current*0.3+i)*0.1 : 1+bassNorm*0.5+midNorm*0.3*Math.sin(timeRef.current*2+i));

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        g.addColorStop(0, hslToString(toLuminous(neon, idle?1:1.5), idle?0.15:(0.4+energyNorm*0.3)));
        g.addColorStop(0.3, hslToString(neon, idle?0.08:(0.3+energyNorm*0.2)));
        g.addColorStop(0.7, hslToString(neon, 0.15));
        g.addColorStop(1, 'transparent');
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = idle ? 'rgba(0,0,0,0.02)' : `rgba(0,0,0,${0.03-energyNorm*0.02})`;
      ctx.fillRect(0, 0, w, h);
      raf = requestAnimationFrame(() => drawCanvas(idle));
    };

    // AURORA - Plasma liquid fire
    const drawAurora = (idle = false) => {
      timeRef.current += 0.016;
      if (!paletteTransitionRef.current.current) updatePalette({ bassAvg: 0.2, midAvg: 0.25, highAvg: 0.25, spectralCentroid: 0.5, harmonicRichness: 0.2 });

      if (!idle) {
        analyser.getByteFrequencyData(dataArray);
        const bassRange = Math.floor(bufferLength * 0.12);
        const midEnd = Math.floor(bufferLength * 0.45);
        const bassAvg = dataArray.slice(0, bassRange).reduce((a,b)=>a+b,0) / bassRange;
        const midAvg = dataArray.slice(bassRange, midEnd).reduce((a,b)=>a+b,0) / (midEnd - bassRange);
        const trebleAvg = dataArray.slice(midEnd).reduce((a,b)=>a+b,0) / (bufferLength - midEnd);
        const energy = dataArray.reduce((a,b)=>a+b,0) / bufferLength;
        smooth(smoothed.bass, bassAvg); smooth(smoothed.mid, midAvg); smooth(smoothed.treble, trebleAvg); smooth(smoothed.energy, energy, 0.09);

        if (timeRef.current - paletteTransitionRef.current.lastChangeTime > 8 && smoothed.mid.current/255 > 0.4 && Math.random() < 0.008) {
          updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.2 + smoothed.treble.current/255*0.8, harmonicRichness: Math.min(1, smoothed.mid.current/255) }, true);
          paletteTransitionRef.current.lastChangeTime = timeRef.current;
        }
      }

      const palette = updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.3, harmonicRichness: 0.3 });
      const w = canvas.width, h = canvas.height;
      const bassNorm = smoothed.bass.current / 255;
      const midNorm = smoothed.mid.current / 255;
      const trebleNorm = smoothed.treble.current / 255;
      const energyNorm = smoothed.energy.current / 255;

      ctx.fillStyle = idle ? 'rgba(0,0,0,0.08)' : `rgba(0,0,0,${0.12-energyNorm*0.08})`;
      ctx.fillRect(0, 0, w, h);

      const flameCount = idle ? 6 : 8 + Math.floor(midNorm * 12);
      for (let i = 0; i < flameCount; i++) {
        const xBase = w * ((i / flameCount) + (idle?0:Math.random()*0.05));
        const color = getColorFromPalette(palette, i / flameCount, idle ? 0.35 : energyNorm);
        const plasma = { h: color.h + (idle?0:midNorm*50*Math.sin(timeRef.current+i*0.5)), s: Math.min(100, color.s + (idle?40:50)), l: Math.min(idle?75:80, color.l + (idle?20:28)) };
        const flameWidth = (idle?40:20) + (idle?0:bassNorm*40+midNorm*30) + Math.sin(timeRef.current*2+i)*15;

        ctx.strokeStyle = hslToString(plasma, idle ? 0.4 : 0.4+energyNorm*0.5+bassNorm*0.3);
        ctx.lineWidth = flameWidth;
        ctx.beginPath();

        for (let y = h; y >= 0; y -= (idle?8:6)) {
          const progress = 1 - (y / h);
          const n1 = fractalNoise2D(i*0.4 + timeRef.current*(idle?0.08:0.15+bassNorm*0.2), y*0.002 + timeRef.current*(idle?0.1:0.18+midNorm*0.15), 4, 0.65);
          const n2 = fractalNoise2D(i*0.6 - timeRef.current*0.1, y*0.003 + timeRef.current*0.12, 3, 0.5);
          const spread = progress * (idle?120:150+bassNorm*200);
          const x = xBase + n1*spread + n2*80*(idle?0:midNorm) + Math.sin((y*0.008 + timeRef.current*(idle?0.5:1.2+trebleNorm) + i*0.5)) * (idle?60:100+bassNorm*150);
          ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = hslToString(plasma, (idle?0.4:0.4+energyNorm*0.5)*0.6);
        ctx.lineWidth = flameWidth * 2.5;
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }

      if (!idle && trebleNorm > 0.25) {
        const emberCount = Math.floor(trebleNorm * 40);
        for (let i = 0; i < emberCount; i++) {
          const color = getColorFromPalette(palette, Math.random(), energyNorm);
          const ember = { h: color.h, s: Math.min(100, color.s + 50), l: Math.min(90, color.l + 35) };
          const ex = Math.random() * w, ey = h - Math.random() * h * (0.5 + energyNorm * 0.5);
          const size = 1 + Math.random() * 4 + bassNorm * 3;
          ctx.globalCompositeOperation = 'screen';
          const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, size * 3);
          g.addColorStop(0, hslToString(ember, 0.9));
          g.addColorStop(0.5, hslToString(ember, 0.4));
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(ex, ey, size * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
      }

      raf = requestAnimationFrame(() => drawAurora(idle));
    };

    const loop = () => {
      const idle = !analyser || !isPlaying;
      cancelAnimationFrame(raf);
      if (mode === 'ball') raf = requestAnimationFrame(() => drawBall(idle));
      else if (mode === 'canvas') raf = requestAnimationFrame(() => drawCanvas(idle));
      else if (mode === 'aurora') raf = requestAnimationFrame(() => drawAurora(idle));
    };

    loop();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, [analyser, isPlaying, mode]);

  return <canvas ref={canvasRef} className="visualizer-canvas" style={{ position: 'absolute', inset: 0 }} />;
};

export default AudioVisualizer;
*/


// src/visualizers/AudioVisualizer.jsx
/*
import React, { useEffect, useRef } from 'react';
import {
  generateUniquePalette,
  getColorFromPalette,
  hslToString,
  toLuminous,
  interpolatePalettes
} from '../utils/colorUtils';
import { initNoise, fractalNoise2D } from '../utils/noise';

const AudioVisualizer = ({ analyser, isPlaying, mode = 'ball' }) => {
  const canvasRef = useRef(null);
  const timeRef = useRef(0);
  // Smoothed audio data references
  const smoothed = {
    energy: useRef(0),
    bass: useRef(0),
    mid: useRef(0),
    treble: useRef(0)
  };
  // Color palette transition state
  const paletteTransitionRef = useRef({
    current: null,
    next: null,
    progress: 1,
    lastChangeTime: 0
  });
  // Background color smoothing for ball mode
  const bgColorRef = useRef({ h: 200, s: 20, l: 8 });

  useEffect(() => {
    // Initialize noise function for organic movement (Aurora/Canvas)
    initNoise(Date.now() + Math.random() * 10000);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf = null;

    // Canvas resizing
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const bufferLength = analyser ? analyser.frequencyBinCount : 2048;
    const dataArray = new Uint8Array(bufferLength);

    // Core smoothing function for all audio metrics
    const smooth = (ref, target, speed = 0.12) => {
      ref.current += (target - ref.current) * speed;
    };

    // Color palette logic with smooth interpolation
    const updatePalette = (sig, forceNew = false) => {
      const t = paletteTransitionRef.current;
      if (forceNew || !t.current) {
        const newP = generateUniquePalette(sig);
        if (t.current && t.progress >= 1) { t.next = newP; t.progress = 0; }
        else { t.current = newP; t.progress = 1; }
      }
      if (t.next && t.progress < 1) {
        // Limited transition speed (0.3% per frame) for smoothness
        t.progress += 0.003;
        if (t.progress >= 1) { t.current = t.next; t.next = null; t.progress = 1; }
      }
      return (t.next && t.progress < 1) ? interpolatePalettes(t.current, t.next, t.progress) : t.current;
    };

    // Smooth background transition for BALL mode
    const setBackgroundSmooth = (palette) => {
      if (!palette) return;
      const tgt = getColorFromPalette(palette, 0.08, smoothed.energy.current * 0.4);
      const bg = bgColorRef.current;

      // Extremely subtle smoothing (0.02 speed)
      bg.h += (tgt.h - bg.h) * 0.02;
      bg.s += (Math.max(8, tgt.s * 0.25) - bg.s) * 0.02;
      bg.l += (Math.max(4, tgt.l - 40) - bg.l) * 0.02;

      canvas.style.background = `hsl(${Math.round(bg.h)}, ${Math.round(bg.s)}%, ${Math.round(bg.l)}%)`;
    };

    // --- DRAW BALL MODE (IDLE & ACTIVE) ---
    const drawBall = (idle = false) => {
      timeRef.current += 0.016; // Increment time

      // Initialize palette if none exists (especially on load/idle)
      if (!paletteTransitionRef.current.current) updatePalette({ bassAvg: 0.2, midAvg: 0.25, highAvg: 0.25, spectralCentroid: 0.5, harmonicRichness: 0.2 });

      // ACTIVE AUDIO ANALYSIS
      if (!idle) {
        analyser.getByteFrequencyData(dataArray);
        const bassRange = Math.floor(bufferLength * 0.12);
        const midEnd = Math.floor(bufferLength * 0.45);
        const bassAvg = dataArray.slice(0, bassRange).reduce((a,b)=>a+b,0) / bassRange;
        const midAvg = dataArray.slice(bassRange, midEnd).reduce((a,b)=>a+b,0) / (midEnd - bassRange);
        const trebleAvg = dataArray.slice(midEnd).reduce((a,b)=>a+b,0) / (bufferLength - midEnd);
        const energy = dataArray.reduce((a,b)=>a+b,0) / bufferLength;

        smooth(smoothed.bass, bassAvg);
        smooth(smoothed.mid, midAvg);
        smooth(smoothed.treble, trebleAvg);
        smooth(smoothed.energy, energy, 0.09);

        // Palette Change Trigger (based on music metrics)
        if (timeRef.current - paletteTransitionRef.current.lastChangeTime > 8 && Math.random() < 0.005) {
          updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.3 + smoothed.treble.current/255*0.7, harmonicRichness: Math.min(1, smoothed.mid.current/255*1.2) }, true);
          paletteTransitionRef.current.lastChangeTime = timeRef.current;
        }
      }

      // DRAWING LOGIC
      const palette = updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.3, harmonicRichness: 0.3 });
      setBackgroundSmooth(palette);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2, cy = canvas.height / 2;
      const breathe = 1 + Math.sin(timeRef.current * 0.8) * 0.08;
      const base = Math.min(canvas.width, canvas.height) * (idle ? 0.12 : 0.06);

      // Radius size controlled by BASS (Active) or just breathing (Idle)
      const radius = base * breathe + (idle ? 0 : (smoothed.bass.current / 255) * base * 1.2);
      const mainColor = getColorFromPalette(palette, 0.2, smoothed.energy.current / 255);

      for (let layer = 0; layer < 3; layer++) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * (1 + layer * 0.5) * 2);
        const layerAlpha = (1 - layer * 0.3) * 0.6;
        g.addColorStop(0, hslToString(toLuminous(mainColor, 1), layerAlpha * 0.9));
        g.addColorStop(0.5, hslToString(mainColor, layerAlpha * 0.6));
        g.addColorStop(1, 'transparent');
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * (1 + layer * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(() => drawBall(idle));
    };

    // --- DRAW CANVAS MODE (IDLE & ACTIVE) - Living Neon Gradient ---
    const drawCanvas = (idle = false) => {
      timeRef.current += 0.016;
      if (!paletteTransitionRef.current.current) updatePalette({ bassAvg: 0.2, midAvg: 0.25, highAvg: 0.25, spectralCentroid: 0.5, harmonicRichness: 0.2 });

      // ACTIVE AUDIO ANALYSIS
      if (!idle) {
        analyser.getByteFrequencyData(dataArray);
        const bassRange = Math.floor(bufferLength * 0.12);
        const midEnd = Math.floor(bufferLength * 0.45);
        const bassAvg = dataArray.slice(0, bassRange).reduce((a,b)=>a+b,0) / bassRange;
        const midAvg = dataArray.slice(bassRange, midEnd).reduce((a,b)=>a+b,0) / (midEnd - bassRange);
        const trebleAvg = dataArray.slice(midEnd).reduce((a,b)=>a+b,0) / (bufferLength - midEnd);
        const energy = dataArray.reduce((a,b)=>a+b,0) / bufferLength;
        smooth(smoothed.bass, bassAvg);
        smooth(smoothed.mid, midAvg);
        smooth(smoothed.treble, trebleAvg);
        smooth(smoothed.energy, energy, 0.09);

        if (timeRef.current - paletteTransitionRef.current.lastChangeTime > 6 && smoothed.energy.current/255 > 0.5 && Math.random() < 0.01) {
          updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.2 + smoothed.treble.current/255*0.8, harmonicRichness: Math.min(1, smoothed.mid.current/255*1.2) }, true);
          paletteTransitionRef.current.lastChangeTime = timeRef.current;
        }
      }

      // DRAWING LOGIC
      const palette = updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.3, harmonicRichness: 0.3 });
      const w = canvas.width, h = canvas.height;
      const energyNorm = smoothed.energy.current / 255;
      const bassNorm = smoothed.bass.current / 255;
      const midNorm = smoothed.mid.current / 255;

      const blobCount = idle ? 5 : 8 + Math.floor(energyNorm * 6);

      for (let i = 0; i < blobCount; i++) {
        const color = getColorFromPalette(palette, i / blobCount, idle ? 0.3 : energyNorm);

        // Neon color shift (more dynamic when active)
        const neon = {
          h: color.h + (idle ? Math.sin(timeRef.current*0.2+i)*15 : midNorm*40*Math.sin(timeRef.current*0.5+i)),
          s: Math.min(100, color.s + (idle?30:45)),
          l: Math.min(idle?65:80, color.l + (idle?15:25))
        };

        // Use Noise + Music data for position (more responsive when active)
        const xNoise = fractalNoise2D(i*0.3 + timeRef.current*0.2, timeRef.current*0.15, 4, 0.6);
        const yNoise = fractalNoise2D(i*0.4, timeRef.current*0.18+i, 4, 0.6);

        const cx = w*((i/blobCount)+0.1) + xNoise*w*0.4 + Math.sin(timeRef.current*0.8+i*0.5)*w*0.2*(idle?0:bassNorm);
        const cy = h*0.5 + yNoise*h*0.4 + Math.cos(timeRef.current*0.6+i*0.7)*h*0.2*(idle?0:midNorm);

        // Size determined by overall energy/rhythm (more dynamic when active)
        const radius = Math.max(w,h) * (idle?0.4:0.35) * (idle ? 1+Math.sin(timeRef.current*0.3+i)*0.1 : 1+bassNorm*0.5+midNorm*0.3*Math.sin(timeRef.current*2+i));

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        g.addColorStop(0, hslToString(toLuminous(neon, idle?1:1.5), idle?0.15:(0.4+energyNorm*0.3)));
        g.addColorStop(0.3, hslToString(neon, idle?0.08:(0.3+energyNorm*0.2)));
        g.addColorStop(0.7, hslToString(neon, 0.15));
        g.addColorStop(1, 'transparent');

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      // Subtle fade to create glowing trails
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = idle ? 'rgba(0,0,0,0.02)' : `rgba(0,0,0,${0.03-energyNorm*0.02})`;
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(() => drawCanvas(idle));
    };

    // --- DRAW AURORA MODE (IDLE & ACTIVE) - Plasma Liquid Fire ---
    const drawAurora = (idle = false) => {
      timeRef.current += 0.016;
      if (!paletteTransitionRef.current.current) updatePalette({ bassAvg: 0.2, midAvg: 0.25, highAvg: 0.25, spectralCentroid: 0.5, harmonicRichness: 0.2 });

      // ACTIVE AUDIO ANALYSIS
      if (!idle) {
        analyser.getByteFrequencyData(dataArray);
        const bassRange = Math.floor(bufferLength * 0.12);
        const midEnd = Math.floor(bufferLength * 0.45);
        const bassAvg = dataArray.slice(0, bassRange).reduce((a,b)=>a+b,0) / bassRange;
        const midAvg = dataArray.slice(bassRange, midEnd).reduce((a,b)=>a+b,0) / (midEnd - bassRange);
        const trebleAvg = dataArray.slice(midEnd).reduce((a,b)=>a+b,0) / (bufferLength - midEnd);
        const energy = dataArray.reduce((a,b)=>a+b,0) / bufferLength;
        smooth(smoothed.bass, bassAvg);
        smooth(smoothed.mid, midAvg);
        smooth(smoothed.treble, trebleAvg);
        smooth(smoothed.energy, energy, 0.09);

        if (timeRef.current - paletteTransitionRef.current.lastChangeTime > 8 && smoothed.mid.current/255 > 0.4 && Math.random() < 0.008) {
          updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.2 + smoothed.treble.current/255*0.8, harmonicRichness: Math.min(1, smoothed.mid.current/255) }, true);
          paletteTransitionRef.current.lastChangeTime = timeRef.current;
        }
      }

      // DRAWING LOGIC
      const palette = updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.3, harmonicRichness: 0.3 });
      const w = canvas.width, h = canvas.height;
      const bassNorm = smoothed.bass.current / 255;
      const midNorm = smoothed.mid.current / 255;
      const trebleNorm = smoothed.treble.current / 255;
      const energyNorm = smoothed.energy.current / 255;

      // Dark fade for flame trails
      ctx.fillStyle = idle ? 'rgba(0,0,0,0.08)' : `rgba(0,0,0,${0.12-energyNorm*0.08})`;
      ctx.fillRect(0, 0, w, h);

      // Liquid plasma flames rising from bottom
      const flameCount = idle ? 6 : 8 + Math.floor(midNorm * 12);

      for (let i = 0; i < flameCount; i++) {
        const xBase = w * ((i / flameCount) + (idle?0:Math.random()*0.05));
        const color = getColorFromPalette(palette, i / flameCount, idle ? 0.35 : energyNorm);

        // Plasma Neon color shift
        const plasma = {
          h: color.h + (idle?0:midNorm*50*Math.sin(timeRef.current+i*0.5)),
          s: Math.min(100, color.s + (idle?40:50)),
          l: Math.min(idle?75:80, color.l + (idle?20:28))
        };

        // Flame width controlled by BASS/MID (more dynamic when active)
        const flameWidth = (idle?40:20) + (idle?0:bassNorm*40+midNorm*30) + Math.sin(timeRef.current*2+i)*15;

        ctx.strokeStyle = hslToString(plasma, idle ? 0.4 : 0.4+energyNorm*0.5+bassNorm*0.3);
        ctx.lineWidth = flameWidth;
        ctx.beginPath();

        // Draw path using noise for organic movement
        for (let y = h; y >= 0; y -= (idle?8:6)) {
          const progress = 1 - (y / h);
          const n1 = fractalNoise2D(i*0.4 + timeRef.current*(idle?0.08:0.15+bassNorm*0.2), y*0.002 + timeRef.current*(idle?0.1:0.18+midNorm*0.15), 4, 0.65);
          const n2 = fractalNoise2D(i*0.6 - timeRef.current*0.1, y*0.003 + timeRef.current*0.12, 3, 0.5);
          const spread = progress * (idle?120:150+bassNorm*200);

          const x = xBase +
            n1*spread +
            n2*80*(idle?0:midNorm) +
            Math.sin((y*0.008 + timeRef.current*(idle?0.5:1.2+trebleNorm) + i*0.5)) * (idle?60:100+bassNorm*150);

          ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Plasma Glow Layer (using screen composite)
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = hslToString(plasma, (idle?0.4:0.4+energyNorm*0.5)*0.6);
        ctx.lineWidth = flameWidth * 2.5;
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }

      // Glowing ember particles (active only, controlled by TREBLE)
      if (!idle && trebleNorm > 0.25) {
        const emberCount = Math.floor(trebleNorm * 40);
        for (let i = 0; i < emberCount; i++) {
          const color = getColorFromPalette(palette, Math.random(), energyNorm);
          const ember = { h: color.h, s: Math.min(100, color.s + 50), l: Math.min(90, color.l + 35) };
          const ex = Math.random() * w, ey = h - Math.random() * h * (0.5 + energyNorm * 0.5);
          const size = 1 + Math.random() * 4 + bassNorm * 3;

          ctx.globalCompositeOperation = 'screen';
          const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, size * 3);
          g.addColorStop(0, hslToString(ember, 0.9));
          g.addColorStop(0.5, hslToString(ember, 0.4));
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(ex, ey, size * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
      }

      raf = requestAnimationFrame(() => drawAurora(idle));
    };

    // --- MAIN LOOP ---
    const loop = () => {
      const idle = !analyser || !isPlaying;
      cancelAnimationFrame(raf); // Stop the previously running loop

      // Route to the correct draw function based on mode and state (idle/active)
      if (mode === 'ball') raf = requestAnimationFrame(() => drawBall(idle));
      else if (mode === 'canvas') raf = requestAnimationFrame(() => drawCanvas(idle));
      else if (mode === 'aurora') raf = requestAnimationFrame(() => drawAurora(idle));
    };

    loop(); // Start the loop

    // Cleanup
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, [analyser, isPlaying, mode]);

  return <canvas ref={canvasRef} className="visualizer-canvas" style={{ position: 'absolute', inset: 0 }} />;
};

export default AudioVisualizer;









/*
import React, { useEffect, useRef } from 'react';
import { generateUniquePalette, getColorFromPalette, hslToString, toLuminous, interpolatePalettes } from '../utils/colorUtils';
import { initNoise, fractalNoise2D } from '../utils/noise';

const AudioVisualizer = ({ analyser, isPlaying, mode = 'ball' }) => {
  const canvasRef = useRef(null);
  const timeRef = useRef(0);
  const smoothed = { energy: useRef(0), bass: useRef(0), mid: useRef(0), treble: useRef(0) };
  const paletteTransitionRef = useRef({ current: null, next: null, progress: 1, lastChangeTime: 0 });
  const bgColorRef = useRef({ h: 200, s: 20, l: 8 }); // For smooth ball background

  useEffect(() => {
    initNoise(Date.now() + Math.random() * 10000);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf = null;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const bufferLength = analyser ? analyser.frequencyBinCount : 2048;
    const dataArray = new Uint8Array(bufferLength);
    const smooth = (ref, target, speed = 0.12) => { ref.current += (target - ref.current) * speed; };

    const updatePalette = (sig, forceNew = false) => {
      const t = paletteTransitionRef.current;
      if (forceNew || !t.current) {
        const newP = generateUniquePalette(sig);
        if (t.current && t.progress >= 1) { t.next = newP; t.progress = 0; }
        else { t.current = newP; t.progress = 1; }
      }
      if (t.next && t.progress < 1) {
        t.progress += 0.003;
        if (t.progress >= 1) { t.current = t.next; t.next = null; t.progress = 1; }
      }
      return (t.next && t.progress < 1) ? interpolatePalettes(t.current, t.next, t.progress) : t.current;
    };

    const setBackgroundSmooth = (palette) => {
      if (!palette) return;
      const tgt = getColorFromPalette(palette, 0.08, smoothed.energy.current * 0.4);
      const bg = bgColorRef.current;
      bg.h += (tgt.h - bg.h) * 0.02;
      bg.s += (Math.max(8, tgt.s * 0.25) - bg.s) * 0.02;
      bg.l += (Math.max(4, tgt.l - 40) - bg.l) * 0.02;
      canvas.style.background = `hsl(${Math.round(bg.h)}, ${Math.round(bg.s)}%, ${Math.round(bg.l)}%)`;
    };

    // BALL IDLE/ACTIVE combined
    const drawBall = (idle = false) => {
      timeRef.current += 0.016;
      if (!paletteTransitionRef.current.current) updatePalette({ bassAvg: 0.2, midAvg: 0.25, highAvg: 0.25, spectralCentroid: 0.5, harmonicRichness: 0.2 });

      if (!idle) {
        analyser.getByteFrequencyData(dataArray);
        const bassRange = Math.floor(bufferLength * 0.12);
        const midEnd = Math.floor(bufferLength * 0.45);
        const bassAvg = dataArray.slice(0, bassRange).reduce((a,b)=>a+b,0) / bassRange;
        const midAvg = dataArray.slice(bassRange, midEnd).reduce((a,b)=>a+b,0) / (midEnd - bassRange);
        const trebleAvg = dataArray.slice(midEnd).reduce((a,b)=>a+b,0) / (bufferLength - midEnd);
        const energy = dataArray.reduce((a,b)=>a+b,0) / bufferLength;
        smooth(smoothed.bass, bassAvg); smooth(smoothed.mid, midAvg); smooth(smoothed.treble, trebleAvg); smooth(smoothed.energy, energy, 0.09);

        if (timeRef.current - paletteTransitionRef.current.lastChangeTime > 8 && Math.random() < 0.005) {
          updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.3 + smoothed.treble.current/255*0.7, harmonicRichness: Math.min(1, smoothed.mid.current/255*1.2) }, true);
          paletteTransitionRef.current.lastChangeTime = timeRef.current;
        }
      }

      const palette = updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.3, harmonicRichness: 0.3 });
      setBackgroundSmooth(palette);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2, cy = canvas.height / 2;
      const breathe = 1 + Math.sin(timeRef.current * 0.8) * 0.08;
      const base = Math.min(canvas.width, canvas.height) * (idle ? 0.12 : 0.06);
      const radius = base * breathe + (idle ? 0 : (smoothed.bass.current / 255) * base * 1.2);
      const mainColor = getColorFromPalette(palette, 0.2, smoothed.energy.current / 255);

      for (let layer = 0; layer < 3; layer++) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * (1 + layer * 0.5) * 2);
        const layerAlpha = (1 - layer * 0.3) * 0.6;
        g.addColorStop(0, hslToString(toLuminous(mainColor, 1), layerAlpha * 0.9));
        g.addColorStop(0.5, hslToString(mainColor, layerAlpha * 0.6));
        g.addColorStop(1, 'transparent');
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * (1 + layer * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(() => drawBall(idle));
    };

    // CANVAS - Living fullscreen neon gradient
    const drawCanvas = (idle = false) => {
      timeRef.current += 0.016;
      if (!paletteTransitionRef.current.current) updatePalette({ bassAvg: 0.2, midAvg: 0.25, highAvg: 0.25, spectralCentroid: 0.5, harmonicRichness: 0.2 });

      if (!idle) {
        analyser.getByteFrequencyData(dataArray);
        const bassRange = Math.floor(bufferLength * 0.12);
        const midEnd = Math.floor(bufferLength * 0.45);
        const bassAvg = dataArray.slice(0, bassRange).reduce((a,b)=>a+b,0) / bassRange;
        const midAvg = dataArray.slice(bassRange, midEnd).reduce((a,b)=>a+b,0) / (midEnd - bassRange);
        const trebleAvg = dataArray.slice(midEnd).reduce((a,b)=>a+b,0) / (bufferLength - midEnd);
        const energy = dataArray.reduce((a,b)=>a+b,0) / bufferLength;
        smooth(smoothed.bass, bassAvg); smooth(smoothed.mid, midAvg); smooth(smoothed.treble, trebleAvg); smooth(smoothed.energy, energy, 0.09);

        if (timeRef.current - paletteTransitionRef.current.lastChangeTime > 6 && smoothed.energy.current/255 > 0.5 && Math.random() < 0.01) {
          updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.2 + smoothed.treble.current/255*0.8, harmonicRichness: Math.min(1, smoothed.mid.current/255*1.2) }, true);
          paletteTransitionRef.current.lastChangeTime = timeRef.current;
        }
      }

      const palette = updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.3, harmonicRichness: 0.3 });
      const w = canvas.width, h = canvas.height;
      const energyNorm = smoothed.energy.current / 255;
      const bassNorm = smoothed.bass.current / 255;
      const midNorm = smoothed.mid.current / 255;

      const blobCount = idle ? 5 : 8 + Math.floor(energyNorm * 6);
      for (let i = 0; i < blobCount; i++) {
        const color = getColorFromPalette(palette, i / blobCount, idle ? 0.3 : energyNorm);
        const neon = { h: color.h + (idle ? Math.sin(timeRef.current*0.2+i)*15 : midNorm*40*Math.sin(timeRef.current*0.5+i)), s: Math.min(100, color.s + (idle?30:45)), l: Math.min(idle?65:80, color.l + (idle?15:25)) };

        const xNoise = fractalNoise2D(i*0.3 + timeRef.current*0.2, timeRef.current*0.15, 4, 0.6);
        const yNoise = fractalNoise2D(i*0.4, timeRef.current*0.18+i, 4, 0.6);
        const cx = w*((i/blobCount)+0.1) + xNoise*w*0.4 + Math.sin(timeRef.current*0.8+i*0.5)*w*0.2*(idle?0:bassNorm);
        const cy = h*0.5 + yNoise*h*0.4 + Math.cos(timeRef.current*0.6+i*0.7)*h*0.2*(idle?0:midNorm);
        const radius = Math.max(w,h) * (idle?0.4:0.35) * (idle ? 1+Math.sin(timeRef.current*0.3+i)*0.1 : 1+bassNorm*0.5+midNorm*0.3*Math.sin(timeRef.current*2+i));

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        g.addColorStop(0, hslToString(toLuminous(neon, idle?1:1.5), idle?0.15:(0.4+energyNorm*0.3)));
        g.addColorStop(0.3, hslToString(neon, idle?0.08:(0.3+energyNorm*0.2)));
        g.addColorStop(0.7, hslToString(neon, 0.15));
        g.addColorStop(1, 'transparent');
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = idle ? 'rgba(0,0,0,0.02)' : `rgba(0,0,0,${0.03-energyNorm*0.02})`;
      ctx.fillRect(0, 0, w, h);
      raf = requestAnimationFrame(() => drawCanvas(idle));
    };

    // AURORA - Plasma liquid fire
    const drawAurora = (idle = false) => {
      timeRef.current += 0.016;
      if (!paletteTransitionRef.current.current) updatePalette({ bassAvg: 0.2, midAvg: 0.25, highAvg: 0.25, spectralCentroid: 0.5, harmonicRichness: 0.2 });

      if (!idle) {
        analyser.getByteFrequencyData(dataArray);
        const bassRange = Math.floor(bufferLength * 0.12);
        const midEnd = Math.floor(bufferLength * 0.45);
        const bassAvg = dataArray.slice(0, bassRange).reduce((a,b)=>a+b,0) / bassRange;
        const midAvg = dataArray.slice(bassRange, midEnd).reduce((a,b)=>a+b,0) / (midEnd - bassRange);
        const trebleAvg = dataArray.slice(midEnd).reduce((a,b)=>a+b,0) / (bufferLength - midEnd);
        const energy = dataArray.reduce((a,b)=>a+b,0) / bufferLength;
        smooth(smoothed.bass, bassAvg); smooth(smoothed.mid, midAvg); smooth(smoothed.treble, trebleAvg); smooth(smoothed.energy, energy, 0.09);

        if (timeRef.current - paletteTransitionRef.current.lastChangeTime > 8 && smoothed.mid.current/255 > 0.4 && Math.random() < 0.008) {
          updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.2 + smoothed.treble.current/255*0.8, harmonicRichness: Math.min(1, smoothed.mid.current/255) }, true);
          paletteTransitionRef.current.lastChangeTime = timeRef.current;
        }
      }

      const palette = updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.3, harmonicRichness: 0.3 });
      const w = canvas.width, h = canvas.height;
      const bassNorm = smoothed.bass.current / 255;
      const midNorm = smoothed.mid.current / 255;
      const trebleNorm = smoothed.treble.current / 255;
      const energyNorm = smoothed.energy.current / 255;

      ctx.fillStyle = idle ? 'rgba(0,0,0,0.08)' : `rgba(0,0,0,${0.12-energyNorm*0.08})`;
      ctx.fillRect(0, 0, w, h);

      const flameCount = idle ? 6 : 8 + Math.floor(midNorm * 12);
      for (let i = 0; i < flameCount; i++) {
        const xBase = w * ((i / flameCount) + (idle?0:Math.random()*0.05));
        const color = getColorFromPalette(palette, i / flameCount, idle ? 0.35 : energyNorm);
        const plasma = { h: color.h + (idle?0:midNorm*50*Math.sin(timeRef.current+i*0.5)), s: Math.min(100, color.s + (idle?40:50)), l: Math.min(idle?75:80, color.l + (idle?20:28)) };
        const flameWidth = (idle?40:20) + (idle?0:bassNorm*40+midNorm*30) + Math.sin(timeRef.current*2+i)*15;

        ctx.strokeStyle = hslToString(plasma, idle ? 0.4 : 0.4+energyNorm*0.5+bassNorm*0.3);
        ctx.lineWidth = flameWidth;
        ctx.beginPath();

        for (let y = h; y >= 0; y -= (idle?8:6)) {
          const progress = 1 - (y / h);
          const n1 = fractalNoise2D(i*0.4 + timeRef.current*(idle?0.08:0.15+bassNorm*0.2), y*0.002 + timeRef.current*(idle?0.1:0.18+midNorm*0.15), 4, 0.65);
          const n2 = fractalNoise2D(i*0.6 - timeRef.current*0.1, y*0.003 + timeRef.current*0.12, 3, 0.5);
          const spread = progress * (idle?120:150+bassNorm*200);
          const x = xBase + n1*spread + n2*80*(idle?0:midNorm) + Math.sin((y*0.008 + timeRef.current*(idle?0.5:1.2+trebleNorm) + i*0.5)) * (idle?60:100+bassNorm*150);
          ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = hslToString(plasma, (idle?0.4:0.4+energyNorm*0.5)*0.6);
        ctx.lineWidth = flameWidth * 2.5;
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }

      if (!idle && trebleNorm > 0.25) {
        const emberCount = Math.floor(trebleNorm * 40);
        for (let i = 0; i < emberCount; i++) {
          const color = getColorFromPalette(palette, Math.random(), energyNorm);
          const ember = { h: color.h, s: Math.min(100, color.s + 50), l: Math.min(90, color.l + 35) };
          const ex = Math.random() * w, ey = h - Math.random() * h * (0.5 + energyNorm * 0.5);
          const size = 1 + Math.random() * 4 + bassNorm * 3;
          ctx.globalCompositeOperation = 'screen';
          const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, size * 3);
          g.addColorStop(0, hslToString(ember, 0.9));
          g.addColorStop(0.5, hslToString(ember, 0.4));
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(ex, ey, size * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
      }

      raf = requestAnimationFrame(() => drawAurora(idle));
    };

    const loop = () => {
      const idle = !analyser || !isPlaying;
      cancelAnimationFrame(raf);
      if (mode === 'ball') raf = requestAnimationFrame(() => drawBall(idle));
      else if (mode === 'canvas') raf = requestAnimationFrame(() => drawCanvas(idle));
      else if (mode === 'aurora') raf = requestAnimationFrame(() => drawAurora(idle));
    };

    loop();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, [analyser, isPlaying, mode]);

  return <canvas ref={canvasRef} className="visualizer-canvas" style={{ position: 'absolute', inset: 0 }} />;
};

export default AudioVisualizer;
*/



// src/visualizers/AudioVisualizer.jsx
// Replace your current AudioVisualizer.jsx with this complete file
/*
import React, { useEffect, useRef } from 'react';
import { generateUniquePalette, getColorFromPalette, hslToString, toLuminous, interpolatePalettes } from '../utils/colorUtils';
import { initNoise, fractalNoise2D } from '../utils/noise';

const AudioVisualizer = ({ analyser, isPlaying, mode = 'ball' }) => {
  const canvasRef = useRef(null);
  const timeRef = useRef(0);
  const smoothed = { energy: useRef(0), bass: useRef(0), mid: useRef(0), treble: useRef(0) };
  const paletteTransitionRef = useRef({ current: null, next: null, progress: 1, lastChangeTime: 0 });
  const bgColorRef = useRef({ h: 200, s: 20, l: 8 }); // For smooth ball background

  useEffect(() => {
    initNoise(Date.now() + Math.random() * 10000);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf = null;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const bufferLength = analyser ? analyser.frequencyBinCount : 2048;
    const dataArray = new Uint8Array(bufferLength);
    const smooth = (ref, target, speed = 0.12) => { ref.current += (target - ref.current) * speed; };

    const updatePalette = (sig, forceNew = false) => {
      const t = paletteTransitionRef.current;
      if (forceNew || !t.current) {
        const newP = generateUniquePalette(sig);
        if (t.current && t.progress >= 1) { t.next = newP; t.progress = 0; }
        else { t.current = newP; t.progress = 1; }
      }
      if (t.next && t.progress < 1) {
        t.progress += 0.003;
        if (t.progress >= 1) { t.current = t.next; t.next = null; t.progress = 1; }
      }
      return (t.next && t.progress < 1) ? interpolatePalettes(t.current, t.next, t.progress) : t.current;
    };

    const setBackgroundSmooth = (palette) => {
      if (!palette) return;
      const tgt = getColorFromPalette(palette, 0.08, smoothed.energy.current * 0.4);
      const bg = bgColorRef.current;
      bg.h += (tgt.h - bg.h) * 0.02;
      bg.s += (Math.max(8, tgt.s * 0.25) - bg.s) * 0.02;
      bg.l += (Math.max(4, tgt.l - 40) - bg.l) * 0.02;
      canvas.style.background = `hsl(${Math.round(bg.h)}, ${Math.round(bg.s)}%, ${Math.round(bg.l)}%)`;
    };

    // BALL IDLE/ACTIVE combined
    const drawBall = (idle = false) => {
      timeRef.current += 0.016;
      if (!paletteTransitionRef.current.current) updatePalette({ bassAvg: 0.2, midAvg: 0.25, highAvg: 0.25, spectralCentroid: 0.5, harmonicRichness: 0.2 });

      if (!idle) {
        analyser.getByteFrequencyData(dataArray);
        const bassRange = Math.floor(bufferLength * 0.12);
        const midEnd = Math.floor(bufferLength * 0.45);
        const bassAvg = dataArray.slice(0, bassRange).reduce((a,b)=>a+b,0) / bassRange;
        const midAvg = dataArray.slice(bassRange, midEnd).reduce((a,b)=>a+b,0) / (midEnd - bassRange);
        const trebleAvg = dataArray.slice(midEnd).reduce((a,b)=>a+b,0) / (bufferLength - midEnd);
        const energy = dataArray.reduce((a,b)=>a+b,0) / bufferLength;
        smooth(smoothed.bass, bassAvg); smooth(smoothed.mid, midAvg); smooth(smoothed.treble, trebleAvg); smooth(smoothed.energy, energy, 0.09);

        if (timeRef.current - paletteTransitionRef.current.lastChangeTime > 8 && Math.random() < 0.005) {
          updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.3 + smoothed.treble.current/255*0.7, harmonicRichness: Math.min(1, smoothed.mid.current/255*1.2) }, true);
          paletteTransitionRef.current.lastChangeTime = timeRef.current;
        }
      }

      const palette = updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.3, harmonicRichness: 0.3 });
      setBackgroundSmooth(palette);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2, cy = canvas.height / 2;
      const breathe = 1 + Math.sin(timeRef.current * 0.8) * 0.08;
      const base = Math.min(canvas.width, canvas.height) * (idle ? 0.12 : 0.06);
      const radius = base * breathe + (idle ? 0 : (smoothed.bass.current / 255) * base * 1.2);
      const mainColor = getColorFromPalette(palette, 0.2, smoothed.energy.current / 255);

      for (let layer = 0; layer < 3; layer++) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * (1 + layer * 0.5) * 2);
        const layerAlpha = (1 - layer * 0.3) * 0.6;
        g.addColorStop(0, hslToString(toLuminous(mainColor, 1), layerAlpha * 0.9));
        g.addColorStop(0.5, hslToString(mainColor, layerAlpha * 0.6));
        g.addColorStop(1, 'transparent');
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * (1 + layer * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(() => drawBall(idle));
    };

    // CANVAS - Living fullscreen neon gradient
    const drawCanvas = (idle = false) => {
      timeRef.current += 0.016;
      if (!paletteTransitionRef.current.current) updatePalette({ bassAvg: 0.2, midAvg: 0.25, highAvg: 0.25, spectralCentroid: 0.5, harmonicRichness: 0.2 });

      if (!idle) {
        analyser.getByteFrequencyData(dataArray);
        const bassRange = Math.floor(bufferLength * 0.12);
        const midEnd = Math.floor(bufferLength * 0.45);
        const bassAvg = dataArray.slice(0, bassRange).reduce((a,b)=>a+b,0) / bassRange;
        const midAvg = dataArray.slice(bassRange, midEnd).reduce((a,b)=>a+b,0) / (midEnd - bassRange);
        const trebleAvg = dataArray.slice(midEnd).reduce((a,b)=>a+b,0) / (bufferLength - midEnd);
        const energy = dataArray.reduce((a,b)=>a+b,0) / bufferLength;
        smooth(smoothed.bass, bassAvg); smooth(smoothed.mid, midAvg); smooth(smoothed.treble, trebleAvg); smooth(smoothed.energy, energy, 0.09);

        if (timeRef.current - paletteTransitionRef.current.lastChangeTime > 6 && smoothed.energy.current/255 > 0.5 && Math.random() < 0.01) {
          updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.2 + smoothed.treble.current/255*0.8, harmonicRichness: Math.min(1, smoothed.mid.current/255*1.2) }, true);
          paletteTransitionRef.current.lastChangeTime = timeRef.current;
        }
      }

      const palette = updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.3, harmonicRichness: 0.3 });
      const w = canvas.width, h = canvas.height;
      const energyNorm = smoothed.energy.current / 255;
      const bassNorm = smoothed.bass.current / 255;
      const midNorm = smoothed.mid.current / 255;

      const blobCount = idle ? 5 : 8 + Math.floor(energyNorm * 6);
      for (let i = 0; i < blobCount; i++) {
        const color = getColorFromPalette(palette, i / blobCount, idle ? 0.3 : energyNorm);
        const neon = { h: color.h + (idle ? Math.sin(timeRef.current*0.2+i)*15 : midNorm*40*Math.sin(timeRef.current*0.5+i)), s: Math.min(100, color.s + (idle?30:45)), l: Math.min(idle?65:80, color.l + (idle?15:25)) };

        const xNoise = fractalNoise2D(i*0.3 + timeRef.current*0.2, timeRef.current*0.15, 4, 0.6);
        const yNoise = fractalNoise2D(i*0.4, timeRef.current*0.18+i, 4, 0.6);
        const cx = w*((i/blobCount)+0.1) + xNoise*w*0.4 + Math.sin(timeRef.current*0.8+i*0.5)*w*0.2*(idle?0:bassNorm);
        const cy = h*0.5 + yNoise*h*0.4 + Math.cos(timeRef.current*0.6+i*0.7)*h*0.2*(idle?0:midNorm);
        const radius = Math.max(w,h) * (idle?0.4:0.35) * (idle ? 1+Math.sin(timeRef.current*0.3+i)*0.1 : 1+bassNorm*0.5+midNorm*0.3*Math.sin(timeRef.current*2+i));

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        g.addColorStop(0, hslToString(toLuminous(neon, idle?1:1.5), idle?0.15:(0.4+energyNorm*0.3)));
        g.addColorStop(0.3, hslToString(neon, idle?0.08:(0.3+energyNorm*0.2)));
        g.addColorStop(0.7, hslToString(neon, 0.15));
        g.addColorStop(1, 'transparent');
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = idle ? 'rgba(0,0,0,0.02)' : `rgba(0,0,0,${0.03-energyNorm*0.02})`;
      ctx.fillRect(0, 0, w, h);
      raf = requestAnimationFrame(() => drawCanvas(idle));
    };

    // AURORA - Plasma liquid fire
    const drawAurora = (idle = false) => {
      timeRef.current += 0.016;
      if (!paletteTransitionRef.current.current) updatePalette({ bassAvg: 0.2, midAvg: 0.25, highAvg: 0.25, spectralCentroid: 0.5, harmonicRichness: 0.2 });

      if (!idle) {
        analyser.getByteFrequencyData(dataArray);
        const bassRange = Math.floor(bufferLength * 0.12);
        const midEnd = Math.floor(bufferLength * 0.45);
        const bassAvg = dataArray.slice(0, bassRange).reduce((a,b)=>a+b,0) / bassRange;
        const midAvg = dataArray.slice(bassRange, midEnd).reduce((a,b)=>a+b,0) / (midEnd - bassRange);
        const trebleAvg = dataArray.slice(midEnd).reduce((a,b)=>a+b,0) / (bufferLength - midEnd);
        const energy = dataArray.reduce((a,b)=>a+b,0) / bufferLength;
        smooth(smoothed.bass, bassAvg); smooth(smoothed.mid, midAvg); smooth(smoothed.treble, trebleAvg); smooth(smoothed.energy, energy, 0.09);

        if (timeRef.current - paletteTransitionRef.current.lastChangeTime > 8 && smoothed.mid.current/255 > 0.4 && Math.random() < 0.008) {
          updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.2 + smoothed.treble.current/255*0.8, harmonicRichness: Math.min(1, smoothed.mid.current/255) }, true);
          paletteTransitionRef.current.lastChangeTime = timeRef.current;
        }
      }

      const palette = updatePalette({ bassAvg: smoothed.bass.current/255, midAvg: smoothed.mid.current/255, highAvg: smoothed.treble.current/255, spectralCentroid: 0.3, harmonicRichness: 0.3 });
      const w = canvas.width, h = canvas.height;
      const bassNorm = smoothed.bass.current / 255;
      const midNorm = smoothed.mid.current / 255;
      const trebleNorm = smoothed.treble.current / 255;
      const energyNorm = smoothed.energy.current / 255;

      ctx.fillStyle = idle ? 'rgba(0,0,0,0.08)' : `rgba(0,0,0,${0.12-energyNorm*0.08})`;
      ctx.fillRect(0, 0, w, h);

      const flameCount = idle ? 6 : 8 + Math.floor(midNorm * 12);
      for (let i = 0; i < flameCount; i++) {
        const xBase = w * ((i / flameCount) + (idle?0:Math.random()*0.05));
        const color = getColorFromPalette(palette, i / flameCount, idle ? 0.35 : energyNorm);
        const plasma = { h: color.h + (idle?0:midNorm*50*Math.sin(timeRef.current+i*0.5)), s: Math.min(100, color.s + (idle?40:50)), l: Math.min(idle?75:80, color.l + (idle?20:28)) };
        const flameWidth = (idle?40:20) + (idle?0:bassNorm*40+midNorm*30) + Math.sin(timeRef.current*2+i)*15;

        ctx.strokeStyle = hslToString(plasma, idle ? 0.4 : 0.4+energyNorm*0.5+bassNorm*0.3);
        ctx.lineWidth = flameWidth;
        ctx.beginPath();

        for (let y = h; y >= 0; y -= (idle?8:6)) {
          const progress = 1 - (y / h);
          const n1 = fractalNoise2D(i*0.4 + timeRef.current*(idle?0.08:0.15+bassNorm*0.2), y*0.002 + timeRef.current*(idle?0.1:0.18+midNorm*0.15), 4, 0.65);
          const n2 = fractalNoise2D(i*0.6 - timeRef.current*0.1, y*0.003 + timeRef.current*0.12, 3, 0.5);
          const spread = progress * (idle?120:150+bassNorm*200);
          const x = xBase + n1*spread + n2*80*(idle?0:midNorm) + Math.sin((y*0.008 + timeRef.current*(idle?0.5:1.2+trebleNorm) + i*0.5)) * (idle?60:100+bassNorm*150);
          ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = hslToString(plasma, (idle?0.4:0.4+energyNorm*0.5)*0.6);
        ctx.lineWidth = flameWidth * 2.5;
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }

      if (!idle && trebleNorm > 0.25) {
        const emberCount = Math.floor(trebleNorm * 40);
        for (let i = 0; i < emberCount; i++) {
          const color = getColorFromPalette(palette, Math.random(), energyNorm);
          const ember = { h: color.h, s: Math.min(100, color.s + 50), l: Math.min(90, color.l + 35) };
          const ex = Math.random() * w, ey = h - Math.random() * h * (0.5 + energyNorm * 0.5);
          const size = 1 + Math.random() * 4 + bassNorm * 3;
          ctx.globalCompositeOperation = 'screen';
          const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, size * 3);
          g.addColorStop(0, hslToString(ember, 0.9));
          g.addColorStop(0.5, hslToString(ember, 0.4));
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(ex, ey, size * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
      }

      raf = requestAnimationFrame(() => drawAurora(idle));
    };

    const loop = () => {
      const idle = !analyser || !isPlaying;
      cancelAnimationFrame(raf);
      if (mode === 'ball') raf = requestAnimationFrame(() => drawBall(idle));
      else if (mode === 'canvas') raf = requestAnimationFrame(() => drawCanvas(idle));
      else if (mode === 'aurora') raf = requestAnimationFrame(() => drawAurora(idle));
    };

    loop();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, [analyser, isPlaying, mode]);

  return <canvas ref={canvasRef} className="visualizer-canvas" style={{ position: 'absolute', inset: 0 }} />;
};

export default AudioVisualizer;
*/
