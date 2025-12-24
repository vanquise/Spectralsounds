// Simplex-like noise functions for organic motion

class NoiseGenerator {
  constructor(seed = Date.now()) {
    this.seed = seed;
    this.permutation = this.generatePermutation();
  }

  generatePermutation() {
    const p = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }

    // Shuffle based on seed
    let seed = this.seed;
    for (let i = 255; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      const j = Math.floor((seed / 2147483647) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }

    return [...p, ...p];
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(a, b, t) {
    return a + t * (b - a);
  }

  grad(hash, x, y) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const a = this.permutation[X] + Y;
    const aa = this.permutation[a];
    const ab = this.permutation[a + 1];
    const b = this.permutation[X + 1] + Y;
    const ba = this.permutation[b];
    const bb = this.permutation[b + 1];

    return this.lerp(
      this.lerp(
        this.grad(this.permutation[aa], x, y),
        this.grad(this.permutation[ba], x - 1, y),
        u
      ),
      this.lerp(
        this.grad(this.permutation[ab], x, y - 1),
        this.grad(this.permutation[bb], x - 1, y - 1),
        u
      ),
      v
    );
  }

  fractalNoise2D(x, y, octaves = 4, persistence = 0.5) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return total / maxValue;
  }
}

// Create a singleton instance
let noiseInstance = null;

export const initNoise = (seed) => {
  noiseInstance = new NoiseGenerator(seed);
};

export const noise2D = (x, y) => {
  if (!noiseInstance) {
    noiseInstance = new NoiseGenerator();
  }
  return noiseInstance.noise2D(x, y);
};

export const fractalNoise2D = (x, y, octaves, persistence) => {
  if (!noiseInstance) {
    noiseInstance = new NoiseGenerator();
  }
  return noiseInstance.fractalNoise2D(x, y, octaves, persistence);
};
