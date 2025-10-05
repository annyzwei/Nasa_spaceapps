// src/components/TeamTitle.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  motion,
  useReducedMotion,
  type Variants,
  type Transition
} from "framer-motion";

type Props = {
  teamName?: string;
  tagline?: string;
  exclamations?: number;
  accent?: string;
};

export default function TeamTitle({
  teamName = "SPIKE",
  tagline = "NASA Space Apps — Team Showcase",
  exclamations = 2,
  accent = "#d9dee3"
}: Props) {
  const reduce = useReducedMotion();
  const chars = useMemo(() => Array.from(teamName), [teamName]);

  // Starfield canvas + mouse parallax
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0, y: 0 });

  // === Twinkling starfield with DPR + parallax ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let frame: number;
    const stars: { x: number; y: number; r: number; tw: number }[] = [];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      (canvas.width = window.innerWidth * dpr);
      (canvas.height = 280 * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `280px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      stars.splice(
        0,
        stars.length,
        ...Array.from({ length: 160 }, () => ({
          x: Math.random() * window.innerWidth,
          y: Math.random() * 280,
          r: Math.random() * 1.4 + 0.5,
          tw: Math.random() * 2 * Math.PI
        }))
      );
    };
    resize();

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff";
      for (const s of stars) {
        const twinkle = 0.4 + 0.6 * Math.sin(time * 0.003 + s.tw);
        ctx.globalAlpha = twinkle;
        const px = s.x + (mouse.current.x - window.innerWidth / 2) * 0.02;
        const py = s.y + (mouse.current.y - 140) * 0.02;
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, 2 * Math.PI);
        ctx.fill();
      }
      frame = requestAnimationFrame(draw);
    };
    draw(performance.now());

    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // === Framer Motion constants ===
  const SPRING_LETTER: Transition = { type: "spring", stiffness: 420, damping: 28 };
  const EASE_IO: NonNullable<Transition["ease"]> = [0.42, 0, 0.58, 1];
  const container: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.055 } }
  };
  const charVar: Variants = {
    hidden: { y: "0.6em", opacity: 0 },
    visible: { y: "0em", opacity: 1, transition: SPRING_LETTER }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE_IO }}
      viewport={{ once: true, amount: 0.6 }}
      style={{
        position: "relative",
        display: "grid",
        placeItems: "center",
        padding: "3.75rem 1rem 2.5rem",
        background: "linear-gradient(180deg, #0e0f10 0%, #000 100%)",
        overflow: "hidden"
      }}
      aria-label={`${teamName} header`}
    >
      {/* 🌠 Twinkling Stars */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          opacity: 0.4,
          background: "transparent",
          pointerEvents: "none"
        }}
      />

      {/* Subtle radial glow */}
      <motion.div
        aria-hidden
        style={{
          position: "absolute",
          inset: "-10% -10% 0 -10%",
          background:
            "radial-gradient(60% 70% at 50% 18%, rgba(255,255,255,0.08), rgba(0,0,0,0) 60%)",
          pointerEvents: "none",
          zIndex: 1
        }}
        initial={{ opacity: 0.22 }}
        animate={reduce ? { opacity: 0.22 } : { opacity: [0.18, 0.26, 0.18] }}
        transition={{
          type: "tween",
          ease: EASE_IO,
          duration: 6,
          repeat: reduce ? 0 : Infinity
        }}
      />

      {/* SPIKE Title + underline + tagline */}
      <div style={{ textAlign: "center", position: "relative", zIndex: 2 }}>
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={container}
          style={{
            fontSize: "clamp(2.8rem, 8vw, 5.3rem)",
            fontWeight: 900,
            letterSpacing: "0.08em",
            background: "linear-gradient(90deg, #e4e8ec 0%, #f5f5f5 45%, #b6b9bd 100%)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            margin: 0,
            lineHeight: 1.05,
            fontFamily:
              "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
            position: "relative",
            display: "inline-block",
            textRendering: "optimizeLegibility"
          }}
        >
          {/* Shimmer sweep */}
          {!reduce && (
            <motion.span
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(120deg, transparent 25%, rgba(255,255,255,0.18) 50%, transparent 75%)",
                mixBlendMode: "overlay",
                pointerEvents: "none"
              }}
              initial={{ x: "-120%" }}
              animate={{ x: ["-120%", "140%"] }}
              transition={{
                type: "tween",
                duration: 2.6,
                ease: EASE_IO,
                repeat: Infinity,
                delay: 0.4
              }}
            />
          )}

          {/* Letters */}
          {chars.map((c, i) => (
            <motion.span key={`${c}-${i}`} variants={charVar} style={{ display: "inline-block" }}>
              {c}
            </motion.span>
          ))}

          {/* Exclamation marks */}
          <span style={{ display: "inline-block", marginLeft: "0.12em" }}>
            {Array.from({ length: exclamations }).map((_, i) => (
              <motion.span
                key={i}
                initial={{ y: 0, opacity: 0 }}
                animate={reduce ? { opacity: 1 } : { y: [0, -2, 0], opacity: 1 }}
                transition={{
                  type: "tween",
                  duration: 1.8,
                  ease: EASE_IO,
                  repeat: reduce ? 0 : Infinity,
                  delay: 0.5 + i * 0.18
                }}
                style={{
                  display: "inline-block",
                  color: "#e3e6ea",
                  marginLeft: i === 0 ? 0 : "0.02em"
                }}
              >
                !
              </motion.span>
            ))}
          </span>
        </motion.h1>

        {/* Underline with moving glint */}
        <div
          style={{
            position: "relative",
            width: "min(520px, 60vw)",
            margin: "0.95rem auto 0",
            height: 8
          }}
        >
          <motion.div
            initial={{ scaleX: 0, opacity: 0.85 }}
            animate={{ scaleX: 1, opacity: 0.95 }}
            transition={{ type: "tween", duration: 0.8, ease: EASE_IO, delay: 0.35 }}
            style={{
              transformOrigin: "50% 50%",
              height: 2,
              borderRadius: 1,
              background: `linear-gradient(90deg, transparent 0%, ${accent} 25%, ${accent} 75%, transparent 100%)`
            }}
          />
          {!reduce && (
            <motion.div
              aria-hidden
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: 2,
                width: "100%",
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.95), rgba(255,255,255,0))",
                backgroundRepeat: "no-repeat",
                backgroundSize: "40px 100%",
                filter: "blur(0.4px)",
                pointerEvents: "none"
              }}
              initial={{ backgroundPositionX: "-40px" }}
              animate={{ backgroundPositionX: ["-40px", "calc(100% + 40px)"] }}
              transition={{
                type: "tween",
                duration: 2.6,
                ease: EASE_IO,
                repeat: Infinity,
                delay: 0.6
              }}
            />
          )}
        </div>

        {/* Tagline pulse */}
        {tagline && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: [0.8, 0.95, 0.8], y: 0 }}
            transition={{
              type: "tween",
              ease: EASE_IO,
              duration: 3.5,
              repeat: Infinity
            }}
            style={{
              marginTop: "0.8rem",
              color: "#a9adb3",
              fontSize: "clamp(0.95rem, 1.7vw, 1.06rem)",
              fontWeight: 500,
              letterSpacing: "0.02em"
            }}
          >
            {tagline}
          </motion.p>
        )}
      </div>
    </motion.header>
  );
}
