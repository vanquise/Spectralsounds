
/*
import { useEffect, useRef } from "react";

export default function AuroraIdleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    let t = 0;

    const animate = () => {
      t += 0.002;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      const r = Math.min(canvas.width, canvas.height) * 0.35;

      const grad = ctx.createRadialGradient(
        cx, cy, r * 0.2,
        cx, cy, r
      );

      grad.addColorStop(0, "rgba(60,80,140,0.18)");
      grad.addColorStop(0.6, "rgba(30,40,80,0.12)");
      grad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      requestAnimationFrame(animate);
    };

    animate();

    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
*/

import React, { useEffect, useRef } from "react";

export default function LandingPage({ onLaunch }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let dpr = window.devicePixelRatio || 1;
    let width, height, cx, cy;
    let t = 0;

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

      // Background Deep Slate
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
          radius * 0.3,
          cx,
          cy,
          radius
        );
        grad.addColorStop(0, `rgba(80, 120, 200, ${0.05 - i * 0.006})`);
        grad.addColorStop(0.6, `rgba(60, 90, 160, ${0.03 - i * 0.005})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      t += 16;
      requestAnimationFrame(drawAuroraIdle);
    }

    drawAuroraIdle();
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <div style={styles.page}>
      <canvas ref={canvasRef} style={styles.canvas} />

      <main style={styles.content}>
        {/* HERO SECTION */}
        <section style={styles.hero}>
          <h1 style={styles.title}>Spectral Sounds</h1>
          <p style={styles.label}>An internal experiment by [Studio Name]</p>

          <p style={styles.subtitle}>
            Sound, rendered as atmosphere.<br /><br />
            Color, driven by structure.
          </p>

          <p style={styles.system}>A living audiovisual system.</p>

          <button style={styles.ctaButton} onClick={onLaunch}>
            → try the prototype
          </button>
          <span style={styles.note}>(early web version)</span>
        </section>

        {/* THE EXPERIMENT */}
        <section style={styles.section}>
          <p style={styles.sectionLabel}>The Experiment</p>
          <p style={styles.text}>
            Spectral Sounds studies how music<br /><br />
            shapes space, mood, and attention.<br />
            The system listens.<br /><br />
            The form responds.<br />
            <span style={styles.emphasis}>Nothing is fixed.</span>
          </p>
        </section>

        {/* EXPERIENCE */}
        <section style={styles.section}>
          <p style={styles.sectionLabel}>Experience</p>
          <p style={styles.text}>
            Load one of the reference tracks<br /><br />
            or bring your own sound.<br />
            Let it run.
          </p>
          <button style={styles.ctaButton} onClick={onLaunch}>→ Launch</button>
        </section>

        {/* APPLICATION */}
        <section style={styles.section}>
          <p style={styles.sectionLabel}>Application</p>
          <p style={styles.text}>
            The system extends into<br /><br />
            custom environments, spatial works,<br /><br />
            and brand-specific adaptations.
          </p>
          <button style={styles.ctaButton} onClick={() => window.location.href = "s.donzo29@gmail.com"}>
            → Inquiries
          </button>
        </section>

        <footer style={styles.footer}>
          <span>[Studio Name]</span>
        </footer>
      </main>
    </div>
  );
}

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    background: "#05070c",
    color: "rgba(255,255,255,0.75)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
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
  },
  hero: {
    marginBottom: "20vh",
  },
  label: {
    fontSize: "0.75rem",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.45)",
    marginBottom: "2rem",
  },
  title: {
    fontSize: "clamp(3.5rem, 9vw, 7rem)",
    fontWeight: 300,
    lineHeight: 1,
    marginBottom: "1rem",
    color: "#fff",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: "1.25rem",
    lineHeight: 1.5,
    marginBottom: "2rem",
    fontWeight: "400",
  },
  system: {
    fontSize: "0.9rem",
    letterSpacing: "0.05em",
    color: "rgba(255,255,255,0.5)",
    marginBottom: "3rem",
  },
  ctaButton: {
    display: "inline-block",
    fontSize: "1rem",
    background: "none",
    border: "none",
    color: "#fff",
    borderBottom: "1px solid rgba(255,255,255,0.3)",
    paddingBottom: "4px",
    cursor: "pointer",
    paddingLeft: 0,
    fontFamily: "inherit",
    transition: "border-color 0.3s ease",
  },
  note: {
    display: "block",
    marginTop: "0.8rem",
    fontSize: "0.7rem",
    color: "rgba(255,255,255,0.35)",
  },
  section: {
    marginBottom: "18vh",
  },
  sectionLabel: {
    fontSize: "0.7rem",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.35)",
    marginBottom: "2.5rem",
  },
  text: {
    fontSize: "1.2rem",
    lineHeight: 1.8,
    maxWidth: "600px",
    fontWeight: "300",
  },
  emphasis: {
    color: "#fff",
  },
  footer: {
    marginTop: "10vh",
    fontSize: "0.75rem",
    letterSpacing: "0.15em",
    color: "rgba(255,255,255,0.25)",
    textTransform: "uppercase",
  },
};
