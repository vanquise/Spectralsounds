// src/utils/musicAnalysis.js
// Comprehensive music component analyzer for all 8 musical elements

export class MusicAnalyzer {
  constructor() {
    this.history = {
      beats: [],
      pitchChanges: [],
      energyLevels: []
    };

    this.smoothed = {
      rhythm: { tempo: 120, strength: 0, consistency: 0.5 },
      melody: { direction: 0, contour: [], smoothness: 0.5, range: 0 },
      harmony: { complexity: 0, richness: 0, consonance: 0.5, tension: 0 },
      texture: { density: 0, layering: 0, clarity: 0.5, thickness: 0 },
      timbre: { brightness: 0.5, warmth: 0.5, roughness: 0, attack: 0.5 },
      dynamics: { current: 0, range: 0, peak: 0, rms: 0, envelope: 0 },
      form: { section: 0, transition: false, energy: 0, development: 0 },
      pitch: { fundamental: 0, clarity: 0, stability: 0, movement: 0 }
    };
  }

  analyze(dataArray, bufferLength, timeRef) {
    const analysis = {};

    // 1. RHYTHM ANALYSIS
    analysis.rhythm = this.analyzeRhythm(dataArray, bufferLength, timeRef);

    // 2. MELODY ANALYSIS
    analysis.melody = this.analyzeMelody(dataArray, bufferLength);

    // 3. HARMONY ANALYSIS
    analysis.harmony = this.analyzeHarmony(dataArray, bufferLength);

    // 4. TEXTURE ANALYSIS
    analysis.texture = this.analyzeTexture(dataArray, bufferLength);

    // 5. TIMBRE ANALYSIS
    analysis.timbre = this.analyzeTimbre(dataArray, bufferLength);

    // 6. DYNAMICS ANALYSIS
    analysis.dynamics = this.analyzeDynamics(dataArray, bufferLength);

    // 7. FORM ANALYSIS
    analysis.form = this.analyzeForm(dataArray, timeRef);

    // 8. PITCH ANALYSIS
    analysis.pitch = this.analyzePitch(dataArray, bufferLength);

    // Smooth all values
    this.smoothAnalysis(analysis);

    return this.smoothed;
  }

  analyzeRhythm(dataArray, bufferLength, timeRef) {
    const bassRange = Math.floor(bufferLength * 0.08);
    const bass = dataArray.slice(0, bassRange).reduce((a, b) => a + b, 0) / bassRange;

    // Beat detection
    const beatThreshold = 100;
    const isBeat = bass > beatThreshold;

    if (isBeat && this.history.beats.length > 0) {
      const lastBeat = this.history.beats[this.history.beats.length - 1];
      const timeDiff = timeRef - lastBeat.time;

      if (timeDiff > 0.2 && timeDiff < 2) {
        const tempo = 60 / timeDiff;
        this.history.beats.push({ time: timeRef, strength: bass / 255 });

        if (this.history.beats.length > 16) this.history.beats.shift();

        // Calculate rhythm consistency
        const intervals = [];
        for (let i = 1; i < this.history.beats.length; i++) {
          intervals.push(this.history.beats[i].time - this.history.beats[i-1].time);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((acc, val) => acc + Math.pow(val - avgInterval, 2), 0) / intervals.length;
        const consistency = 1 / (1 + variance * 10);

        return { tempo, strength: bass / 255, consistency, isBeat: true };
      }
    } else if (this.history.beats.length === 0 && isBeat) {
      this.history.beats.push({ time: timeRef, strength: bass / 255 });
    }

    return { tempo: 120, strength: bass / 255, consistency: 0.5, isBeat: false };
  }

  analyzeMelody(dataArray, bufferLength) {
    // Spectral centroid for pitch tracking
    let weightedSum = 0, totalWeight = 0;
    dataArray.forEach((value, index) => {
      weightedSum += value * index;
      totalWeight += value;
    });
    const centroid = totalWeight > 0 ? weightedSum / totalWeight / bufferLength : 0.5;

    // Track pitch changes
    const prevCentroid = this.smoothed.melody.direction;
    const direction = centroid > prevCentroid ? 1 : centroid < prevCentroid ? -1 : 0;

    // Melodic range (spread of frequencies)
    const activeFreqs = dataArray.map((val, i) => val > 10 ? i : -1).filter(i => i >= 0);
    const range = activeFreqs.length > 0
      ? (Math.max(...activeFreqs) - Math.min(...activeFreqs)) / bufferLength
      : 0;

    // Smoothness (how gradually pitch changes)
    this.history.pitchChanges.push(centroid);
    if (this.history.pitchChanges.length > 32) this.history.pitchChanges.shift();

    const changes = this.history.pitchChanges.slice(1).map((val, i) =>
      Math.abs(val - this.history.pitchChanges[i])
    );
    const smoothness = changes.length > 0
      ? 1 - (changes.reduce((a, b) => a + b, 0) / changes.length)
      : 0.5;

    return { direction, centroid, range, smoothness };
  }

  analyzeHarmony(dataArray, bufferLength) {
    // Spectral complexity (how many frequencies are active)
    const activeFreqs = dataArray.filter(v => v > 15).length;
    const richness = activeFreqs / bufferLength;

    // Frequency distribution variance
    const bins = 8;
    const binSize = Math.floor(bufferLength / bins);
    const binEnergies = [];

    for (let i = 0; i < bins; i++) {
      const start = i * binSize;
      const end = start + binSize;
      binEnergies.push(dataArray.slice(start, end).reduce((a, b) => a + b, 0) / binSize);
    }

    const avgBinEnergy = binEnergies.reduce((a, b) => a + b, 0) / bins;
    const binVariance = binEnergies.reduce((acc, val) =>
      acc + Math.abs(val - avgBinEnergy), 0
    ) / bins;

    const complexity = Math.min(1, binVariance / 100);
    const consonance = 1 - complexity; // Inverse relationship

    // Harmonic tension (high variance = tension, low = consonance)
    const tension = complexity;

    return { complexity, richness, consonance, tension };
  }

  analyzeTexture(dataArray, bufferLength) {
    // Density: how full the frequency spectrum is
    const activeFreqs = dataArray.filter(v => v > 10).length;
    const density = activeFreqs / bufferLength;

    // Layering: presence across different frequency bands
    const bassRange = Math.floor(bufferLength * 0.08);
    const midRange = Math.floor(bufferLength * 0.5);
    const highMidRange = Math.floor(bufferLength * 0.7);

    const bassPresence = dataArray.slice(0, bassRange).reduce((a, b) => a + b, 0) / bassRange > 50 ? 1 : 0;
    const midPresence = dataArray.slice(bassRange, midRange).reduce((a, b) => a + b, 0) / (midRange - bassRange) > 50 ? 1 : 0;
    const highPresence = dataArray.slice(highMidRange).reduce((a, b) => a + b, 0) / (bufferLength - highMidRange) > 50 ? 1 : 0;

    const layering = (bassPresence + midPresence + highPresence) / 3;
    const clarity = 1 - density; // Less density = more clarity
    const thickness = density * layering; // Both density and layering

    return { density, layering, clarity, thickness };
  }

  analyzeTimbre(dataArray, bufferLength) {
    const bassRange = Math.floor(bufferLength * 0.08);
    const highMidRange = Math.floor(bufferLength * 0.7);

    const bass = dataArray.slice(0, bassRange).reduce((a, b) => a + b, 0) / bassRange;
    const high = dataArray.slice(highMidRange).reduce((a, b) => a + b, 0) / (bufferLength - highMidRange);

    // Brightness: ratio of high to low frequencies
    const brightness = high / (bass + high + 1);

    // Warmth: inverse of brightness
    const warmth = 1 - brightness;

    // Roughness: high-frequency variation
    const highFreqVariance = dataArray.slice(highMidRange).reduce((acc, val, i, arr) => {
      if (i === 0) return 0;
      return acc + Math.abs(val - arr[i-1]);
    }, 0) / (bufferLength - highMidRange);
    const roughness = Math.min(1, highFreqVariance / 50);

    // Attack: how quickly energy rises (compare first 10% to average)
    const attackRange = Math.floor(bufferLength * 0.1);
    const attackEnergy = dataArray.slice(0, attackRange).reduce((a, b) => a + b, 0) / attackRange;
    const avgEnergy = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
    const attack = attackEnergy > avgEnergy ? 1 : attackEnergy / (avgEnergy + 1);

    return { brightness, warmth, roughness, attack };
  }

  analyzeDynamics(dataArray, bufferLength) {
    const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
    const peak = Math.max(...dataArray);
    const range = (peak - avg) / 255;

    // RMS for true loudness
    const rms = Math.sqrt(dataArray.reduce((acc, val) => acc + val * val, 0) / bufferLength);

    // Envelope: rate of change in volume
    this.history.energyLevels.push(avg);
    if (this.history.energyLevels.length > 10) this.history.energyLevels.shift();

    const envelope = this.history.energyLevels.length > 1
      ? Math.abs(this.history.energyLevels[this.history.energyLevels.length - 1] -
                 this.history.energyLevels[0]) / 255
      : 0;

    return {
      current: avg / 255,
      range,
      peak: peak / 255,
      rms: rms / 255,
      envelope
    };
  }

  analyzeForm(dataArray, timeRef) {
    const energy = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;

    // Section detection based on energy changes
    const prevEnergy = this.smoothed.form.energy;
    const energyChange = Math.abs(energy - prevEnergy);
    const transition = energyChange > 0.15; // Sudden change = section transition

    // Development: how much has changed over time
    const development = this.history.energyLevels.length > 5
      ? Math.abs(this.history.energyLevels[this.history.energyLevels.length - 1] -
                 this.history.energyLevels[0]) / 255
      : 0;

    return { energy, transition, development, section: 0 };
  }

  analyzePitch(dataArray, bufferLength) {
    // Fundamental frequency detection
    let weightedSum = 0, totalWeight = 0;
    dataArray.forEach((value, index) => {
      weightedSum += value * index;
      totalWeight += value;
    });
    const fundamental = totalWeight > 0 ? weightedSum / totalWeight / bufferLength : 0.5;

    // Pitch clarity: how focused the energy is
    const peakEnergy = Math.max(...dataArray);
    const avgEnergy = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
    const clarity = peakEnergy / (avgEnergy * bufferLength);

    // Pitch stability: how much it varies
    const prevPitch = this.smoothed.pitch.fundamental;
    const movement = Math.abs(fundamental - prevPitch);
    const stability = 1 - Math.min(1, movement * 10);

    return { fundamental, clarity, stability, movement };
  }

  smoothAnalysis(analysis) {
    const smooth = (prev, next, speed = 0.15) => prev + (next - prev) * speed;

    Object.keys(analysis).forEach(category => {
      Object.keys(analysis[category]).forEach(property => {
        this.smoothed[category][property] = smooth(
          this.smoothed[category][property],
          analysis[category][property]
        );
      });
    });
  }
}

// Export singleton instance
export const musicAnalyzer = new MusicAnalyzer();
