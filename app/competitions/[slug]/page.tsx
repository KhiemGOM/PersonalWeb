import Link from "next/link";

interface CompetitionData {
  name: string;
  tag: string;
  tagline: string;
  context: string;
  what: string;
  result: string;
  demoLabel: string;
}

const COMPETITIONS: Record<string, CompetitionData> = {
  ioai: {
    name: "IOAI",
    tag: "International Olympiad in AI",
    tagline: "Vietnam on the world stage.",
    context:
      "The International Olympiad in Artificial Intelligence brings together high-school-aged competitors from dozens of countries for a two-day theoretical and practical exam covering ML, statistics, and algorithm design.",
    what:
      "Tasks ranged from deriving gradient descent by hand to implementing neural architectures under time pressure. The practical rounds involved tuning models on novel datasets with no internet access.",
    result: "Represented Vietnam. Result: [fill in].",
    demoLabel: "Try the linear regression tuner — same style as the practical round",
  },
  voai: {
    name: "VOAI",
    tag: "Vietnamese Olympiad in AI",
    tagline: "National qualifier. Top of the ladder.",
    context:
      "The Vietnamese Olympiad in AI is the national selection competition for IOAI. Theory-heavy: probability, linear algebra, ML fundamentals, and algorithm complexity.",
    what:
      "Written exam across two sessions. Covers supervised/unsupervised learning theory, optimization, and a coding round with classic ML tasks.",
    result: "Qualified for IOAI. Result: [fill in].",
    demoLabel: "Try: a probability-theory problem set from the style of VOAI",
  },
  ftc: {
    name: "FTC Vietnam + Worlds",
    tag: "FIRST Tech Challenge",
    tagline: "Build a robot. Win a match. Go to Worlds.",
    context:
      "FIRST Tech Challenge is an international robotics competition where teams design, build, and program a robot to compete in an alliance-based game. Season games change annually.",
    what:
      "Our robot handled both the 30-second autonomous period (computer vision for object detection and navigation) and the 2-minute driver-controlled period. We designed the chassis, built custom mechanisms, and wrote all software.",
    result: "Qualified for and competed at FTC World Championship. Result: [fill in].",
    demoLabel: "Drive the robot: Nav2-style teleoperation simulator",
  },
  barn: {
    name: "BARN",
    tag: "Blind and Realistic Navigation",
    tagline: "Navigate the unknown.",
    context:
      "The BARN challenge tests mobile robot navigation in cluttered, obstacle-dense environments with no prior map. Robots must reach a goal using only on-board sensors.",
    what:
      "Stack: ROS 2, LiDAR-based SLAM for live mapping, DWA local planner for reactive obstacle avoidance. Tuned costmap parameters for narrow-gap traversal.",
    result: "Result: [fill in].",
    demoLabel: "Simulate: place obstacles, watch the planner route",
  },
};

export function generateStaticParams() {
  return Object.keys(COMPETITIONS).map((slug) => ({ slug }));
}

interface Props {
  params: { slug: string };
}

export default function CompetitionDeepPage({ params }: Props) {
  const competition = COMPETITIONS[params.slug];

  if (!competition) {
    return (
      <main className="min-h-screen px-16 py-24">
        <Link
          href="/competitions"
          className="inline-block text-sm tracking-[0.2em] uppercase text-[#a89f94] hover:text-[#e8e0d4] transition-colors mb-16"
        >
          ← Competitions
        </Link>
        <p className="text-[#a89f94]">Competition not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-16 py-24 max-w-5xl">
      <Link
        href="/competitions"
        className="inline-block text-sm tracking-[0.2em] uppercase text-[#a89f94] hover:text-[#e8e0d4] transition-colors mb-16"
      >
        ← Competitions
      </Link>

      <p className="text-xs tracking-[0.3em] uppercase text-[#7c4aff] mb-2">
        {competition.tag}
      </p>
      <h1 className="text-6xl font-bold mb-4">{competition.name}</h1>
      <p className="text-2xl text-[#a89f94] mb-20">{competition.tagline}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-16">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-[#7c4aff] mb-4">Context</p>
          <p className="text-[#e8e0d4] leading-relaxed">{competition.context}</p>
        </div>
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-[#7c4aff] mb-4">What We Did</p>
          <p className="text-[#e8e0d4] leading-relaxed">{competition.what}</p>
        </div>
      </div>

      <div className="mb-24 border-l-2 border-[#7c4aff] pl-6">
        <p className="text-xs tracking-[0.3em] uppercase text-[#7c4aff] mb-2">Result</p>
        <p className="text-[#e8e0d4]">{competition.result}</p>
      </div>

      {/* Interactive demo placeholder */}
      <div className="border border-[#7c4aff]/30 p-12 flex items-center justify-center min-h-64">
        <div className="text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-[#7c4aff] mb-4">
            Interactive Demo
          </p>
          <p className="text-[#a89f94] text-lg">{competition.demoLabel}</p>
          <p className="text-sm text-[#a89f94]/50 mt-2">Coming soon.</p>
        </div>
      </div>
    </main>
  );
}
