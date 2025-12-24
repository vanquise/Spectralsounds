# Spectral Sounds - Version Guide

This project has two versions:

## 🎨 MVP Website Version (Current Default)
The full website experience with Hero page and transitions.

**Files:**
- `src/App.jsx` - Main MVP app with Hero → Visualizer flow
- `src/main.jsx` - Entry point for MVP version
- `src/components/Hero.jsx` - Landing page with idle visualizer
- `src/components/VisualizerWrapper.jsx` - Full visualizer experience

**To run:** `npm run dev` (default)

---

## 🔬 Simple Standalone Version (For Experimentation)
The original pre-website version - just visualizer + controls, no Hero page.

**Files:**
- `src/SimpleApp.jsx` - Simple standalone app (direct visualizer)
- `src/main-simple.jsx` - Entry point for simple version

**To switch to simple version:**

Simply edit `src/main.jsx` and change:
```jsx
// FROM (MVP version):
import App from './App.jsx';
// ...
<App />

// TO (Simple version):
import SimpleApp from './SimpleApp.jsx';
// ...
<SimpleApp />
```

That's it! Both versions use the same visualizers and utilities.

---

## 📁 Project Structure

```
src/
├── App.jsx                    # MVP website version (Hero + Visualizer)
├── SimpleApp.jsx             # Simple standalone version (experimentation)
├── main.jsx                  # Entry point for MVP
├── main-simple.jsx           # Entry point for simple version
├── components/
│   ├── Hero.jsx              # MVP: Landing page
│   ├── VisualizerWrapper.jsx # MVP: Full experience wrapper
│   ├── FloatingControls.jsx  # Shared: Audio controls
│   └── Footer.jsx            # MVP: Footer
├── visualizers/
│   ├── AudioVisualizer.jsx   # Router (Ball/Canvas)
│   ├── AudioVisualizer-Ball.jsx
│   └── AudioVisualizer-Canvas.jsx
└── utils/
    ├── colorUtils.js         # Color system with time-of-day
    └── noise.js              # Noise generation
```

---

## 🎯 When to Use Which Version

**Use MVP Version when:**
- Showing the full website experience
- Need the Hero landing page
- Want the complete user journey

**Use Simple Version when:**
- Experimenting with visualizer features
- Testing audio analysis
- Quick iteration on visual effects
- No need for landing page

---

## 🔄 Switching Between Versions

The simplest way is to edit `src/main.jsx`:

**For MVP:**
```jsx
import App from './App.jsx';
// ...
<App />
```

**For Simple:**
```jsx
import SimpleApp from './SimpleApp.jsx';
// ...
<SimpleApp />
```

Both versions share the same visualizers and utilities, so all your features work in both!

