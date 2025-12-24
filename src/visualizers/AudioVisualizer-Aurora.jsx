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
import { musicAnalyzer } from '../utils/musicAnalysis'; // assumed available

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOutQuad = t => 1 - (1 - t) * (1 - t);

const AudioVisualizerAurora = ({ analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  // timing + smoothing
  const timeRef = useRef(0);
  const idleTimeRef = useRef(0);

  // palette transition state
  const paletteRef = useRef({
    current: null,
    next: null,
    progress: 1,
    lastChangeTime: 0
  });

  // zones -> now organic blobs (each blob has control points)
  const blobsRef = useRef([]);

  // audio smoothing
  const smooth = (ref, target, speed = 0.06) => {
    ref.value += (target - ref.value) * speed;
    return ref.value;
  };

  // smoothed audio refs
  const audioStateRef = useRef({
    energy: { value: 0 },
    bass: { value: 0 },
    mid: { value: 0 },
    treble: { value: 0 }
  });

  useEffect(() => {
    initNoise(Date.now() + Math.random() * 10000);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // local reuse buffers
    let bufferLength = analyser ? analyser.frequencyBinCount : 1024;
    let dataArray = new Uint8Array(bufferLength);

    // initialize palette
    const ensurePalette = () => {
      if (!paletteRef.current.current) {
        paletteRef.current.current = generateUniquePalette({
          bassAvg: 0.25,
          midAvg: 0.25,
          highAvg: 0.25,
          spectralCentroid: 0.5,
          harmonicRichness: 0.3
        });
        paletteRef.current.progress = 1;
        paletteRef.current.lastChangeTime = timeRef.current;
      }
    };
    ensurePalette();

    // Create organic blobs (control points) — smaller number for perf
    const createBlobs = (w, h) => {
      const B = [];
      const count = 5; // number of main organic blobs
      for (let i = 0; i < count; i++) {
        const baseRadius = Math.min(w, h) * (0.12 + i * 0.06);
        const controlCount = 12 + Math.floor(Math.random() * 6);
        const controls = new Array(controlCount).fill(0).map((_, j) => ({
          angle: (j / controlCount) * Math.PI * 2,
          radius: baseRadius,
          baseRadius,
          phase: Math.random() * Math.PI * 2,
          noiseOffset: Math.random() * 1000,
          eccentricity: 0.9 + Math.random() * 0.3 // ellipse-like stretch
        }));
        B.push({
          x: w / 2 + (Math.random() - 0.5) * w * 0.08,
          y: h / 2 + (Math.random() - 0.5) * h * 0.08,
          vx: 0,
          vy: 0,
          controls,
          depth: i,
          breath: Math.random() * Math.PI * 2,
          rotation: Math.random() * Math.PI * 2
        });
      }
      blobsRef.current = B;
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createBlobs(canvas.width, canvas.height);

      // Resize local buffers conservatively
      bufferLength = analyser ? analyser.frequencyBinCount : bufferLength;
      dataArray = new Uint8Array(bufferLength);
    };
    resize();
    window.addEventListener('resize', resize);


    const computeAudio = () => {
      bufferLength = analyser ? analyser.frequencyBinCount : bufferLength;
      if (analyser) analyser.getByteFrequencyData(dataArray);
      else dataArray.fill(0);

      // overall energy
      let total = 0;
      for (let i = 0; i < bufferLength; i++) total += dataArray[i];
      const avg = total / Math.max(1, bufferLength);

      // split bands
      const bassEnd = Math.max(2, Math.floor(bufferLength * 0.08));
      const midEnd = Math.max(bassEnd + 2, Math.floor(bufferLength * 0.45));
      let bassSum = 0, midSum = 0, trebleSum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i];
        if (i < bassEnd) bassSum += v;
        else if (i < midEnd) midSum += v;
        else trebleSum += v;
      }
      const bassAvg = bassSum / Math.max(1, bassEnd);
      const midAvg = midSum / Math.max(1, (midEnd - bassEnd));
      const trebleAvg = trebleSum / Math.max(1, (bufferLength - midEnd));

      const norm = n => clamp(n / 255, 0, 1);

      const energy = smooth(audioStateRef.current.energy, norm(avg), 0.05);
      const bass = smooth(audioStateRef.current.bass, norm(bassAvg), 0.06);
      const mid = smooth(audioStateRef.current.mid, norm(midAvg), 0.06);
      const treble = smooth(audioStateRef.current.treble, norm(trebleAvg), 0.06);

      return { energy, bass, mid, treble };
    };


    const updatePalette = (audioSignature = null, force = false) => {
      const p = paletteRef.current;
      if (!p.current || force) {
        const newPal = generateUniquePalette(audioSignature || {
          bassAvg: 0.25,
          midAvg: 0.25,
          highAvg: 0.25,
          spectralCentroid: 0.5,
          harmonicRichness: 0.3
        });
        if (!p.current) {
          p.current = newPal;
          p.progress = 1;
          p.lastChangeTime = timeRef.current;
        } else {
          p.next = newPal;
          p.progress = 0;
          p.lastChangeTime = timeRef.current;
        }
      }

      if (p.next && p.progress < 1) {
        // slower linear progress then eased when applied to color outputs
        p.progress = clamp(p.progress + 0.0015, 0, 1);
        if (p.progress >= 1) {
          p.current = p.next;
          p.next = null;
          p.progress = 1;
        }
      }

      if (p.next && p.progress < 1) {
        // return interpolated palette (linear interpolation inside util)
        return interpolatePalettes(p.current, p.next, easeOutQuad(p.progress));
      }
      return p.current;
    };


    const softFade = (alpha) => {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(0,0,0,${clamp(alpha, 0.015, 0.06)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    };

    // draw volumetric background gradient (deep but desaturated slightly)
    const drawBackground = (palette, audio) => {
      const w = canvas.width, h = canvas.height;
      const cx = w / 2, cy = h / 2;
      const base = getColorFromPalette(palette, 0.15, audio.energy * 0.2);
      const mid = getColorFromPalette(palette, 0.45, audio.mid * 0.2);
      const edge = getColorFromPalette(palette, 0.75, audio.treble * 0.2);

      // less saturated background so blobs pop more
      const bg = { h: base.h, s: Math.max(6, base.s * 0.28), l: Math.max(8, base.l - 28) };
      const top = { h: mid.h, s: Math.max(6, mid.s * 0.24), l: Math.max(8, mid.l - 32) };
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h));
      grad.addColorStop(0, hslToString(bg, 1));
      grad.addColorStop(0.6, hslToString(top, 1));
      grad.addColorStop(1, hslToString({ h: edge.h, s: Math.max(6, edge.s * 0.22), l: Math.max(6, edge.l - 36) }, 1));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    };


    const drawBlobPath = (controls, wobble = 0, rotation = 0) => {

      if (!controls || controls.length === 0) return;
      const pts = controls.map(c => {
        const ang = c.angle + rotation;
        const r = c.radius * (1 + wobble * Math.sin(c.phase + timeRef.current * 0.8 + c.noiseOffset));
        return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
      });

      // draw smooth closed path
      ctx.beginPath();
      const N = pts.length;
      for (let i = 0; i < N; i++) {
        const p0 = pts[(i - 1 + N) % N];
        const p1 = pts[i];
        const p2 = pts[(i + 1) % N];

        const cpx = (p1.x + p2.x) / 2;
        const cpy = (p1.y + p2.y) / 2;

        if (i === 0) ctx.moveTo((p1.x + p0.x) / 2, (p1.y + p0.y) / 2);
        ctx.quadraticCurveTo(p1.x, p1.y, cpx, cpy);
      }
      ctx.closePath();
    };

    // draw one blob with layered gradients + chromatic aberration
    const renderBlob = (blob, palette, audio, wobbleStrength = 0.12) => {
      const depthFactor = 1 + blob.depth * 0.08;
      // base color depends on depth and audio mid/treble
      const colorPos = clamp(0.2 + blob.depth * 0.14 + audio.mid * 0.15, 0, 1);
      const baseColor = getColorFromPalette(palette, colorPos, clamp(audio.energy * 0.6, 0, 1));

      // three layered passes to create volumetric depth
      const layers = [
        { scale: 1.0 * depthFactor, alpha: 0.9, saturateBoost: 0.35, blur: 50 },
        { scale: 1.45 * depthFactor, alpha: 0.5, saturateBoost: 0.18, blur: 28 },
        { scale: 2.2 * depthFactor, alpha: 0.22, saturateBoost: -0.02, blur: 18 }
      ];

      // for small performance gain, reuse some values
      const wobble = wobbleStrength * (0.4 + audio.treble * 0.7);

      for (let li = 0; li < layers.length; li++) {
        const L = layers[li];
        ctx.save();
        ctx.translate(blob.x, blob.y);
        // slight per-layer rotation
        const rot = blob.rotation * (1 + li * 0.03) + li * 0.05;
        // compute dynamic control radii
        for (let ci = 0; ci < blob.controls.length; ci++) {
          const c = blob.controls[ci];
          // dynamic radius = baseRadius * (1 + per-pt noise + bass-driven expansion)
          const noise =
            fractalNoise2D(c.noiseOffset + ci * 0.02 + timeRef.current * 0.08, blob.depth * 0.12, 3, 0.55);
          // micro jitter from treble
          const micro = Math.sin(c.phase + timeRef.current * (0.4 + audio.treble * 2)) * (0.02 + audio.treble * 0.06);
          // bass expansion
          const bassExp = 1 + audio.bass * 0.9;
          // gentle form expansion from overall energy
          const energyExp = 1 + audio.energy * 0.35;
          // eccentricity modulation
          const ecc = c.eccentricity || 1;

          c.radius = c.baseRadius * L.scale * bassExp * energyExp * (1 + noise * 0.12 + micro) * ecc;
        }

        // create layered gradient
        drawBlobPath(blob.controls, wobble, rot);

        // compose layer color
        const sat = clamp(baseColor.s * (1 + L.saturateBoost), 20, 100);
        const lum = clamp(baseColor.l + (li === 0 ? 6 : 2) + audio.mid * 12, 6, 92);
        const layerColor = { h: baseColor.h, s: sat, l: lum };

        // apply shadow/blur by drawing to canvas with globalAlpha and shadow
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = hslToString(toLuminous(layerColor, 0.5 + li * 0.6), clamp(L.alpha * (0.9 + audio.energy * 0.4), 0.08, 1));
        ctx.shadowBlur = L.blur + audio.energy * 40;
        ctx.shadowColor = hslToString(layerColor, clamp(L.alpha * 0.8, 0.05, 0.9));
        ctx.fill();

        // subtle chromatic fringes (thin stroke, slightly offset)
        if (li === 0) {
          // stroke with displaced RGB-ish effect
          ctx.lineWidth = 1 + audio.mid * 2;
          // red fringe
          ctx.strokeStyle = hslToString({ h: (baseColor.h + 8) % 360, s: sat, l: lum }, clamp(0.12 + audio.treble * 0.25, 0.04, 0.5));
          ctx.stroke();
        }

        ctx.restore();
      }
    };

    const renderIdle = (palette) => {
      // update timing
      timeRef.current += 0.016;
      idleTimeRef.current += 0.016;

      // very slow palette drift
      if (!paletteRef.current.current) updatePalette();

      // background: deep but desaturated
      drawBackground(palette, { energy: 0.18, bass: 0.12, mid: 0.12, treble: 0.08 });

      // soft persistent fade to create trails
      softFade(0.02);

      // light, slow blob motion
      blobsRef.current.forEach((b, i) => {
        // per-blob noise-driven target
        const nx = fractalNoise2D(i * 0.3 + idleTimeRef.current * 0.02, b.depth * 0.2, 3, 0.6);
        const ny = fractalNoise2D(b.depth * 0.2, i * 0.3 + idleTimeRef.current * 0.02, 3, 0.6);

        const targetX = canvas.width / 2 + nx * canvas.width * 0.12;
        const targetY = canvas.height / 2 + ny * canvas.height * 0.12;

        // physics interpolation with damping
        b.vx += (targetX - b.x) * 0.006;
        b.vy += (targetY - b.y) * 0.006;
        b.vx *= 0.94;
        b.vy *= 0.94;
        b.x += b.vx;
        b.y += b.vy;

        // gentle breath
        b.breath += 0.008 + i * 0.0007;
        b.rotation += 0.001 + i * 0.0008;

        // mild controls smoothing
        b.controls.forEach((c, ci) => {
          c.phase += 0.002 + (ci % 3) * 0.0008;
        });

        // render lighter blobs
        renderBlob(b, palette, { energy: 0.12, bass: 0.08, mid: 0.08, treble: 0.04 }, 0.08);
      });
    };


    const renderActive = (palette, audio, musicAnalysis) => {
      // background adjusted by energy
      drawBackground(palette, audio);

      // fade trail depends on dynamics (higher dynamics -> lighter trail to keep motion crisp)
      const trailAlpha = clamp(0.018 - (audio.energy * 0.01), 0.009, 0.04);
      softFade(trailAlpha);

      // global scene drift for parallax
      const globalX = Math.sin(timeRef.current * 0.06) * canvas.width * 0.006 * (0.6 + audio.mid);
      const globalY = Math.cos(timeRef.current * 0.05) * canvas.height * 0.006 * (0.6 + audio.treble);

      blobsRef.current.forEach((b, i) => {
        // noise and music driven target
        const texture = clamp((musicAnalysis.texture?.density || 0) * 0.6, 0, 1);
        const harmony = clamp((musicAnalysis.harmony?.richness || 0) * 0.9, 0, 1);
        const rhythmKick = musicAnalysis.rhythm?.isBeat ? Math.min(1, musicAnalysis.rhythm.strength || 0) : 0;

        // melodic direction -> drift bias
        const melodicBias = (musicAnalysis.melody?.direction || 1) * 30;

        // noise scales
        const noiseSpeed = 0.06 + texture * 0.18 + audio.treble * 0.03;
        const noiseRange = 0.18 + texture * 0.45 + audio.mid * 0.12;

        const nx = fractalNoise2D(i * 0.3 + timeRef.current * noiseSpeed, b.depth * 0.12, 4, 0.65);
        const ny = fractalNoise2D(b.depth * 0.12, i * 0.3 + timeRef.current * noiseSpeed, 4, 0.65);

        const targetX = canvas.width / 2 + nx * canvas.width * noiseRange + globalX + melodicBias * (i / blobsRef.current.length);
        const targetY = canvas.height / 2 + ny * canvas.height * noiseRange + globalY + rhythmKick * Math.sin(timeRef.current * 0.8 + i);

        // response speed increases with dynamics
        const response = 0.01 + audio.energy * 0.05 + (b.depth * 0.003);
        b.vx += (targetX - b.x) * response;
        b.vy += (targetY - b.y) * response;
        // friction scaled so inner layers move a bit faster for parallax
        b.vx *= 0.86 + (b.depth * 0.01);
        b.vy *= 0.86 + (b.depth * 0.01);

        b.x += b.vx;
        b.y += b.vy;

        // breathing and rotation influenced by rhythm & dynamics
        b.breath += 0.02 + rhythmKick * 0.08 + audio.mid * 0.01;
        b.rotation += 0.004 + audio.mid * 0.02 + (Math.sin(timeRef.current * 0.2 + i) * 0.001);

        // controls deformation stronger with treble & texture
        b.controls.forEach((c, ci) => {
          // noise produces micro spikes for treble + melody
          const trebleNoise = fractalNoise2D(c.noiseOffset + timeRef.current * (0.8 + audio.treble * 2), ci * 0.12 + i * 0.08, 4, 0.6);
          // apply to phase and small radius jitter
          c.phase += 0.01 + audio.treble * 0.08 + trebleNoise * 0.02;
          // prevent runaway radius by keeping baseRadius stable
          c.radius += ((c.baseRadius * (1 + audio.bass * 0.8 * (1 + harmonicBias(audioAnalysisFallback(musicAnalysis))))) - c.radius) * 0.12;
        });

        // render blob with wobble strength scaled to treble and texture
        const wobble = 0.12 + audio.treble * 0.6 + texture * 0.15;
        renderBlob(b, palette, audio, wobble);
      });

      // optional harmony interference rings (very subtle)
      const harmonyStrength = clamp((musicAnalysis.harmony?.complexity || 0) * 0.8, 0, 1);
      if (harmonyStrength > 0.45) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const ringColor = getColorFromPalette(palette, 0.5, audio.energy * 0.6);
        ctx.strokeStyle = hslToString(toLuminous(ringColor, 1.2), 0.06 + harmonyStrength * 0.12);
        ctx.lineWidth = 1 + audio.energy * 3;
        const rings = 1 + Math.floor(harmonyStrength * 2);
        for (let r = 0; r < rings; r++) {
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2, 140 + r * 120 + audio.energy * 80, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    };

    // fallback helper to avoid undefined musicAnalysis structures
    const audioAnalysisFallback = (ma) => {
      return ma || {
        texture: { density: 0 },
        harmony: { richness: 0, complexity: 0 },
        rhythm: { strength: 0, isBeat: false },
        melody: { centroid: 0.5, direction: 1 },
        pitch: { movement: 0 }
      };
    };

    // small helper to derive harmonicBias used above (keeps code resilient)
    const harmonicBias = (ma) => {
      if (!ma || !ma.harmony) return 0;
      return clamp(ma.harmony.richness || 0, 0, 1);
    };


    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      // compute smoothed audio
      const audio = computeAudio();

      // derive a musicAnalysis object for richer mapping
      const musicAnalysis = analyser ? musicAnalyzer.analyze(dataArray, bufferLength, timeRef.current) : audioAnalysisFallback(null);

      // time step
      timeRef.current += 0.016;

      // ensure palette exists / update occasionally
      const timeSincePalette = timeRef.current - (paletteRef.current.lastChangeTime || 0);
      // decide when to propose palette change (low probability when quiet, higher when active)
      if (audio.energy > 0.16 && timeSincePalette > 10 && Math.random() < 0.006) {
        updatePalette({
          bassAvg: audio.bass,
          midAvg: audio.mid,
          highAvg: audio.treble,
          spectralCentroid: musicAnalysis.pitch?.fundamental || 0.5,
          harmonicRichness: (musicAnalysis.harmony?.richness || 0)
        }, true);
      }

      const activePalette = updatePalette({
        bassAvg: audio.bass,
        midAvg: audio.mid,
        highAvg: audio.treble,
        spectralCentroid: musicAnalysis.pitch?.fundamental || 0.5,
        harmonicRichness: (musicAnalysis.harmony?.richness || 0)
      });

      // choose idle vs active rendering
      if (!analyser || !isPlaying) {
        renderIdle(activePalette);
      } else {
        renderActive(activePalette, audio, musicAnalysis);
      }
    };

    // initialize a subtle base background to avoid first-frame flash
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // start animation
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyser, isPlaying]);

  return <canvas ref={canvasRef} className="visualizer-canvas" style={{ position: 'absolute', inset: 0 }} />;
};

export default AudioVisualizerAurora;
*/































































/*
import React, { useEffect, useRef } from "react";
import {
  generateUniquePalette,
  getColorFromPalette,
  interpolatePalettes,
  hslToString,
  toLuminous,
  toRadiantGlow
} from "../utils/colorUtils";
import { initNoise, fractalNoise2D } from "../utils/noise";
import { musicAnalyzer } from "../utils/musicAnalysis";


const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

const AudioVisualizerAurora = ({ analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const timeRef = useRef(0);

  const paletteRef = useRef({
    current: null,
    next: null,
    progress: 1,
    lastChange: 0
  });

  const zonesRef = useRef([]);
  const freqRef = useRef(new Uint8Array(2048));


  useEffect(() => {
    initNoise(Date.now());
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: true });

    const resize = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const base = Math.min(window.innerWidth, window.innerHeight);

      zonesRef.current = [0.3, 0.55, 0.8].map((depth, i) => ({
        depth,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: 0,
        vy: 0,
        r: base * (0.22 + i * 0.12),
        baseR: base * (0.22 + i * 0.12),
        phase: Math.random() * Math.PI * 2
      }));
    };

    resize();
    window.addEventListener("resize", resize);


    const getAudio = () => {
      if (!analyser) return { bass: 0, mid: 0, treble: 0, energy: 0 };

      analyser.getByteFrequencyData(freqRef.current);
      const data = freqRef.current;
      const len = data.length;

      let bass = 0, mid = 0, treble = 0, total = 0;

      for (let i = 0; i < len; i++) {
        const v = data[i];
        total += v;
        if (i < len * 0.08) bass += v;
        else if (i < len * 0.45) mid += v;
        else treble += v;
      }

      return {
        bass: clamp(bass / (len * 0.08) / 255),
        mid: clamp(mid / (len * 0.37) / 255),
        treble: clamp(treble / (len * 0.55) / 255),
        energy: clamp(total / len / 255)
      };
    };


    const ensurePalette = (sig) => {
      if (!paletteRef.current.current) {
        paletteRef.current.current = generateUniquePalette(sig);
        paletteRef.current.progress = 1;
      }
    };


    const drawBackground = (palette, audio) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(cx, cy));

      [0.1, 0.4, 0.75].forEach((p, i) => {
        const c = getColorFromPalette(palette, p, audio.energy * 0.2);
        g.addColorStop(
          i === 0 ? 0 : i === 1 ? 0.5 : 1,
          hslToString({ h: c.h, s: c.s * 0.3, l: c.l * 0.3 }, 1)
        );
      });

      ctx.fillStyle = g;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    };

    const drawZone = (z, palette, audio, music, t) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;


      z.vx += (cx - z.x) * audio.bass * 0.18 * z.depth;
      z.vy += (cy - z.y) * audio.bass * 0.18 * z.depth;


      z.vx += fractalNoise2D(z.depth, t * 0.05, 3, 0.5) * 1.2;
      z.vy += fractalNoise2D(t * 0.05, z.depth, 3, 0.5) * 1.2;

      z.vx *= 0.92;
      z.vy *= 0.92;

      z.x = clamp(z.x + z.vx, 0, window.innerWidth);
      z.y = clamp(z.y + z.vy, 0, window.innerHeight);


      const harmony = clamp(music?.harmony?.richness || 0);
      const warp = clamp(
        harmony * 0.35 +
          fractalNoise2D(z.depth + t * 0.15, z.phase, 3, 0.5) * 0.25,
        -0.5,
        0.5
      );

      const targetR = clamp(
        z.baseR * (1 + audio.bass * 0.7 + warp),
        z.baseR * 0.6,
        Math.min(window.innerWidth, window.innerHeight) * 0.9
      );
      z.r += (targetR - z.r) * 0.08;

      const col = getColorFromPalette(
        palette,
        0.3 + z.depth * 0.3,
        audio.energy
      );

      const glow = toRadiantGlow(toLuminous(col, 1.1), audio.energy);

      const grad = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r * 1.2);
      grad.addColorStop(0, hslToString(glow, 0.85));
      grad.addColorStop(0.5, hslToString(col, 0.35));
      grad.addColorStop(1, "transparent");

      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      if (audio.energy > 0.2) {
        ctx.strokeStyle = hslToString(col, 0.08);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * (1.15 + audio.treble * 0.2), 0, Math.PI * 2);
        ctx.stroke();
      }
    };


    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      timeRef.current += 0.016;

      const audio = getAudio();
      const music = analyser
        ? musicAnalyzer.analyze(freqRef.current, freqRef.current.length, timeRef.current)
        : null;

      ensurePalette({
        bassAvg: audio.bass,
        midAvg: audio.mid,
        highAvg: audio.treble,
        harmonicRichness: music?.harmony?.richness || 0.3
      });

      drawBackground(paletteRef.current.current, audio);

      zonesRef.current.forEach(z =>
        drawZone(z, paletteRef.current.current, audio, music, timeRef.current)
      );
    };

    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [analyser, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%"
      }}
    />
  );
};

export default AudioVisualizerAurora;
*/





/*
// src/visualizers/AudioVisualizer-Aurora.jsx
import React, { useEffect, useRef } from 'react';
import {
  generateUniquePalette,
  getColorFromPalette,
  hslToString,
  toLuminous,
  interpolatePalettes
} from '../utils/colorUtils';
import { musicAnalyzer } from '../utils/musicAnalysis';

const AURORA_MODES = {
  IDLE: "idle",
  ACTIVE: "active",
};

// --- Utilities ---
const makeNoisePerm = (seed = 1) => {
  const p = new Uint8Array(512);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed >>> 0;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  for (let i = 0; i < 256; i++) p[256 + i] = p[i];
  return p;
};

const perm = makeNoisePerm(Math.floor(Math.random() * 65535));
const fade = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

const noise2D = (x, y) => {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const a = perm[(xi + perm[yi]) & 255] / 255;
  const b = perm[(xi + 1 + perm[yi]) & 255] / 255;
  const c = perm[(xi + perm[yi + 1]) & 255] / 255;
  const d = perm[(xi + 1 + perm[yi + 1]) & 255] / 255;
  const u = fade(xf);
  const v = fade(yf);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
};

const fractalNoise = (x, y, oct = 3, lacunarity = 2, gain = 0.5) => {
  let amp = 1; let freq = 1; let sum = 0; let max = 0;
  for (let i = 0; i < oct; i++) {
    sum += noise2D(x * freq, y * freq) * amp;
    max += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / Math.max(1e-6, max);
};

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

const AudioVisualizerAurora = ({ analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const timeRef = useRef(0);
  const idleTimeRef = useRef(0);
  const transitionRef = useRef(0); // 0 = idle, 1 = active

  const paletteRef = useRef({
    current: null,
    next: null,
    progress: 1,
    lastChangeTime: 0
  });

  const audioRef = useRef({ energy: 0, bass: 0, mid: 0, treble: 0 });
  const zonesRef = useRef([]);
  const hasMusicAnalyzer = typeof musicAnalyzer !== 'undefined' && musicAnalyzer && typeof musicAnalyzer.analyze === 'function';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let bufferLength = analyser ? analyser.frequencyBinCount : 1024;
    let dataArray = new Uint8Array(bufferLength);

    const createZones = (w, h) => {
      const zones = [];
      const base = Math.min(w, h) * 0.22;
      for (let i = 0; i < 3; i++) {
        zones.push({
          x: w / 2,
          y: h / 2,
          vx: 0,
          vy: 0,
          rx: base * (1 + i * 0.35),
          ry: base * (0.9 + i * 0.28),
          targetRx: base * (1 + i * 0.35),
          targetRy: base * (0.9 + i * 0.28),
          rot: Math.random() * Math.PI * 2,
          rotVel: 0,
          depth: i,
          breathPhase: Math.random() * Math.PI * 2,
          chroma: (i / 3)
        });
      }
      zonesRef.current = zones;
    };

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createZones(width, height);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const ensurePalette = () => {
      if (!paletteRef.current.current) {
        paletteRef.current.current = generateUniquePalette({
          bassAvg: 0.25, midAvg: 0.25, highAvg: 0.25, spectralCentroid: 0.5, harmonicRichness: 0.3
        });
        paletteRef.current.progress = 1;
        paletteRef.current.lastChangeTime = timeRef.current;
      }
    };
    ensurePalette();

    const smooth = (refVal, target, speed = 0.06) => refVal + (target - refVal) * speed;

    const computeAudio = () => {
      // --- Added your requested transition logic here ---
      const target = isPlaying ? 1 : 0;
      transitionRef.current += (target - transitionRef.current) * 0.035;

      if (analyser) {
        analyser.getByteFrequencyData(dataArray); // Found the line!
      } else {
        dataArray.fill(0);
      }

      let total = 0;
      for (let i = 0; i < bufferLength; i++) total += dataArray[i];
      const avg = total / Math.max(1, bufferLength);

      const bassEnd = Math.max(2, Math.floor(bufferLength * 0.08));
      const midEnd = Math.max(bassEnd + 2, Math.floor(bufferLength * 0.45));
      let bassSum = 0, midSum = 0, trebleSum = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i];
        if (i < bassEnd) bassSum += v;
        else if (i < midEnd) midSum += v;
        else trebleSum += v;
      }

      const norm = n => clamp(n / 255, 0, 1);
      audioRef.current.energy = smooth(audioRef.current.energy, norm(avg), 0.05);
      audioRef.current.bass = smooth(audioRef.current.bass, norm(bassAvg), 0.06);
      audioRef.current.mid = smooth(audioRef.current.mid, norm(midAvg), 0.06);
      audioRef.current.treble = smooth(audioRef.current.treble, norm(trebleAvg), 0.06);

      return { ...audioRef.current };
    };

    const updatePalette = (audioSignature = null, force = false) => {
      const p = paletteRef.current;
      if (!p.current || force) {
        const newPal = generateUniquePalette(audioSignature || {
          bassAvg: 0.25, midAvg: 0.25, highAvg: 0.25, spectralCentroid: 0.5, harmonicRichness: 0.3
        });
        if (!p.current) {
          p.current = newPal;
          p.progress = 1;
        } else {
          p.next = newPal;
          p.progress = 0;
        }
        p.lastChangeTime = timeRef.current;
      }
      if (p.next && p.progress < 1) {
        p.progress = clamp(p.progress + 0.0012, 0, 1);
        if (p.progress >= 1) {
          p.current = p.next;
          p.next = null;
        }
        return interpolatePalettes(p.current, p.next, easeOutCubic(p.progress));
      }
      return p.current;
    };

    const softFade = (alpha) => {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(0,0,0,${clamp(alpha, 0.01, 0.05)})`;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.restore();
    };

    const drawBackground = (palette, energy) => {
      const w = window.innerWidth, h = window.innerHeight;
      const base = getColorFromPalette(palette, 0.14, energy * 0.18);
      const mid = getColorFromPalette(palette, 0.44, energy * 0.14);
      const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h));
      grad.addColorStop(0, hslToString({ ...base, l: Math.max(4, base.l - 30) }, 1));
      grad.addColorStop(1, hslToString({ ...mid, l: Math.max(2, mid.l - 40) }, 1));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    };

    const drawZoneLayer = (zone, color, alpha = 0.5, blur = 24, scale = 1) => {
      ctx.save();
      // Multiply alpha by transitionRef to fade out when paused
      const finalAlpha = alpha * transitionRef.current;
      if (finalAlpha <= 0) { ctx.restore(); return; }

      ctx.translate(zone.x, zone.y);
      ctx.rotate(zone.rot);
      const rx = Math.max(1, zone.rx * scale);
      const ry = Math.max(1, zone.ry * scale);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
      g.addColorStop(0, hslToString(toLuminous(color, 1.0), finalAlpha));
      g.addColorStop(0.45, hslToString(color, finalAlpha * 0.6));
      g.addColorStop(1, 'transparent');
      ctx.globalCompositeOperation = 'screen';
      ctx.shadowBlur = blur;
      ctx.shadowColor = hslToString(color, finalAlpha * 0.9);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const renderZones = (palette, audio) => {
      zonesRef.current.forEach(z => {
        const colorPos = clamp(0.2 + z.depth * 0.18 + audio.mid * 0.12, 0, 1);
        const baseColor = getColorFromPalette(palette, colorPos, clamp(audio.energy * 0.6, 0, 1));
        drawZoneLayer(z, { ...baseColor, s: Math.min(100, baseColor.s + 8) }, 0.9, 32, 1.0);
        drawZoneLayer(z, { ...baseColor, h: (baseColor.h + 10) % 360 }, 0.45, 28, 1.45);
      });
    };

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const audio = computeAudio();
      const musicAnalysis = (hasMusicAnalyzer && analyser) ? musicAnalyzer.analyze(dataArray, bufferLength, timeRef.current) : null;

      timeRef.current += 0.016;

      const activePalette = updatePalette({
        bassAvg: audio.bass,
        midAvg: audio.mid,
        highAvg: audio.treble,
        spectralCentroid: musicAnalysis?.pitch?.fundamental || 0.5,
        harmonicRichness: musicAnalysis?.harmony?.richness || 0
      });

      drawBackground(activePalette, audio.energy);
      softFade(clamp(0.025 - audio.energy * 0.008, 0.008, 0.035));

      zonesRef.current.forEach((z, i) => {
        const noiseSlow = fractalNoise(i * 0.3 + timeRef.current * 0.02, z.depth * 0.2, 3);
        const noiseFast = fractalNoise(i * 0.9 + timeRef.current * 0.12, z.depth * 0.36, 2);

        z.targetX = window.innerWidth / 2 + (noiseSlow - 0.5) * window.innerWidth * 0.15;
        z.targetY = window.innerHeight / 2 + (noiseFast - 0.5) * window.innerHeight * 0.12;

        const resp = 0.008 + audio.energy * 0.06;
        z.vx += (z.targetX - z.x) * resp;
        z.vy += (z.targetY - z.y) * resp;
        z.vx *= 0.92; z.vy *= 0.92;
        z.x += z.vx; z.y += z.vy;

        z.breathPhase += 0.008 + audio.bass * 0.02;
        const breathe = 1 + Math.sin(z.breathPhase) * (0.06 + audio.mid * 0.08);
        z.rx = z.targetRx * breathe * (1 + audio.bass * 0.3);
        z.ry = z.targetRy * breathe * (1 + audio.bass * 0.3);
        z.rot += (0.002 + audio.mid * 0.01);
      });

      renderZones(activePalette, audio);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className="visualizer-canvas"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, background: '#000' }}
      aria-hidden
    />
  );
};

export default AudioVisualizerAurora;
*/
























/*
// src/visualizers/AudioVisualizer-Aurora.jsx
import React, { useEffect, useRef } from 'react';
import {
  generateUniquePalette,
  getColorFromPalette,
  hslToString,
  toLuminous,
  interpolatePalettes
} from '../utils/colorUtils';
import { musicAnalyzer } from '../utils/musicAnalysis';

// --- Noise Utilities (deterministic & fast) ---
const makeNoisePerm = (seed = 1) => {
  const p = new Uint8Array(512);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed >>> 0;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  for (let i = 0; i < 256; i++) p[256 + i] = p[i];
  return p;
};

const perm = makeNoisePerm(Math.floor(Math.random() * 65535));
const fade = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

const noise2D = (x, y) => {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const a = perm[(xi + perm[yi]) & 255] / 255;
  const b = perm[(xi + 1 + perm[yi]) & 255] / 255;
  const c = perm[(xi + perm[yi + 1]) & 255] / 255;
  const d = perm[(xi + 1 + perm[yi + 1]) & 255] / 255;
  const u = fade(xf);
  const v = fade(yf);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
};

const fractalNoise = (x, y, oct = 3, lacunarity = 2, gain = 0.5) => {
  let amp = 1, freq = 1, sum = 0, max = 0;
  for (let i = 0; i < oct; i++) {
    sum += noise2D(x * freq, y * freq) * amp;
    max += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / Math.max(1e-6, max);
};

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

const AudioVisualizerAurora = ({ analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const timeRef = useRef(0);
  const transitionRef = useRef(0); // 0 = idle, 1 = active

  const paletteRef = useRef({
    current: null,
    next: null,
    progress: 1,
    lastChangeTime: 0
  });

  const audioRef = useRef({ energy: 0, bass: 0, mid: 0, treble: 0 });
  const zonesRef = useRef([]);
  const hasMusicAnalyzer = typeof musicAnalyzer !== 'undefined' && musicAnalyzer && typeof musicAnalyzer.analyze === 'function';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let bufferLength = analyser ? analyser.frequencyBinCount : 1024;
    let dataArray = new Uint8Array(bufferLength);

    const createZones = (w, h) => {
      const zones = [];
      const base = Math.min(w, h) * 0.22;
      for (let i = 0; i < 3; i++) {
        zones.push({
          x: w / 2,
          y: h / 2,
          vx: 0,
          vy: 0,
          rx: base * (1 + i * 0.35),
          ry: base * (0.9 + i * 0.28),
          targetRx: base * (1 + i * 0.35),
          targetRy: base * (0.9 + i * 0.28),
          rot: Math.random() * Math.PI * 2,
          depth: i,
          breathPhase: Math.random() * Math.PI * 2,
          rotVel: 0
        });
      }
      zonesRef.current = zones;
    };

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createZones(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const smooth = (refVal, target, speed = 0.06) => refVal + (target - refVal) * speed;

    const computeAudio = () => {
      // --- INSERTED YOUR TRANSITION LOGIC HERE ---
      const target = isPlaying ? 1 : 0;
      transitionRef.current += (target - transitionRef.current) * 0.035;

      // --- FOUND LINE: getByteFrequencyData ---
      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        dataArray.fill(0);
      }

      let total = 0;
      for (let i = 0; i < bufferLength; i++) total += dataArray[i];
      const avg = total / Math.max(1, bufferLength);

      const bassEnd = Math.max(2, Math.floor(bufferLength * 0.08));
      const midEnd = Math.max(bassEnd + 2, Math.floor(bufferLength * 0.45));
      let bassSum = 0, midSum = 0, trebleSum = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i];
        if (i < bassEnd) bassSum += v;
        else if (i < midEnd) midSum += v;
        else trebleSum += v;
      }

      // FIX: Defining the averages to prevent ReferenceError
      const bassAvg = bassSum / Math.max(1, bassEnd);
      const midAvg = midSum / Math.max(1, midEnd - bassEnd);
      const trebleAvg = trebleSum / Math.max(1, bufferLength - midEnd);

      const norm = n => clamp(n / 255, 0, 1);
      audioRef.current.energy = smooth(audioRef.current.energy, norm(avg), 0.05);
      audioRef.current.bass = smooth(audioRef.current.bass, norm(bassAvg), 0.06);
      audioRef.current.mid = smooth(audioRef.current.mid, norm(midAvg), 0.06);
      audioRef.current.treble = smooth(audioRef.current.treble, norm(trebleAvg), 0.06);

      return { ...audioRef.current };
    };

    const updatePalette = (audioSignature = null) => {
      const p = paletteRef.current;
      if (!p.current) {
        p.current = generateUniquePalette(audioSignature || { bassAvg: 0.25, midAvg: 0.25, highAvg: 0.25 });
        p.progress = 1;
      }
      return p.current;
    };

    const drawBackground = (palette, energy) => {
      const w = window.innerWidth, h = window.innerHeight;
      const base = getColorFromPalette(palette, 0.14, energy * 0.18);
      const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h));
      grad.addColorStop(0, hslToString({ ...base, l: Math.max(4, base.l - 30) }, 1));
      grad.addColorStop(1, '#000');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    };

    const drawZoneLayer = (zone, color, alpha = 0.5, blur = 24, scale = 1) => {
      ctx.save();
      // Apply transitionRef to visibility
      const finalAlpha = alpha * transitionRef.current;
      if (finalAlpha <= 0.005) { ctx.restore(); return; }

      ctx.translate(zone.x, zone.y);
      ctx.rotate(zone.rot);
      const rx = Math.max(1, zone.rx * scale);
      const ry = Math.max(1, zone.ry * scale);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
      g.addColorStop(0, hslToString(toLuminous(color, 1.0), finalAlpha));
      g.addColorStop(0.45, hslToString(color, finalAlpha * 0.6));
      g.addColorStop(1, 'transparent');
      ctx.globalCompositeOperation = 'screen';
      ctx.shadowBlur = blur;
      ctx.shadowColor = hslToString(color, finalAlpha * 0.9);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const renderZones = (palette, audio) => {
      zonesRef.current.forEach(z => {
        const colorPos = clamp(0.2 + z.depth * 0.18 + audio.mid * 0.12, 0, 1);
        const baseColor = getColorFromPalette(palette, colorPos, clamp(audio.energy * 0.6, 0, 1));

        // Chromatic Aberration Layers from your "Old" code
        drawZoneLayer(z, baseColor, 0.8, 32, 1.0);

        // Subtle RGB shift pass
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.translate(z.x, z.y);
        ctx.rotate(z.rot);
        ctx.beginPath();
        ctx.ellipse(2 + audio.treble * 5, 0, z.rx * 1.1, z.ry * 1.1, 0, 0, Math.PI * 2);
        ctx.fillStyle = hslToString({ ...baseColor, h: (baseColor.h + 20) % 360 }, 0.1 * transitionRef.current);
        ctx.fill();
        ctx.restore();
      });
    };

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const audio = computeAudio();
      timeRef.current += 0.016;

      const activePalette = updatePalette({
        bassAvg: audio.bass,
        midAvg: audio.mid,
        highAvg: audio.treble
      });

      drawBackground(activePalette, audio.energy);

      // Update Zone Physics (Old Logic)
      zonesRef.current.forEach((z, i) => {
        const nS = fractalNoise(i * 0.3 + timeRef.current * 0.02, z.depth * 0.2);
        const nF = fractalNoise(i * 0.9 + timeRef.current * 0.12, z.depth * 0.36);

        z.targetX = window.innerWidth/2 + (nS - 0.5) * window.innerWidth * 0.15;
        z.targetY = window.innerHeight/2 + (nF - 0.5) * window.innerHeight * 0.12;

        const resp = 0.008 + audio.energy * 0.06;
        z.vx += (z.targetX - z.x) * resp;
        z.vy += (z.targetY - z.y) * resp;
        z.vx *= 0.92; z.vy *= 0.92;
        z.x += z.vx; z.y += z.vy;

        z.breathPhase += 0.008 + audio.bass * 0.02;
        z.rx = z.targetRx * (1 + Math.sin(z.breathPhase) * 0.1) * (1 + audio.bass * 0.3);
        z.ry = z.targetRy * (1 + Math.cos(z.breathPhase) * 0.1) * (1 + audio.bass * 0.3);
        z.rot += (0.002 + audio.mid * 0.01);
      });

      renderZones(activePalette, audio);

      // Energetic Particles (Old Feature)
      if (audio.energy > 0.4 && Math.random() < 0.1) {
        ctx.fillStyle = "#fff";
        ctx.globalAlpha = 0.4 * transitionRef.current;
        ctx.beginPath();
        ctx.arc(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 1 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000' }}
    />
  );
};

export default AudioVisualizerAurora;
*/




























import React, { useEffect, useRef } from 'react';
import {
  generateUniquePalette,
  getColorFromPalette,
  hslToString,
  toLuminous,
  interpolatePalettes
} from '../utils/colorUtils';
import { musicAnalyzer } from '../utils/musicAnalysis';

// --- Noise Utilities (PRESERVED) ---
const makeNoisePerm = (seed = 1) => {
  const p = new Uint8Array(512);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed >>> 0;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 256; i++) p[256 + i] = p[i];
  return p;
};
const perm = makeNoisePerm(Math.floor(Math.random() * 65535));
const fade = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const noise2D = (x, y) => {
  const xi = Math.floor(x) & 255; const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x); const yf = y - Math.floor(y);
  const u = fade(xf); const v = fade(yf);
  const a = perm[(xi + perm[yi]) & 255] / 255;
  const b = perm[(xi + 1 + perm[yi]) & 255] / 255;
  const c = perm[(xi + perm[yi + 1]) & 255] / 255;
  const d = perm[(xi + 1 + perm[yi + 1]) & 255] / 255;
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
};
const fractalNoise = (x, y, oct = 3) => {
  let amp = 1, freq = 1, sum = 0, max = 0;
  for (let i = 0; i < oct; i++) { sum += noise2D(x * freq, y * freq) * amp; max += amp; amp *= 0.5; freq *= 2; }
  return sum / max;
};

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

const AudioVisualizerAurora = ({ analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const timeRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const transitionRef = useRef(0);

  const paletteRef = useRef({ current: null, next: null, progress: 1 });
  const audioRef = useRef({ energy: 0, bass: 0, mid: 0, treble: 0 });
  const zonesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    const createZones = (w, h) => {
      const zones = [];
      const base = Math.min(w, h) * 0.22;
      for (let i = 0; i < 3; i++) {
        zones.push({ x: w / 2, y: h / 2, vx: 0, vy: 0, rx: base * (1 + i * 0.35), ry: base * (0.9 + i * 0.28), targetRx: base * (1 + i * 0.35), targetRy: base * (0.9 + i * 0.28), rot: Math.random() * Math.PI * 2, depth: i, breathPhase: Math.random() * Math.PI * 2 });
      }
      zonesRef.current = zones;
    };

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // PERFORMANCE
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createZones(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const animate = (now) => {
      rafRef.current = requestAnimationFrame(animate);

      // PERFORMANCE: Throttle idle framerate
      if (!isPlaying && now - lastTimeRef.current < 32) return;
      lastTimeRef.current = now;

      // IDLE DATA & TRANSITION
      const target = isPlaying ? 1 : 0.4; // Keep 40% visibility in idle
      transitionRef.current += (target - transitionRef.current) * 0.035;

      let bufferLength = analyser ? analyser.frequencyBinCount : 128;
      let dataArray = new Uint8Array(bufferLength);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // IDLE MODE: Faint pulsing signal
        const idleVal = 20 + Math.sin(Date.now() * 0.001) * 10;
        dataArray.fill(idleVal);
      }

      // AUDIO CALCS (PRESERVED)
      let total = 0; for (let i = 0; i < bufferLength; i++) total += dataArray[i];
      const avg = total / bufferLength;
      const bassEnd = Math.floor(bufferLength * 0.1);
      const midEnd = Math.floor(bufferLength * 0.5);
      let bSum = 0, mSum = 0, tSum = 0;
      for (let i = 0; i < bufferLength; i++) {
        if (i < bassEnd) bSum += dataArray[i];
        else if (i < midEnd) mSum += dataArray[i];
        else tSum += dataArray[i];
      }

      const smooth = (v, t, s) => v + (t - v) * s;
      audioRef.current.energy = smooth(audioRef.current.energy, clamp(avg/255), 0.05);
      audioRef.current.bass = smooth(audioRef.current.bass, clamp((bSum/bassEnd)/255), 0.06);
      audioRef.current.mid = smooth(audioRef.current.mid, clamp((mSum/(midEnd-bassEnd))/255), 0.06);
      audioRef.current.treble = smooth(audioRef.current.treble, clamp((tSum/(bufferLength-midEnd))/255), 0.06);

      const audio = audioRef.current;
      timeRef.current += 0.016;

      const p = paletteRef.current;
      if (!p.current) p.current = generateUniquePalette({ bassAvg: 0.2, midAvg: 0.2, highAvg: 0.2 });
      const activePalette = p.current;

      // BACKGROUND (PRESERVED)
      const base = getColorFromPalette(activePalette, 0.14, audio.energy * 0.18);
      const grad = ctx.createRadialGradient(window.innerWidth/2, window.innerHeight/2, 0, window.innerWidth/2, window.innerHeight/2, Math.max(window.innerWidth, window.innerHeight));
      grad.addColorStop(0, hslToString({ ...base, l: Math.max(4, base.l - 30) }, 1));
      grad.addColorStop(1, '#000');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      // ZONES & PHYSICS (PRESERVED)
      zonesRef.current.forEach((z, i) => {
        const nS = fractalNoise(i * 0.3 + timeRef.current * 0.02, z.depth * 0.2);
        const nF = fractalNoise(i * 0.9 + timeRef.current * 0.12, z.depth * 0.36);
        z.vx += (window.innerWidth/2 + (nS - 0.5) * window.innerWidth * 0.15 - z.x) * (0.008 + audio.energy * 0.06);
        z.vy += (window.innerHeight/2 + (nF - 0.5) * window.innerHeight * 0.12 - z.y) * (0.008 + audio.energy * 0.06);
        z.vx *= 0.92; z.vy *= 0.92; z.x += z.vx; z.y += z.vy;

        z.breathPhase += 0.008 + audio.bass * 0.02;
        z.rx = z.targetRx * (1 + Math.sin(z.breathPhase) * 0.1) * (1 + audio.bass * 0.3);
        z.ry = z.targetRy * (1 + Math.cos(z.breathPhase) * 0.1) * (1 + audio.bass * 0.3);
        z.rot += (0.002 + audio.mid * 0.01);

        const colorPos = clamp(0.2 + z.depth * 0.18 + audio.mid * 0.12, 0, 1);
        const color = getColorFromPalette(activePalette, colorPos, audio.energy * 0.6);

        ctx.save();
        ctx.translate(z.x, z.y);
        ctx.rotate(z.rot);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(z.rx, z.ry));
        const alpha = 0.5 * transitionRef.current;
        g.addColorStop(0, hslToString(toLuminous(color, 1.0), alpha));
        g.addColorStop(1, 'transparent');
        ctx.globalCompositeOperation = 'screen';
        ctx.shadowBlur = 24; ctx.shadowColor = hslToString(color, alpha);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(0, 0, z.rx, z.ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isPlaying]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000' }} />;
};

export default AudioVisualizerAurora;





/*
import React, { useEffect, useRef } from 'react';
import {
  generateUniquePalette,
  getColorFromPalette,
  hslToString,
  toLuminous,
  interpolatePalettes
} from '../utils/colorUtils';
import { musicAnalyzer } from '../utils/musicAnalysis';

// --- Noise Utilities (Preserved) ---
const makeNoisePerm = (seed = 1) => { const p = new Uint8Array(512); for (let i = 0; i < 256; i++) p[i] = i; let s = seed >>> 0; for (let i = 255; i > 0; i--) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); const t = p[i]; p[i] = p[j]; p[j] = t; } for (let i = 0; i < 256; i++) p[256 + i] = p[i]; return p; };
const perm = makeNoisePerm(Date.now());
const fade = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const noise2D = (x, y) => { const xi = Math.floor(x) & 255; const yi = Math.floor(y) & 255; const xf = x - Math.floor(x); const yf = y - Math.floor(y); const u = fade(xf); const v = fade(yf); const a = perm[(xi + perm[yi]) & 255] / 255; const b = perm[(xi + 1 + perm[yi]) & 255] / 255; const c = perm[(xi + perm[yi + 1]) & 255] / 255; const d = perm[(xi + 1 + perm[yi + 1]) & 255] / 255; return lerp(lerp(a, b, u), lerp(c, d, u), v); };
const fractalNoise = (x, y, oct = 3) => { let amp = 1, freq = 1, sum = 0, max = 0; for (let i = 0; i < oct; i++) { sum += noise2D(x * freq, y * freq) * amp; max += amp; amp *= 0.5; freq *= 2; } return sum / max; };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

const AudioVisualizerAurora = ({ analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const timeRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const transitionRef = useRef(0);
  const paletteRef = useRef({ current: null, next: null, progress: 1 });
  const audioRef = useRef({ energy: 0, bass: 0, mid: 0, treble: 0 });
  const zonesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const base = Math.min(window.innerWidth, window.innerHeight) * 0.22;
      zonesRef.current = Array.from({ length: 3 }, (_, i) => ({
        x: window.innerWidth / 2, y: window.innerHeight / 2, vx: 0, vy: 0,
        rx: base * (1 + i * 0.35), ry: base * (0.9 + i * 0.28),
        targetRx: base * (1 + i * 0.35), targetRy: base * (0.9 + i * 0.28),
        rot: Math.random() * Math.PI * 2, depth: i, breathPhase: Math.random() * Math.PI * 2
      }));
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const animate = (now) => {
      rafRef.current = requestAnimationFrame(animate);
      if (!isPlaying && now - lastTimeRef.current < 32) return;
      lastTimeRef.current = now;

      const p = paletteRef.current;
      if (!p.current) p.current = generateUniquePalette({ bassAvg: 0.2, midAvg: 0.2, highAvg: 0.2 });

      const targetVis = isPlaying ? 1 : 0.4;
      transitionRef.current += (targetVis - transitionRef.current) * 0.035;

      let dataArray = new Uint8Array(analyser ? analyser.frequencyBinCount : 128);
      if (isPlaying && analyser) analyser.getByteFrequencyData(dataArray);
      else dataArray.fill(20 + Math.sin(now * 0.001) * 10);

      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      audioRef.current.energy = audioRef.current.energy + (clamp(avg / 255) - audioRef.current.energy) * 0.05;
      timeRef.current += 0.016;

      const activePalette = p.current;

      // --- DYNAMIC BACKGROUND COLOR ---
      // We take a color from the palette, drastically reduce saturation and lightness
      const baseCol = getColorFromPalette(activePalette, 0.5, 0.2);
      const bgH = baseCol.h;
      const bgS = Math.max(5, baseCol.s * 0.15); // De-saturated
      const bgL = Math.max(3, baseCol.l * 0.1);  // Darkened but not black

      const bgGrad = ctx.createRadialGradient(
        window.innerWidth / 2, window.innerHeight / 2, 0,
        window.innerWidth / 2, window.innerHeight / 2, Math.max(window.innerWidth, window.innerHeight)
      );
      bgGrad.addColorStop(0, `hsl(${bgH}, ${bgS}%, ${bgL + 4}%)`); // Slightly lighter core
      bgGrad.addColorStop(1, `hsl(${bgH}, ${bgS}%, ${bgL}%)`);     // Darker edges

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      zonesRef.current.forEach((z, i) => {
        // Physics
        const nS = fractalNoise(i * 0.3 + timeRef.current * 0.02, z.depth * 0.2);
        const nF = fractalNoise(i * 0.9 + timeRef.current * 0.12, z.depth * 0.36);
        z.vx += (window.innerWidth / 2 + (nS - 0.5) * window.innerWidth * 0.15 - z.x) * 0.01;
        z.vy += (window.innerHeight / 2 + (nF - 0.5) * window.innerHeight * 0.12 - z.y) * 0.01;
        z.vx *= 0.92; z.vy *= 0.92; z.x += z.vx; z.y += z.vy;
        z.breathPhase += 0.01;
        z.rx = z.targetRx * (1 + Math.sin(z.breathPhase) * 0.1);
        z.ry = z.targetRy * (1 + Math.cos(z.breathPhase) * 0.1);

        const color = getColorFromPalette(activePalette, 0.2 + z.depth * 0.18, audioRef.current.energy);

        ctx.save();
        ctx.translate(z.x, z.y);
        ctx.rotate(z.rot);

        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(z.rx, z.ry));
        const alpha = 0.7 * transitionRef.current;
        g.addColorStop(0, hslToString(toLuminous(color, 1.1), alpha));
        g.addColorStop(0.65, hslToString(color, alpha * 0.4)); // Tighter edge for visibility
        g.addColorStop(1, 'transparent');

        ctx.globalCompositeOperation = 'screen';
        ctx.shadowBlur = 35; ctx.shadowColor = hslToString(color, alpha);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(0, 0, z.rx, z.ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    };

    animate(performance.now());
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isPlaying]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />;
};

export default AudioVisualizerAurora;
*/
