"use client";

import React, { useEffect, useRef } from "react";

export default function ParticleSphereAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let angle = 0;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      const size = rect ? Math.min(rect.width, rect.height) : 300;
      canvas.width = size;
      canvas.height = size;
    };
    resize();
    window.addEventListener("resize", resize);

    const points: { theta: number; phi: number }[] = [];
    const count = 400;
    for (let i = 0; i < count; i++) {
      points.push({
        theta: Math.acos(2 * (i / count) - 1),
        phi: Math.PI * (1 + Math.sqrt(5)) * i,
      });
    }

    const render = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const radius = width * 0.4;
      const cx = width / 2;
      const cy = height / 2;

      for (const p of points) {
        const x = radius * Math.sin(p.theta) * Math.cos(p.phi + angle);
        const y = radius * Math.sin(p.theta) * Math.sin(p.phi + angle);
        const z = radius * Math.cos(p.theta);
        const scale = (z + radius * 1.5) / (radius * 2.5);

        ctx.beginPath();
        ctx.arc(cx + x, cy + y, Math.max(0.5, scale * 2), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120, 120, 120, ${0.2 + scale * 0.6})`;
        ctx.fill();
      }

      angle += 0.003;
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
