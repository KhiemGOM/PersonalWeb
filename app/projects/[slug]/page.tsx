import Link from "next/link";

interface ProjectData {
  name: string;
  tag: string;
  tagline: string;
  problem: string;
  approach: string;
  stack: string[];
  demoLabel: string;
}

const PROJECTS: Record<string, ProjectData> = {
  lectify: {
    name: "Lectify",
    tag: "AI / EdTech",
    tagline: "Every word your lecturer says, structured and searchable.",
    problem:
      "Lectures are ephemeral. Notes are incomplete. Students miss context, mishear terminology, and lose the thread. Recordings exist but aren't searchable.",
    approach:
      "OCR + Whisper transcription pipeline. An LLM segments the transcript into logical topics, extracts key definitions, and generates a navigable outline. Output is a structured JSON document rendered as an interactive study guide.",
    stack: ["Python", "Whisper", "OpenAI API", "React", "FastAPI"],
    demoLabel: "Try: upload a short lecture clip",
  },
  warden: {
    name: "Warden",
    tag: "Security",
    tagline: "Watch the network. Catch the anomaly.",
    problem:
      "Most security tools drown you in false positives or miss subtle behavioural shifts. You need a system that learns what's normal and flags what isn't.",
    approach:
      "Statistical baseline per host + rolling Z-score on traffic features. Alert logic tiers by severity. Dashboard shows timeline of events with drill-down.",
    stack: ["Python", "InfluxDB", "Grafana", "Go", "React"],
    demoLabel: "Demo: inject an anomaly into the live feed",
  },
  "clash-of-nations": {
    name: "Clash of Nations",
    tag: "Game / Simulation",
    tagline: "Build a nation. Survive the arena.",
    problem:
      "Strategy games are fun but their maps are static and their AI is dumb. What if the world generated itself and the nations had real economic logic?",
    approach:
      "Procedural hex-grid world gen with elevation, climate, and resource placement. Each nation runs a simple economic model: produce, trade, invest in military. Diplomacy is a state machine.",
    stack: ["Godot 4", "GDScript", "Python (worldgen)"],
    demoLabel: "Play: one-turn demo",
  },
  robocup: {
    name: "RoboCup",
    tag: "Robotics / CV",
    tagline: "Autonomous robot soccer, no human in the loop.",
    problem:
      "Getting a robot to find a ball, navigate to it, and shoot accurately — all in real time, on cheap hardware, under adversarial conditions.",
    approach:
      "YOLOv8 for ball and goal detection. Custom path planner with obstacle avoidance. All inference runs on-device (Jetson Nano). State machine for game logic: search → approach → aim → shoot.",
    stack: ["Python", "YOLOv8", "ROS 2", "Jetson Nano", "OpenCV"],
    demoLabel: "Simulate: place the ball, watch the robot plan",
  },
  skillseed: {
    name: "Skillseed",
    tag: "EdTech / Graph",
    tagline: "Study what you need next, not what's next in the textbook.",
    problem:
      "Curricula are linear. Knowledge isn't. You might need graph theory to understand ML, but the textbook chapter is 12 steps away.",
    approach:
      "Skills modelled as a directed dependency graph. A learner profile tracks mastery per node. The platform surfaces the highest-value next skill given your current state. Content is generated or linked per node.",
    stack: ["Next.js", "Neo4j", "TypeScript", "OpenAI API"],
    demoLabel: "Explore: navigate the skill graph",
  },
};

export function generateStaticParams() {
  return Object.keys(PROJECTS).map((slug) => ({ slug }));
}

interface Props {
  params: { slug: string };
}

export default function ProjectDeepPage({ params }: Props) {
  const project = PROJECTS[params.slug];

  if (!project) {
    return (
      <main className="min-h-screen px-16 py-24">
        <Link
          href="/projects"
          className="inline-block text-sm tracking-[0.2em] uppercase text-[#a89f94] hover:text-[#e8e0d4] transition-colors mb-16"
        >
          ← Projects
        </Link>
        <p className="text-[#a89f94]">Project not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-16 py-24 max-w-5xl">
      <Link
        href="/projects"
        className="inline-block text-sm tracking-[0.2em] uppercase text-[#a89f94] hover:text-[#e8e0d4] transition-colors mb-16"
      >
        ← Projects
      </Link>

      <p className="text-xs tracking-[0.3em] uppercase text-[#ff6b4a] mb-4">{project.tag}</p>
      <h1 className="text-6xl font-bold mb-4">{project.name}</h1>
      <p className="text-2xl text-[#a89f94] mb-20">{project.tagline}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-24">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-[#ff6b4a] mb-4">The Problem</p>
          <p className="text-[#e8e0d4] leading-relaxed">{project.problem}</p>
        </div>
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-[#ff6b4a] mb-4">The Approach</p>
          <p className="text-[#e8e0d4] leading-relaxed">{project.approach}</p>
        </div>
      </div>

      <div className="mb-24">
        <p className="text-xs tracking-[0.3em] uppercase text-[#ff6b4a] mb-4">Stack</p>
        <div className="flex flex-wrap gap-3">
          {project.stack.map((s) => (
            <span
              key={s}
              className="px-3 py-1 border border-white/20 text-sm text-[#a89f94]"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Interactive demo placeholder */}
      <div className="border border-[#ff6b4a]/30 p-12 flex items-center justify-center min-h-64">
        <div className="text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-[#ff6b4a] mb-4">
            Interactive Demo
          </p>
          <p className="text-[#a89f94] text-lg">{project.demoLabel}</p>
          <p className="text-sm text-[#a89f94]/50 mt-2">Coming soon.</p>
        </div>
      </div>
    </main>
  );
}
