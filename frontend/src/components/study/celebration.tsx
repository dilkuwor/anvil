"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A short, soft firework when a task is finished. Sparks rise from where the tap happened,
 * bloom, and drift down while fading. Nothing flashes and the page never goes bright.
 * With reduced motion on, a quiet line of text takes its place.
 */

export type Origin = { x: number; y: number };
export type BurstSize = "small" | "big";

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  colour: string;
  life: number;
  ttl: number;
};

type Engine = {
  fire: (size: BurstSize, origin?: Origin) => void;
  stop: () => void;
};

// The site's own palette: accent orange, teal, a warm gold, and a soft white.
const COLOURS = [
  "#f97316",
  "#fb923c",
  "#0d9488",
  "#2dd4bf",
  "#fbbf24",
  "#f8fafc",
];
const GRAVITY = 0.12;
const DRAG = 0.985;

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

function bloom(origin: Origin, count: number, speed: number): Spark[] {
  const sparks: Spark[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const velocity = speed * (0.55 + Math.random() * 0.45);
    sparks.push({
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity - speed * 0.35,
      size: 2 + Math.random() * 2.5,
      colour: COLOURS[i % COLOURS.length],
      life: 0,
      ttl: 55 + Math.random() * 35,
    });
  }
  return sparks;
}

/** The particle loop lives outside React: plain mutable state, one animation frame at a time. */
function createEngine(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
): Engine {
  let sparks: Spark[] = [];
  let frame: number | null = null;
  const timers: number[] = [];

  function tick() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    const alive: Spark[] = [];
    for (const spark of sparks) {
      spark.life += 1;
      if (spark.life > spark.ttl) continue;
      spark.vy += GRAVITY;
      spark.vx *= DRAG;
      spark.vy *= DRAG;
      spark.x += spark.vx;
      spark.y += spark.vy;
      const fade = 1 - spark.life / spark.ttl;
      context.globalAlpha = Math.max(0, Math.min(1, fade * 1.2));
      context.fillStyle = spark.colour;
      context.beginPath();
      context.arc(
        spark.x,
        spark.y,
        spark.size * (0.6 + fade * 0.4),
        0,
        Math.PI * 2,
      );
      context.fill();
      alive.push(spark);
    }
    context.globalAlpha = 1;
    sparks = alive;
    frame = alive.length ? requestAnimationFrame(tick) : null;
  }

  function add(more: Spark[]) {
    sparks.push(...more);
    if (frame === null && sparks.length) frame = requestAnimationFrame(tick);
  }

  return {
    fire(size, origin) {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (size === "small") {
        add(
          bloom(
            origin ?? { x: window.innerWidth / 2, y: window.innerHeight * 0.3 },
            42,
            5.5,
          ),
        );
        return;
      }
      // Three fireworks across the top, one after another, calm rather than loud.
      [0.3, 0.5, 0.7].forEach((fraction, index) => {
        timers.push(
          window.setTimeout(
            () =>
              add(
                bloom(
                  {
                    x: window.innerWidth * fraction,
                    y: window.innerHeight * 0.28,
                  },
                  64,
                  6.5,
                ),
              ),
            index * 350,
          ),
        );
      });
    },
    stop() {
      for (const timer of timers) window.clearTimeout(timer);
      timers.length = 0;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      sparks = [];
      context.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}

export function useCelebration() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const quietTimer = useRef<number | null>(null);
  const [quiet, setQuiet] = useState<string | null>(null);

  /** Fire a burst. `origin` is in viewport pixels; without one it blooms near the top middle. */
  const fire = useCallback((size: BurstSize, origin?: Origin) => {
    if (reducedMotion()) {
      setQuiet(
        size === "big" ? "Done for today. Well done." : "Nice, one done.",
      );
      if (quietTimer.current) window.clearTimeout(quietTimer.current);
      quietTimer.current = window.setTimeout(() => setQuiet(null), 2500);
      return;
    }
    if (!engineRef.current) {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      engineRef.current = createEngine(canvas, context);
    }
    engineRef.current.fire(size, origin);
  }, []);

  useEffect(
    () => () => {
      engineRef.current?.stop();
      if (quietTimer.current) window.clearTimeout(quietTimer.current);
    },
    [],
  );

  return { canvasRef, fire, quiet };
}

/** Mount once near the page root. The canvas covers the viewport and never catches clicks. */
export function CelebrationLayer({
  canvasRef,
  quiet,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  quiet: string | null;
}) {
  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[70] h-full w-full"
      />
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-16 z-[70] flex justify-center"
      >
        {quiet ? (
          <p className="rounded-full border border-teal/35 bg-steel-900 px-4 py-1.5 text-[13px] font-medium text-teal shadow-md">
            {quiet}
          </p>
        ) : null}
      </div>
    </>
  );
}
