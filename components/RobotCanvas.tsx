"use client";

import { useEffect, useRef } from "react";
import { drawRobot } from "@/lib/robot";
import { drawLighting } from "@/lib/lighting";
import {
  getRobotPositionAtProgress,
  lerp,
  MAIN_PATH,
} from "@/lib/scrollPath";

// Section accent colors keyed by section name
const SECTION_ACCENTS: Record<string, string> = {
  hero:         "#f5c842",
  about:        "#4a9eff",
  projects:     "#ff6b4a",
  competitions: "#7c4aff",
  misc:         "#4aff9e",
};

export default function RobotCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // --- State ---
    let width = window.innerWidth;
    let height = window.innerHeight;
    let scrollProgress = 0;

    // Robot actual position (lerped, in canvas pixels)
    let robotX = width * 0.5;
    let robotY = height * 0.55;

    // Mouse position
    let mouseX = width * 0.5;
    let mouseY = height * 0.5;

    // Head angle (lerped)
    let headAngle = 0;
    let targetHeadAngle = 0;

    // Lighting intensity (lerps to 1; fades when section changes, relights)
    let lightIntensity = 1;
    let currentSection = "hero";

    let animId: number;

    // --- Resize ---
    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width;
      canvas!.height = height;
    }

    // --- Scroll ---
    function onScroll() {
      const scrollY = window.scrollY;
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      scrollProgress = maxScroll > 0 ? scrollY / maxScroll : 0;
    }

    // --- Mouse ---
    function onMouseMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }

    // --- Main loop ---
    function tick() {
      const { x: targetXRatio, y: targetYRatio, section } =
        getRobotPositionAtProgress(scrollProgress, MAIN_PATH);

      const targetX = targetXRatio * width;
      const targetY = targetYRatio * height;

      // Lerp robot position (trails behind)
      robotX = lerp(robotX, targetX, 0.05);
      robotY = lerp(robotY, targetY, 0.05);

      // Section change — brief intensity dip then ramp back up
      if (section !== currentSection) {
        currentSection = section;
        lightIntensity = 0.2;
      }
      lightIntensity = lerp(lightIntensity, 1, 0.04);

      // Head tracks mouse (angle from robot head to cursor)
      targetHeadAngle = Math.atan2(
        mouseY - (robotY - height * 0.05),
        mouseX - robotX
      );
      headAngle = lerp(headAngle, targetHeadAngle, 0.08);

      // --- Draw ---
      ctx!.clearRect(0, 0, width, height);

      // 1. Void background
      ctx!.fillStyle = "#0a0a0a";
      ctx!.fillRect(0, 0, width, height);

      // 2. Lighting (dark overlay with light holes)
      drawLighting(ctx!, width, height, {
        robotX,
        robotY,
        mouseX,
        mouseY,
        accentColor: SECTION_ACCENTS[currentSection] ?? "#f5c842",
        intensity: lightIntensity,
      });

      // 3. Robot on top
      drawRobot(ctx!, {
        x: robotX,
        y: robotY,
        headAngle,
        scale: 1,
      });

      animId = requestAnimationFrame(tick);
    }

    // --- Init ---
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouseMove);
    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="world-canvas"
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    />
  );
}
