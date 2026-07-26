"use client";

import RobotCanvas from "@/components/RobotCanvas";
import HeroSection from "@/components/sections/HeroSection";
import AboutSection from "@/components/sections/AboutSection";
import ProjectsSection from "@/components/sections/ProjectsSection";
import CompetitionsSection from "@/components/sections/CompetitionsSection";
import MiscSection from "@/components/sections/MiscSection";

export default function Home() {
  return (
    <>
      {/* Fixed canvas — robot + lighting lives here */}
      <RobotCanvas />

      {/* Scrollable content — sections are transparent over the canvas */}
      <main>
        <HeroSection />
        <AboutSection />
        <ProjectsSection />
        <CompetitionsSection />
        <MiscSection />
      </main>
    </>
  );
}
