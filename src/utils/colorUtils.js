// Color utility functions for dynamic palette generation
/*
export const generateUniquePalette = (audioSignature) => {
  const { bassAvg, midAvg, highAvg, spectralCentroid, harmonicRichness } = audioSignature;

  // Create unique seed from audio characteristics
  const seed = bassAvg * 0.5 + midAvg * 0.3 + highAvg * 0.2;

  // Base hue influenced by spectral centroid (brightness)
  const baseHue = (spectralCentroid * 360 + seed * 180) % 360;

  // Determine color scheme based on harmonic richness
  const scheme = Math.floor((seed + harmonicRichness) * 6) % 6;

  const palettes = {
    // Complementary - high contrast
    0: [
      baseHue,
      (baseHue + 180) % 360
    ],
    // Triadic - balanced
    1: [
      baseHue,
      (baseHue + 120) % 360,
      (baseHue + 240) % 360
    ],
    // Analogous - harmonious
    2: [
      baseHue,
      (baseHue + 30) % 360,
      (baseHue - 30 + 360) % 360
    ],
    // Split-complementary
    3: [
      baseHue,
      (baseHue + 150) % 360,
      (baseHue + 210) % 360
    ],
    // Tetradic
    4: [
      baseHue,
      (baseHue + 90) % 360,
      (baseHue + 180) % 360,
      (baseHue + 270) % 360
    ],
    // Monochromatic with variance
    5: [
      baseHue,
      baseHue,
      baseHue
    ]
  };

  return {
    hues: palettes[scheme],
    scheme: scheme,
    baseHue: baseHue,
    warmth: bassAvg > midAvg ? 0.7 : 0.3
  };
};

export const hslToString = (hsl, alpha = 1) => {
  return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${alpha})`;
};

export const bassToDeepColor = (bassIntensity, baseHue) => {
  // Bass creates deep, saturated colors
  const hueShift = bassIntensity * 30;
  const hue = (baseHue - hueShift + 360) % 360;
  const saturation = 70 + bassIntensity * 25;
  const lightness = Math.max(20, 45 - bassIntensity * 25);
  return { h: hue, s: saturation, l: lightness };
};

export const trebleToLightColor = (trebleIntensity, baseHue) => {
  // Treble creates light, airy colors
  const hueShift = trebleIntensity * 40;
  const hue = (baseHue + hueShift) % 360;
  const saturation = Math.max(30, 60 - trebleIntensity * 20);
  const lightness = 60 + trebleIntensity * 25;
  return { h: hue, s: saturation, l: lightness };
};
*/


// Spectral Color Palette System - Inspired by visible spectrum and UV/IR ranges

// Spectral palette definitions based on light frequencies



// Spectral Color Palette System - Inspired by visible spectrum and UV/IR ranges

// Spectral palette definitions based on light frequencies


// Spectral Color Palette System - Inspired by visible spectrum and UV/IR ranges

// Spectral palette definitions based on light frequencies
// Enhanced Spectral Color Palette System with Transition Palettes

// Main vibrant palettes
const SPECTRAL_PALETTES = {
  electric_storm: {
    name: 'Electric Storm',
    colors: [
      { h: 280, s: 100, l: 65 }, // Vivid purple
      { h: 260, s: 95, l: 70 },  // Electric violet
      { h: 200, s: 100, l: 60 }, // Bright cyan
      { h: 180, s: 100, l: 65 }, // Electric turquoise
      { h: 290, s: 95, l: 68 }   // Neon magenta
    ],
    characteristics: 'electric, vivid, high-energy'
  },

  volcanic_fire: {
    name: 'Volcanic Fire',
    colors: [
      { h: 0, s: 100, l: 60 },   // Intense red
      { h: 15, s: 100, l: 65 },  // Bright red-orange
      { h: 30, s: 100, l: 60 },  // Vivid orange
      { h: 45, s: 100, l: 65 },  // Golden fire
      { h: 350, s: 95, l: 60 }   // Hot pink-red
    ],
    characteristics: 'intense, warm, powerful'
  },

  cosmic_ocean: {
    name: 'Cosmic Ocean',
    colors: [
      { h: 190, s: 100, l: 55 }, // Deep cyan
      { h: 210, s: 95, l: 60 },  // Ocean blue
      { h: 230, s: 100, l: 65 }, // Vivid blue
      { h: 250, s: 90, l: 70 },  // Light electric blue
      { h: 200, s: 95, l: 58 }   // Bright aqua
    ],
    characteristics: 'deep, flowing, immersive'
  },

  neon_jungle: {
    name: 'Neon Jungle',
    colors: [
      { h: 120, s: 100, l: 55 }, // Vivid green
      { h: 140, s: 95, l: 60 },  // Bright lime
      { h: 160, s: 90, l: 65 },  // Neon teal
      { h: 100, s: 100, l: 60 }, // Electric yellow-green
      { h: 180, s: 95, l: 60 }   // Bright cyan-green
    ],
    characteristics: 'vibrant, natural-electric, alive'
  },

  supernova_burst: {
    name: 'Supernova Burst',
    colors: [
      { h: 50, s: 100, l: 65 },  // Bright yellow
      { h: 40, s: 100, l: 60 },  // Golden orange
      { h: 20, s: 100, l: 65 },  // Vivid orange
      { h: 60, s: 95, l: 70 },   // Light gold
      { h: 30, s: 100, l: 62 }   // Amber glow
    ],
    characteristics: 'explosive, radiant, brilliant'
  },

  crystal_prism: {
    name: 'Crystal Prism',
    colors: [
      { h: 310, s: 100, l: 65 }, // Vivid magenta
      { h: 330, s: 95, l: 70 },  // Hot pink
      { h: 280, s: 100, l: 65 }, // Bright purple
      { h: 200, s: 100, l: 65 }, // Cyan flash
      { h: 350, s: 100, l: 68 }  // Pink-red
    ],
    characteristics: 'prismatic, crystalline, multifaceted'
  },

  aurora_borealis: {
    name: 'Aurora Borealis',
    colors: [
      { h: 150, s: 95, l: 60 },  // Aurora green
      { h: 170, s: 100, l: 65 }, // Electric teal
      { h: 270, s: 90, l: 65 },  // Purple aurora
      { h: 320, s: 95, l: 60 },  // Magenta glow
      { h: 190, s: 85, l: 68 }   // Sky blue
    ],
    characteristics: 'ethereal, natural, otherworldly'
  },

  plasma_core: {
    name: 'Plasma Core',
    colors: [
      { h: 300, s: 100, l: 60 }, // Deep magenta
      { h: 280, s: 100, l: 65 }, // Vivid purple
      { h: 260, s: 95, l: 70 },  // Electric violet
      { h: 240, s: 100, l: 65 }, // Bright blue-purple
      { h: 320, s: 95, l: 62 }   // Hot magenta
    ],
    characteristics: 'energetic, core-like, pulsing'
  }
};

// Transition palettes - smoother, gradient-like for seamless transitions
const TRANSITION_PALETTES = {
  sunset_fade: {
    name: 'Sunset Fade',
    colors: [
      { h: 30, s: 85, l: 65 },   // Warm orange
      { h: 20, s: 80, l: 68 },   // Soft red-orange
      { h: 350, s: 75, l: 70 },  // Pink-red
      { h: 340, s: 80, l: 68 },  // Rose
      { h: 10, s: 85, l: 65 }    // Peachy orange
    ],
    characteristics: 'warm, transitional, flowing'
  },

  ocean_drift: {
    name: 'Ocean Drift',
    colors: [
      { h: 200, s: 75, l: 65 },  // Soft cyan
      { h: 210, s: 70, l: 68 },  // Light blue
      { h: 220, s: 75, l: 70 },  // Sky blue
      { h: 190, s: 70, l: 65 },  // Aqua
      { h: 205, s: 75, l: 67 }   // Medium cyan
    ],
    characteristics: 'cool, flowing, serene'
  },

  forest_mist: {
    name: 'Forest Mist',
    colors: [
      { h: 140, s: 70, l: 65 },  // Soft green
      { h: 150, s: 75, l: 68 },  // Muted teal
      { h: 160, s: 70, l: 70 },  // Light cyan-green
      { h: 130, s: 75, l: 65 },  // Yellow-green
      { h: 145, s: 72, l: 67 }   // Forest green
    ],
    characteristics: 'natural, misty, peaceful'
  },

  twilight_glow: {
    name: 'Twilight Glow',
    colors: [
      { h: 270, s: 75, l: 68 },  // Soft purple
      { h: 280, s: 70, l: 70 },  // Light violet
      { h: 260, s: 75, l: 68 },  // Medium purple
      { h: 290, s: 70, l: 70 },  // Lavender
      { h: 275, s: 73, l: 69 }   // Twilight purple
    ],
    characteristics: 'mysterious, transitional, soft'
  }
};

// Combine all palettes
const ALL_PALETTES = { ...SPECTRAL_PALETTES, ...TRANSITION_PALETTES };

// Time-of-day detection and influence
export const getTimeOfDay = () => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 8) {
    return 'dawn'; // 5-8 AM: Soft awakening
  } else if (hour >= 8 && hour < 12) {
    return 'morning'; // 8-12 PM: Bright, hopeful
  } else if (hour >= 12 && hour < 17) {
    return 'noon'; // 12-5 PM: High energy, clarity
  } else if (hour >= 17 && hour < 20) {
    return 'dusk'; // 5-8 PM: Deep purples, reflection
  } else if (hour >= 20 && hour < 23) {
    return 'night'; // 8-11 PM: Dark void, sharp pulses
  } else {
    return 'midnight'; // 11 PM-5 AM: Deepest, most mysterious
  }
};

// Apply time-of-day color shifts to a color
export const applyTimeShift = (color, timeOfDay) => {
  let { h, s, l } = color;
  
  switch (timeOfDay) {
    case 'dawn':
      // Soft, misty pastels - hope, awakening
      s = Math.max(40, s * 0.7); // Reduce saturation
      l = Math.min(75, l + 10); // Increase lightness
      h = (h + 15) % 360; // Slight warm shift
      break;
      
    case 'morning':
      // Bright, airy, optimistic
      s = Math.min(100, s * 1.1); // Slight saturation boost
      l = Math.min(80, l + 15); // Increase lightness
      h = (h + 5) % 360; // Subtle warm shift
      break;
      
    case 'noon':
      // High contrast, high frequency color - clarity, energy
      s = Math.min(100, s * 1.2); // Maximum saturation
      l = Math.max(40, Math.min(70, l)); // Balanced lightness
      // No hue shift - pure colors
      break;
      
    case 'dusk':
      // Deep purples, slow fades - reflection, sensuality
      s = Math.min(100, s * 0.9); // Slight saturation reduction
      l = Math.max(30, l - 10); // Decrease lightness
      h = (h - 20 + 360) % 360; // Shift toward purple/blue
      break;
      
    case 'night':
      // Dark void tones with sharp pulses - mystery, immersion
      s = Math.min(100, s * 1.1); // Maintain saturation for vibrancy
      l = Math.max(20, l - 20); // Significant darkness
      h = (h - 30 + 360) % 360; // Shift toward deep blues/purples
      break;
      
    case 'midnight':
      // Deepest, most mysterious
      s = Math.min(100, s * 0.8); // Reduced saturation
      l = Math.max(15, l - 25); // Very dark
      h = (h - 40 + 360) % 360; // Strong shift to deep violets/blues
      break;
  }
  
  return { h, s, l };
};

// Generate palette based on audio characteristics and time of day
export const generateUniquePalette = (audioSignature) => {
  const { bassAvg, midAvg, highAvg, spectralCentroid, harmonicRichness } = audioSignature;
  const timeOfDay = getTimeOfDay();

  let paletteType;
  const totalEnergy = (bassAvg + midAvg + highAvg) / 3;

  // Time-of-day influences palette selection
  const timeInfluence = {
    dawn: { preferTransition: true, preferSoft: true },
    morning: { preferTransition: false, preferSoft: false },
    noon: { preferTransition: false, preferSoft: false },
    dusk: { preferTransition: true, preferSoft: true },
    night: { preferTransition: false, preferSoft: false },
    midnight: { preferTransition: true, preferSoft: true }
  };

  const timePrefs = timeInfluence[timeOfDay];

  // Choose main vibrant palettes for active music
  if (totalEnergy > 0.6) {
    // High energy - use vibrant palettes (but respect time preferences)
    if (timePrefs.preferSoft && timeOfDay === 'dawn') {
      paletteType = 'aurora_borealis'; // Softer for dawn
    } else if (spectralCentroid > 0.7 && highAvg > 0.6) {
      paletteType = 'electric_storm';
    } else if (bassAvg > 0.7) {
      paletteType = 'volcanic_fire';
    } else if (harmonicRichness > 0.7) {
      paletteType = 'crystal_prism';
    } else if (midAvg > 0.6) {
      paletteType = 'neon_jungle';
    } else {
      paletteType = Math.random() < 0.5 ? 'supernova_burst' : 'plasma_core';
    }
  } else if (totalEnergy > 0.3) {
    // Medium energy - mix of vibrant and transition
    if (timePrefs.preferTransition) {
      // Time prefers transition palettes
      if (timeOfDay === 'dusk') {
        paletteType = 'sunset_fade';
      } else if (timeOfDay === 'dawn') {
        paletteType = 'ocean_drift';
      } else {
        paletteType = Math.random() < 0.5 ? 'aurora_borealis' : 'twilight_glow';
      }
    } else if (spectralCentroid > 0.6) {
      paletteType = 'cosmic_ocean';
    } else if (bassAvg > midAvg) {
      paletteType = 'sunset_fade';
    } else {
      paletteType = Math.random() < 0.5 ? 'aurora_borealis' : 'twilight_glow';
    }
  } else {
    // Low energy - use transition palettes (time-appropriate)
    if (timeOfDay === 'dawn') {
      paletteType = 'ocean_drift'; // Soft, awakening
    } else if (timeOfDay === 'dusk') {
      paletteType = 'sunset_fade'; // Warm, reflective
    } else if (timeOfDay === 'midnight') {
      paletteType = 'twilight_glow'; // Mysterious
    } else {
      const transitionTypes = ['sunset_fade', 'ocean_drift', 'forest_mist', 'twilight_glow'];
      paletteType = transitionTypes[Math.floor(Math.random() * transitionTypes.length)];
    }
  }

  const selectedPalette = ALL_PALETTES[paletteType];
  
  // Apply time-of-day shifts to all colors in the palette
  const timeShiftedColors = selectedPalette.colors.map(color => 
    applyTimeShift(color, timeOfDay)
  );
  
  const baseHue = timeShiftedColors[0].h;

  return {
    hues: timeShiftedColors.map(c => c.h),
    colors: timeShiftedColors,
    name: selectedPalette.name,
    type: paletteType,
    baseHue: baseHue,
    warmth: bassAvg > highAvg ? 0.7 : 0.3,
    isTransition: TRANSITION_PALETTES.hasOwnProperty(paletteType),
    timeOfDay: timeOfDay
  };
};

// Interpolate between two palettes for smooth transitions
export const interpolatePalettes = (palette1, palette2, t) => {
  if (!palette1 || !palette2) return palette1 || palette2;

  const interpolatedColors = palette1.colors.map((color1, index) => {
    const color2 = palette2.colors[index] || palette2.colors[0];

    // Handle hue interpolation (shortest path around color wheel)
    let h1 = color1.h;
    let h2 = color2.h;
    let hDiff = h2 - h1;

    if (Math.abs(hDiff) > 180) {
      if (hDiff > 0) h1 += 360;
      else h2 += 360;
    }

    return {
      h: (h1 + (h2 - h1) * t) % 360,
      s: color1.s + (color2.s - color1.s) * t,
      l: color1.l + (color2.l - color1.l) * t
    };
  });

  return {
    colors: interpolatedColors,
    hues: interpolatedColors.map(c => c.h),
    baseHue: interpolatedColors[0].h,
    name: t < 0.5 ? palette1.name : palette2.name,
    type: t < 0.5 ? palette1.type : palette2.type,
    warmth: palette1.warmth + (palette2.warmth - palette1.warmth) * t,
    isTransition: true,
    timeOfDay: t < 0.5 ? (palette1.timeOfDay || getTimeOfDay()) : (palette2.timeOfDay || getTimeOfDay())
  };
};

// Get color from palette with smooth interpolation
export const getColorFromPalette = (palette, position, energy = 0.5) => {
  if (!palette || !palette.colors || palette.colors.length === 0) {
    return { h: 200, s: 70, l: 60 };
  }

  const colors = palette.colors;
  position = Math.max(0, Math.min(1, position));

  const index = position * (colors.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.min(Math.ceil(index), colors.length - 1);
  const t = index - lowerIndex;

  const lowerColor = colors[lowerIndex];
  const upperColor = colors[upperIndex];

  if (!lowerColor || !upperColor) {
    return { h: 200, s: 70, l: 60 };
  }

  const h = lowerColor.h + (upperColor.h - lowerColor.h) * t;
  const s = Math.min(100, (lowerColor.s + (upperColor.s - lowerColor.s) * t) + energy * 15);
  const l = lowerColor.l + (upperColor.l - lowerColor.l) * t + energy * 10;

  if (isNaN(h) || isNaN(s) || isNaN(l)) {
    return { h: 200, s: 70, l: 60 };
  }

  return { h, s, l };
};

export const hslToString = (hsl, alpha = 1) => {
  if (!hsl || typeof hsl.h === 'undefined' || typeof hsl.s === 'undefined' || typeof hsl.l === 'undefined') {
    return 'hsla(200, 70%, 60%, 1)';
  }

  const h = isNaN(hsl.h) ? 200 : Math.round(hsl.h);
  const s = isNaN(hsl.s) ? 70 : Math.round(Math.max(0, Math.min(100, hsl.s)));
  const l = isNaN(hsl.l) ? 60 : Math.round(Math.max(0, Math.min(100, hsl.l)));
  const a = isNaN(alpha) ? 1 : Math.max(0, Math.min(1, alpha));

  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
};

export const bassToDeepColor = (bassIntensity, palette) => {
  let color;
  
  if (palette && palette.type === 'volcanic_fire') {
    color = palette.colors[Math.floor(bassIntensity * (palette.colors.length - 1))];
    color = {
      h: color.h,
      s: Math.min(100, color.s + bassIntensity * 15),
      l: Math.max(20, color.l - bassIntensity * 20)
    };
  } else {
    const baseHue = palette ? palette.baseHue : 0;
    const hue = (baseHue - bassIntensity * 30 + 360) % 360;
    const saturation = 75 + bassIntensity * 20;
    const lightness = Math.max(25, 50 - bassIntensity * 25);
    color = { h: hue, s: saturation, l: lightness };
  }
  
  // Apply time-of-day shift if palette has time info
  if (palette && palette.timeOfDay) {
    color = applyTimeShift(color, palette.timeOfDay);
  }
  
  return color;
};

export const trebleToLightColor = (trebleIntensity, palette) => {
  let color;
  
  if (palette && palette.type === 'electric_storm') {
    color = palette.colors[Math.floor(trebleIntensity * (palette.colors.length - 1))];
    color = {
      h: color.h,
      s: Math.max(40, color.s - trebleIntensity * 10),
      l: Math.min(85, color.l + trebleIntensity * 15)
    };
  } else {
    const baseHue = palette ? palette.baseHue : 200;
    const hue = (baseHue + trebleIntensity * 40) % 360;
    const saturation = Math.max(35, 65 - trebleIntensity * 15);
    const lightness = 60 + trebleIntensity * 20;
    color = { h: hue, s: saturation, l: lightness };
  }
  
  // Apply time-of-day shift if palette has time info
  if (palette && palette.timeOfDay) {
    color = applyTimeShift(color, palette.timeOfDay);
  }
  
  return color;
};

export const toLuminous = (color, intensity = 1) => {
  return {
    h: color.h,
    s: Math.min(100, color.s + intensity * 20),
    l: Math.min(85, color.l + intensity * 15)
  };
};

export const toRadiantGlow = (color, energy = 0.5) => {
  return {
    h: color.h,
    s: Math.min(100, color.s + 30),
    l: Math.min(90, color.l + 25 + energy * 15)
  };
};
