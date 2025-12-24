
// with out blur hyperdrive animation
/*
import React, { useEffect, useRef } from 'react';
import { generateUniquePalette, hslToString, getColorFromPalette, interpolatePalettes } from '../utils/colorUtils';
import { initNoise, fractalNoise2D } from '../utils/noise';
import './Hero.css';

const Hero = ({ onLaunch }) => {
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
    energy: 0.2,
    flowAngle: 0
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
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const colorState = colorStateRef.current;
    const field = energyFieldRef.current;

    // Initialize palette with transition colors for idle mode
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

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      timeRef.current += 0.016;
      idleTimeRef.current += 0.016;

      // Gentle palette transitions for idle mode
      const timeSinceLastChange = timeRef.current - colorState.lastChangeTime;
      const shouldChangePalette = timeSinceLastChange > 15 + Math.random() * 10;

      if (shouldChangePalette && colorState.transitionProgress >= 1) {
        try {
          colorState.nextPalette = generateUniquePalette({
            bassAvg: 0.3 + Math.sin(idleTimeRef.current * 0.1) * 0.1,
            midAvg: 0.3 + Math.cos(idleTimeRef.current * 0.15) * 0.1,
            highAvg: 0.3 + Math.sin(idleTimeRef.current * 0.12) * 0.1,
            spectralCentroid: 0.5,
            harmonicRichness: 0.3
          });
          colorState.transitionProgress = 0;
          colorState.lastChangeTime = timeRef.current;
        } catch (err) {
          console.error('Palette generation error:', err);
        }
      }

      // Smooth palette transition
      if (colorState.transitionProgress < 1 && colorState.nextPalette) {
        colorState.transitionProgress += 0.002;
        if (colorState.transitionProgress >= 1) {
          colorState.currentPalette = colorState.nextPalette;
          colorState.nextPalette = null;
        }
      }

      const activePalette = colorState.transitionProgress < 1 && colorState.nextPalette
        ? interpolatePalettes(colorState.currentPalette, colorState.nextPalette, colorState.transitionProgress)
        : colorState.currentPalette;

      // Gentle rotation
      field.flowAngle += 0.002;

      // Background gradient
      const bgGradient = ctx.createRadialGradient(
        field.centerX, field.centerY, 0,
        field.centerX, field.centerY, field.maxRadius * 1.5
      );
      const bgColor1 = getColorFromPalette(activePalette, 0.05, 0.1);
      const bgColor2 = getColorFromPalette(activePalette, 0.15, 0.1);
      bgGradient.addColorStop(0, hslToString({ h: bgColor1.h, s: bgColor1.s, l: Math.max(3, bgColor1.l - 45) }, 1));
      bgGradient.addColorStop(0.7, hslToString({ h: bgColor2.h, s: bgColor2.s, l: Math.max(3, bgColor2.l - 48) }, 1));
      bgGradient.addColorStop(1, hslToString({ h: bgColor2.h, s: bgColor2.s, l: Math.max(2, bgColor2.l - 52) }, 1));
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle ambient movement
      field.points.forEach((point, i) => {
        const driftNoise = fractalNoise2D(
          Math.cos(point.angle) * 0.3 + idleTimeRef.current * 0.03,
          Math.sin(point.angle) * 0.3 + idleTimeRef.current * 0.03,
          3,
          0.5
        );

        const baseRadius = field.maxRadius * 0.6;
        const driftAmount = driftNoise * 0.12;
        point.targetRadius = baseRadius * (1 + driftAmount);
        point.localEnergy = 0.08;

        const diff = point.targetRadius - point.radius;
        field.velocities[i].radial += diff * 0.025;
        field.velocities[i].radial *= 0.92;

        point.radius += field.velocities[i].radial;
        point.radius = Math.min(point.radius, field.maxRadius);

        point.angle += 0.0001;
      });

      // Draw energy field
      ctx.save();
      ctx.translate(field.centerX, field.centerY);

      for (let layer = 0; layer < 3; layer++) {
        const layerScale = 1 + layer * 0.4;
        const layerAlpha = (1 - layer * 0.3) * 0.15;

        ctx.beginPath();
        field.points.forEach((point, i) => {
          const x = Math.cos(point.angle + field.flowAngle) * point.radius * layerScale;
          const y = Math.sin(point.angle + field.flowAngle) * point.radius * layerScale;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevPoint = field.points[i - 1];
            const prevX = Math.cos(prevPoint.angle + field.flowAngle) * prevPoint.radius * layerScale;
            const prevY = Math.sin(prevPoint.angle + field.flowAngle) * prevPoint.radius * layerScale;
            const cpX = (prevX + x) / 2;
            const cpY = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
          }
        });
        ctx.closePath();

        const avgRadius = field.points.reduce((sum, p) => sum + p.radius, 0) / field.points.length;
        const layerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, avgRadius * layerScale);

        const colorPos = 0.3 + layer * 0.2;
        const layerColor = getColorFromPalette(activePalette, colorPos, 0.2);

        layerGradient.addColorStop(0, hslToString(layerColor, layerAlpha * 0.6));
        layerGradient.addColorStop(0.5, hslToString(layerColor, layerAlpha * 0.4));
        layerGradient.addColorStop(1, hslToString(layerColor, layerAlpha * 0.05));

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = layerGradient;
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="hero-container">
      <canvas ref={canvasRef} className="hero-canvas" />
      <div className="hero-overlay" />
      <div className="hero-content">
        <h1 className="hero-title">Experience the Spectrum of Sound.</h1>
        <button className="hero-cta spectral-glow" onClick={onLaunch}>
          Launch Visualizer
        </button>
      </div>
    </div>
  );
};

export default Hero;
*/






/*
import React, { useEffect, useRef, useState } from 'react';
import { generateUniquePalette, hslToString, getColorFromPalette, interpolatePalettes } from '../utils/colorUtils';
import { initNoise, fractalNoise2D } from '../utils/noise';
import './Hero.css';

const Hero = ({ onLaunch }) => {
  const canvasRef = useRef(null);
  const transitionCanvasRef = useRef(null);
  const animationRef = useRef(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

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
    energy: 0.2,
    flowAngle: 0
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
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const colorState = colorStateRef.current;
    const field = energyFieldRef.current;

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

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      timeRef.current += 0.016;
      idleTimeRef.current += 0.016;

      const timeSinceLastChange = timeRef.current - colorState.lastChangeTime;
      const shouldChangePalette = timeSinceLastChange > 15 + Math.random() * 10;

      if (shouldChangePalette && colorState.transitionProgress >= 1) {
        try {
          colorState.nextPalette = generateUniquePalette({
            bassAvg: 0.3 + Math.sin(idleTimeRef.current * 0.1) * 0.1,
            midAvg: 0.3 + Math.cos(idleTimeRef.current * 0.15) * 0.1,
            highAvg: 0.3 + Math.sin(idleTimeRef.current * 0.12) * 0.1,
            spectralCentroid: 0.5,
            harmonicRichness: 0.3
          });
          colorState.transitionProgress = 0;
          colorState.lastChangeTime = timeRef.current;
        } catch (err) {
          console.error('Palette generation error:', err);
        }
      }

      if (colorState.transitionProgress < 1 && colorState.nextPalette) {
        colorState.transitionProgress += 0.002;
        if (colorState.transitionProgress >= 1) {
          colorState.currentPalette = colorState.nextPalette;
          colorState.nextPalette = null;
        }
      }

      const activePalette = colorState.transitionProgress < 1 && colorState.nextPalette
        ? interpolatePalettes(colorState.currentPalette, colorState.nextPalette, colorState.transitionProgress)
        : colorState.currentPalette;

      field.flowAngle += 0.002;

      const bgGradient = ctx.createRadialGradient(
        field.centerX, field.centerY, 0,
        field.centerX, field.centerY, field.maxRadius * 1.5
      );
      const bgColor1 = getColorFromPalette(activePalette, 0.05, 0.1);
      const bgColor2 = getColorFromPalette(activePalette, 0.15, 0.1);
      bgGradient.addColorStop(0, hslToString({ h: bgColor1.h, s: bgColor1.s, l: Math.max(3, bgColor1.l - 45) }, 1));
      bgGradient.addColorStop(0.7, hslToString({ h: bgColor2.h, s: bgColor2.s, l: Math.max(3, bgColor2.l - 48) }, 1));
      bgGradient.addColorStop(1, hslToString({ h: bgColor2.h, s: bgColor2.s, l: Math.max(2, bgColor2.l - 52) }, 1));
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      field.points.forEach((point, i) => {
        const driftNoise = fractalNoise2D(
          Math.cos(point.angle) * 0.3 + idleTimeRef.current * 0.03,
          Math.sin(point.angle) * 0.3 + idleTimeRef.current * 0.03,
          3,
          0.5
        );

        const baseRadius = field.maxRadius * 0.6;
        const driftAmount = driftNoise * 0.12;
        point.targetRadius = baseRadius * (1 + driftAmount);
        point.localEnergy = 0.08;

        const diff = point.targetRadius - point.radius;
        field.velocities[i].radial += diff * 0.025;
        field.velocities[i].radial *= 0.92;

        point.radius += field.velocities[i].radial;
        point.radius = Math.min(point.radius, field.maxRadius);

        point.angle += 0.0001;
      });

      ctx.save();
      ctx.translate(field.centerX, field.centerY);

      for (let layer = 0; layer < 3; layer++) {
        const layerScale = 1 + layer * 0.4;
        const layerAlpha = (1 - layer * 0.3) * 0.15;

        ctx.beginPath();
        field.points.forEach((point, i) => {
          const x = Math.cos(point.angle + field.flowAngle) * point.radius * layerScale;
          const y = Math.sin(point.angle + field.flowAngle) * point.radius * layerScale;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevPoint = field.points[i - 1];
            const prevX = Math.cos(prevPoint.angle + field.flowAngle) * prevPoint.radius * layerScale;
            const prevY = Math.sin(prevPoint.angle + field.flowAngle) * prevPoint.radius * layerScale;
            const cpX = (prevX + x) / 2;
            const cpY = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
          }
        });
        ctx.closePath();

        const avgRadius = field.points.reduce((sum, p) => sum + p.radius, 0) / field.points.length;
        const layerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, avgRadius * layerScale);

        const colorPos = 0.3 + layer * 0.2;
        const layerColor = getColorFromPalette(activePalette, colorPos, 0.2);

        layerGradient.addColorStop(0, hslToString(layerColor, layerAlpha * 0.6));
        layerGradient.addColorStop(0.5, hslToString(layerColor, layerAlpha * 0.4));
        layerGradient.addColorStop(1, hslToString(layerColor, layerAlpha * 0.05));

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = layerGradient;
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleLaunch = () => {
    setIsTransitioning(true);
    animateTransition();
    setTimeout(() => {
      onLaunch();
    }, 1000);
  };

  const animateTransition = () => {
    const transitionCanvas = transitionCanvasRef.current;
    if (!transitionCanvas) return;

    const ctx = transitionCanvas.getContext('2d');
    transitionCanvas.width = window.innerWidth;
    transitionCanvas.height = window.innerHeight;

    let progress = 0;
    const duration = 1000; // 1 second
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      progress = Math.min(elapsed / duration, 1);

      ctx.clearRect(0, 0, transitionCanvas.width, transitionCanvas.height);

      // Motion streaks
      const numStreaks = 30;
      const centerX = transitionCanvas.width / 2;
      const centerY = transitionCanvas.height / 2;

      for (let i = 0; i < numStreaks; i++) {
        const angle = (i / numStreaks) * Math.PI * 2;
        const length = progress * Math.max(transitionCanvas.width, transitionCanvas.height) * 1.5;
        const blur = 20 + progress * 40;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);

        const gradient = ctx.createLinearGradient(0, 0, length, 0);
        gradient.addColorStop(0, `hsla(${200 + i * 12}, 80%, 70%, 0)`);
        gradient.addColorStop(0.3, `hsla(${200 + i * 12}, 80%, 70%, ${0.6 * (1 - progress)})`);
        gradient.addColorStop(1, `hsla(${200 + i * 12}, 80%, 70%, 0)`);

        ctx.filter = `blur(${blur}px)`;
        ctx.fillStyle = gradient;
        ctx.fillRect(0, -10, length, 20);

        ctx.restore();
      }

      // Full screen blur overlay
      ctx.filter = `blur(${progress * 80}px)`;
      ctx.fillStyle = `rgba(255, 255, 255, ${progress * 0.8})`;
      ctx.fillRect(0, 0, transitionCanvas.width, transitionCanvas.height);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  };

  return (
    <div className="hero-container">
      <canvas ref={canvasRef} className="hero-canvas" />
      {isTransitioning && (
        <canvas ref={transitionCanvasRef} className="transition-canvas" />
      )}
      <div className="hero-overlay" />
      <div className={`hero-content ${isTransitioning ? 'fade-out' : ''}`}>
        <h1 className="hero-title">Experience the Spectrum of Sound.</h1>
        <button className="hero-cta spectral-glow" onClick={handleLaunch}>
          Launch Visualizer
        </button>
      </div>
    </div>
  );
};

export default Hero;
*/

















// src/components/Hero.jsx
import React, { useEffect, useRef, useState } from 'react';
import { generateUniquePalette, hslToString, getColorFromPalette, interpolatePalettes } from '../utils/colorUtils';
import { initNoise, fractalNoise2D } from '../utils/noise';
import './Hero.css';

const Hero = ({ onLaunch }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [isClicked, setIsClicked] = useState(false);

  const colorStateRef = useRef({
    currentPalette: null,
    nextPalette: null,
    transitionProgress: 1,
    initialized: false,
    lastChangeTime: 0
  });

  const fieldRef = useRef({
    centerX: 0,
    centerY: 0,
    maxRadius: 0,
    points: [],
    velocities: [],
    energy: 0.18,
    flowAngle: 0
  });

  const timeRef = useRef(0);
  const idleTimeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const f = fieldRef.current;
      f.centerX = canvas.width / 2;
      f.centerY = canvas.height / 2;
      f.maxRadius = Math.min(canvas.width, canvas.height) * 0.45;

      initializeField();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const initializeField = () => {
    initNoise(Date.now() + Math.random() * 10000);

    const f = fieldRef.current;
    const numPoints = 120;
    f.points = [];
    f.velocities = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      f.points.push({
        angle,
        radius: f.maxRadius * 0.6,
        targetRadius: f.maxRadius * 0.6,
        noiseOffset: Math.random() * 1000,
        localEnergy: 0,
        flowInfluence: Math.random() * 0.8,
        individualOffset: Math.random() * Math.PI * 2
      });
      f.velocities.push({ radial: 0, angular: 0 });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const colorState = colorStateRef.current;
    const f = fieldRef.current;

    if (!colorState.initialized) {
      try {
        colorState.currentPalette = generateUniquePalette({
          bassAvg: 0.3,
          midAvg: 0.3,
          highAvg: 0.3,
          spectralCentroid: 0.5,
          harmonicRichness: 0.3
        });
      } catch (err) {
        colorState.currentPalette = {
          colors: [{ h: 200, s: 70, l: 60 }],
          baseHue: 200,
          type: 'fallback'
        };
      }
      colorState.transitionProgress = 1;
      colorState.lastChangeTime = timeRef.current;
      colorState.initialized = true;
    }

    const loop = () => {
      animationRef.current = requestAnimationFrame(loop);

      timeRef.current += 0.016;
      idleTimeRef.current += 0.016;

      const timeSinceLastChange = timeRef.current - colorState.lastChangeTime;
      if (timeSinceLastChange > 15 + Math.random() * 10 && colorState.transitionProgress >= 1) {
        try {
          colorState.nextPalette = generateUniquePalette({
            bassAvg: 0.3 + Math.sin(idleTimeRef.current * 0.1) * 0.08,
            midAvg: 0.3 + Math.cos(idleTimeRef.current * 0.12) * 0.08,
            highAvg: 0.3 + Math.sin(idleTimeRef.current * 0.14) * 0.08,
            spectralCentroid: 0.5,
            harmonicRichness: 0.3
          });
          colorState.transitionProgress = 0;
          colorState.lastChangeTime = timeRef.current;
        } catch (err) {}
      }
      if (colorState.transitionProgress < 1 && colorState.nextPalette) {
        colorState.transitionProgress = Math.min(1, colorState.transitionProgress + 0.0015);
        if (colorState.transitionProgress >= 1) {
          colorState.currentPalette = colorState.nextPalette;
          colorState.nextPalette = null;
        }
      }

      const activePalette = colorState.transitionProgress < 1 && colorState.nextPalette
        ? interpolatePalettes(colorState.currentPalette, colorState.nextPalette, colorState.transitionProgress)
        : colorState.currentPalette;

      const bgGrad = ctx.createRadialGradient(f.centerX, f.centerY, 0, f.centerX, f.centerY, f.maxRadius * 1.5);
      const bg1 = getColorFromPalette(activePalette, 0.06, 0.08);
      const bg2 = getColorFromPalette(activePalette, 0.18, 0.08);
      bgGrad.addColorStop(0, hslToString({ h: bg1.h, s: bg1.s, l: Math.max(4, bg1.l - 44) }, 1));
      bgGrad.addColorStop(0.7, hslToString({ h: bg2.h, s: bg2.s, l: Math.max(3, bg2.l - 48) }, 1));
      bgGrad.addColorStop(1, hslToString({ h: bg2.h, s: bg2.s, l: Math.max(2, bg2.l - 52) }, 1));

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      f.flowAngle += 0.001;
      for (let i = 0; i < f.points.length; i++) {
        const p = f.points[i];
        const drift = fractalNoise2D(Math.cos(p.angle) * 0.25 + idleTimeRef.current * 0.02, Math.sin(p.angle) * 0.25 + idleTimeRef.current * 0.02, 3, 0.5);
        const base = f.maxRadius * 0.6;
        p.targetRadius = base * (1 + drift * 0.09 + Math.sin(idleTimeRef.current * 0.2 + p.individualOffset) * 0.02);
        p.localEnergy = 0.06;

        const diff = p.targetRadius - p.radius;
        f.velocities[i].radial += diff * 0.02;
        f.velocities[i].radial *= 0.92;
        p.radius += f.velocities[i].radial;

        p.angle += 0.00008 + p.flowInfluence * 0.00003;
      }

      ctx.save();
      ctx.translate(f.centerX, f.centerY);
      for (let layer = 0; layer < 3; layer++) {
        const layerScale = 1 + layer * 0.35;
        const baseAlpha = 0.12 * (1 - layer * 0.18);
        const colorPos = 0.25 + layer * 0.18;
        const layerColor = getColorFromPalette(activePalette, colorPos, 0.2);

        ctx.beginPath();
        for (let i = 0; i < f.points.length; i++) {
          const p = f.points[i];
          const x = Math.cos(p.angle + f.flowAngle) * p.radius * layerScale;
          const y = Math.sin(p.angle + f.flowAngle) * p.radius * layerScale;
          if (i === 0) ctx.moveTo(x, y);
          else {
            const prev = f.points[i - 1];
            const prevX = Math.cos(prev.angle + f.flowAngle) * prev.radius * layerScale;
            const prevY = Math.sin(prev.angle + f.flowAngle) * prev.radius * layerScale;
            const cpX = (prevX + x) / 2;
            const cpY = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
          }
        }
        ctx.closePath();

        const avgRadius = f.points.reduce((s, p) => s + p.radius, 0) / f.points.length;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, avgRadius * layerScale);
        g.addColorStop(0, hslToString(layerColor, baseAlpha * 0.9));
        g.addColorStop(0.5, hslToString(layerColor, baseAlpha * 0.6));
        g.addColorStop(1, hslToString(layerColor, baseAlpha * 0.08));

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    };

    loop();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleCTAClick = () => {
    if (isClicked) return; // Prevent double clicks
    setIsClicked(true);

    if (typeof onLaunch === 'function') {
      onLaunch();
    }
  };

  return (
    <div className="hero-container">
      <canvas ref={canvasRef} className="hero-canvas" />
      <div className="hero-overlay" />
      <div className={`hero-content ${isClicked ? 'fade-out' : ''}`}>
        <h1 className="hero-title">Experience the Spectrum of Sound</h1>
        <button
          className="hero-cta spectral-glow"
          onClick={handleCTAClick}
          disabled={isClicked}
          aria-label="Launch Visualizer"
        >
          Launch Visualizer
        </button>
      </div>
    </div>
  );
};

export default Hero;
