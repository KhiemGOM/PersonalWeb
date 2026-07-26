import Link from "next/link";

const PROJECTS = [
  {
    slug: "lectify",
    name: "Lectify",
    tag: "AI / EdTech",
    desc: "Turns raw lecture recordings into structured, searchable notes. OCR + LLM pipeline, built for students who don't want to miss anything.",
  },
  {
    slug: "warden",
    name: "Warden",
    tag: "Security",
    desc: "Real-time monitoring tool that watches for anomalous behaviour in networked systems. Alert logic and dashboard.",
  },
  {
    slug: "clash-of-nations",
    name: "Clash of Nations",
    tag: "Game / Simulation",
    desc: "Turn-based strategy game with procedural map generation, diplomacy, and economic simulation. Built from scratch.",
  },
  {
    slug: "robocup",
    name: "RoboCup",
    tag: "Robotics / CV",
    desc: "Autonomous robot soccer. Computer vision for ball tracking, path planning for navigation, all running on-device.",
  },
  {
    slug: "skillseed",
    name: "Skillseed",
    tag: "EdTech / Graph",
    desc: "Adaptive learning platform that maps skills as a dependency graph. Study what you need next, not what's next in the textbook.",
  },
];

export default function ProjectsPage() {
  return (
    <main className="min-h-screen px-16 py-24">
      <Link
        href="/"
        className="inline-block text-sm tracking-[0.2em] uppercase text-[#a89f94] hover:text-[#e8e0d4] transition-colors mb-16"
      >
        ← Home
      </Link>

      <p className="text-sm tracking-[0.3em] uppercase text-[#ff6b4a] mb-4">Projects</p>
      <h1 className="text-5xl font-bold mb-16">Things I&apos;ve built.</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
        {PROJECTS.map((p) => (
          <Link
            key={p.slug}
            href={`/projects/${p.slug}`}
            className="group border border-white/10 p-8 hover:border-[#ff6b4a]/50 transition-colors"
          >
            <p className="text-xs tracking-[0.3em] uppercase text-[#ff6b4a] mb-3">{p.tag}</p>
            <h2 className="text-2xl font-bold mb-3 group-hover:text-[#ff6b4a] transition-colors">
              {p.name}
            </h2>
            <p className="text-[#a89f94] leading-relaxed">{p.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
