
/*
import React from 'react';
const LandingPage = ({ onEnter }) => {
  return (
    <div className="rd-landing-wrapper">

      <section className="rd-snap-section">
        <div className="rd-meta">STG 0.1 // ALPHA // BALL_IDLE</div>
        <h1 className="rd-hero-title">SOUND,<br/>MADE VISIBLE.</h1>
        <p className="rd-subtitle">An experimental system translating music into evolving color and motion.</p>
      </section>


      <section className="rd-snap-section">
        <div className="rd-meta">STG 0.2 // RESEARCH // CANVAS_IDLE</div>
        <h2 className="rd-display-text">Built as an exploration of perception and digital atmosphere.</h2>
      </section>


      <section className="rd-snap-section">
        <div className="rd-meta">STG 0.3 // ACCESS // AURORA_IDLE</div>
        <h2 className="rd-display-text">Not built for consumption.<br/>Built for exploration.</h2>
        <button className="rd-enter-cta" onClick={onEnter}>
          ENTER THE EXPERIMENT
        </button>
      </section>
    </div>
  );
};

export default LandingPage;
*/











import React, { useState, useEffect, useRef } from "react";

export default function LandingPage({ onLaunch }) {
  const canvasRef = useRef(null);

  // 1. ADDED: State to manage the "Exit" animation
  const [isExiting, setIsExiting] = useState(false);

  // 2. LUXURY TRANSITION FUNCTION
  const handleStartExperience = () => {
    setIsExiting(true); // Triggers the fade out in the styles below
    setTimeout(() => {
      if (onLaunch) onLaunch();
    }, 1200); // 1.2 seconds of "cinema" fade before switching
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let dpr = window.devicePixelRatio || 1;
    let width, height, cx, cy;
    let t = 0;
    let animationFrameId;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = width / 2;
      cy = height / 2;
    };

    resize();
    window.addEventListener("resize", resize);

    function drawAuroraIdle() {
      ctx.clearRect(0, 0, width, height);

      // --- ADJUST AURORA LOOK HERE ---

      // OPACITY: Set this to 0.1 or 0.2 for that "10-20%" ghostly look
      ctx.globalAlpha = 0.60;

      // BLUR: Higher px = more "bluffy"/unfocused/luxury feel
      ctx.filter = "blur(10px)";

      // -------------------------------

      // Background
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height));
      bg.addColorStop(0, "#0b1020");
      bg.addColorStop(1, "#05070c");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const layers = 5;
      for (let i = 0; i < layers; i++) {
        const phase = t * 0.0004 + i * 10;
        const radius = Math.min(width, height) * (0.18 + i * 0.06);
        const grad = ctx.createRadialGradient(
          cx + Math.sin(phase) * 40,
          cy + Math.cos(phase * 0.7) * 40,
          radius * 0.3, cx, cy, radius
        );
        grad.addColorStop(0, `rgba(100, 160, 255, 0.5)`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Reset filters so they don't stack weirdly
      ctx.filter = "none";
      ctx.globalAlpha = 1.0;

      t += 16;
      animationFrameId = requestAnimationFrame(drawAuroraIdle);
    }

    drawAuroraIdle();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // 3. DYNAMIC STYLE: This handles the smooth fade-out of the text
  const transitionStyle = {
    ...styles.content,
    opacity: isExiting ? 0 : 1,
    transform: isExiting ? 'translateY(-20px)' : 'translateY(0)',
    transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1), transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
  };

/*
  return (
    <div style={styles.page}>
      <canvas ref={canvasRef} style={styles.canvas} />

      <main style={transitionStyle}>
        <section style={styles.hero}>
          <h1 style={styles.title}>Spectral Sounds</h1>
          <p style={styles.label}>An internal experiment by [Studio Name]</p>

          <p style={styles.subtitle}>
            Sound, rendered as atmosphere.<br /><br />
            Color, driven by structure.
          </p>

          <p style={styles.system}>A living audiovisual system.</p>

          <button
            style={styles.ctaButton}
            onClick={handleStartExperience}
          >
            → Enter the prototype
          </button>

          <span style={styles.note}>(early web version)</span>
        </section>

        <section style={styles.section}>
          <p style={styles.sectionLabel}>The Experiment</p>
          <p style={styles.text}>
            Spectral Sounds studies how music shapes space, mood, and attention.<br /><br />
            The system listens. The form responds.<br /><br />
            <span style={{color: '#fff'}}>Nothing is fixed.</span>
          </p>
        </section>

        <section style={styles.section}>
          <p style={styles.sectionLabel}>Experience</p>
          <p style={styles.text}>
            Load one of the reference tracks or bring your own sound.
          </p>
          <button style={styles.ctaButton} onClick={handleStartExperience}>→ Launch</button>
        </section>

        <footer style={styles.footer}>
          <span>[Studio Name]</span>
        </footer>
      </main>
    </div>
  );
}
*/

return (
    <div style={styles.page}>
      <canvas ref={canvasRef} style={styles.canvas} />

      <main style={transitionStyle}>
        <section style={styles.hero}>
          <p style={styles.label}>An internal experiment by [Studio Name]</p>
          <h1 style={styles.title}>Spectral Sounds</h1>

          <div style={styles.descriptionWrapper}>
            <p style={styles.subtitle}>
              Sound, rendered as atmosphere. Color, driven by structure.
            </p>
            <p style={styles.system}>A living audiovisual system.</p>
          </div>

          <div style={styles.ctaWrapper}>
            <button
              style={styles.ctaButton}
              onClick={handleStartExperience}
            >
              → Enter the prototype
            </button>
            <span style={styles.note}>(early web version)</span>
          </div>
        </section>

        <footer style={styles.footer}>
          <span>[Studio Name] © 2025</span>
        </footer>
      </main>
    </div>
  );




/*
const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    background: "#05070c",
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter, sans-serif",
    overflowX: "hidden",
  },
  canvas: {
    position: "fixed",
    inset: 0,
    zIndex: 0,
  },
  content: {
    position: "relative",
    zIndex: 1,
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "12vh 8vw 8vh",
    pointerEvents: "none",
  },
  hero: {
    marginBottom: "20vh",
    pointerEvents: "auto",
  },
  section: {
    marginBottom: "18vh",
    pointerEvents: "auto",
  },
  title: {
    fontSize: "clamp(3.5rem, 9vw, 7rem)",
    fontWeight: 300,
    lineHeight: 1,
    marginBottom: "1rem",
    color: "#fff",
    letterSpacing: "-0.02em",
  },
  label: {
    fontSize: "0.75rem",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.45)",
    marginBottom: "2rem",
  },
  subtitle: {
    fontSize: "1.25rem",
    lineHeight: 1.5,
    marginBottom: "2rem",
  },
  system: {
    fontSize: "0.9rem",
    color: "rgba(255,255,255,0.5)",
    marginBottom: "3rem",
  },
  ctaButton: {
    background: "none",
    border: "none",
    color: "#fff",
    borderBottom: "1px solid rgba(255,255,255,0.3)",
    paddingBottom: "4px",
    cursor: "pointer",
    fontSize: "1rem",
    fontFamily: "inherit",
    pointerEvents: "auto",
    transition: "opacity 0.3s ease",
  },
  note: {
    display: "block",
    marginTop: "0.8rem",
    fontSize: "0.7rem",
    color: "rgba(255,255,255,0.35)",
  },
  sectionLabel: {
    fontSize: "0.7rem",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    marginBottom: "2.5rem",
  },
  text: {
    fontSize: "1.2rem",
    lineHeight: 1.8,
    maxWidth: "600px",
  },
  footer: {
    marginTop: "10vh",
    fontSize: "0.75rem",
    color: "rgba(255,255,255,0.25)",
  },
};
*/

const styles = {
  page: {
    position: "relative",
    height: "100vh",
    height: "100dvh", /* Essential for iPhone Safari */
    background: "#05070c",
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter, sans-serif",
    overflow: "hidden", /* Disables scrolling */
  },
  canvas: {
    position: "fixed",
    inset: 0,
    zIndex: 0,
  },
  content: {
    position: "relative",
    zIndex: 1,
    height: "100%",
    width: "100%",
    maxWidth: "1200px",
    margin: "7 auto",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center", /* Centers everything vertically */
    alignItems: "center",
    padding: "0 2rem",
    boxSizing: "border-box",
    textAlign: "center",
    pointerEvents: "none",
  },
  hero: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    pointerEvents: "auto",
  },
  title: {
    /* clamp(min, preferred, max) - scales with screen height */
    fontSize: "clamp(2.2rem, 10vh, 5.5rem)",
    fontWeight: 300,
    lineHeight: 1.1,
    margin: "0 0 1.5vh 0",
    color: "#fff",
    letterSpacing: "-0.02em",
  },
  label: {
    fontSize: "0.65rem",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.45)",
    margin: "0 0 1vh 0",
  },
  descriptionWrapper: {
    maxWidth: "500px",
    margin: "0 0 4vh 0",
  },
  subtitle: {
    fontSize: "clamp(0.9rem, 2vh, 1.2rem)",
    lineHeight: 1.5,
    margin: "0 0 1vh 0",
  },
  system: {
    fontSize: "0.8rem",
    color: "rgba(255,255,255,0.4)",
  },
  ctaWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
  },
  ctaButton: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "100px", /* Luxury pill shape */
    color: "#fff",
    padding: "1rem 2rem",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontFamily: "inherit",
    pointerEvents: "auto",
    transition: "all 0.3s ease",
    backdropFilter: "blur(10px)",
  },
  note: {
    fontSize: "0.6rem",
    color: "rgba(255,255,255,0.3)",
  },
  footer: {
    position: "absolute",
    bottom: "3vh",
    fontSize: "0.7rem",
    letterSpacing: "0.1em",
    color: "rgba(255,255,255,0.2)",
  },
};
