import Link from "next/link";

interface MiscData {
  name: string;
  tag: string;
  tagline: string;
  body: string[];
  demoLabel: string;
}

const MISC: Record<string, MiscData> = {
  "emergence-loop": {
    name: "Emergence Loop",
    tag: "Research / Preprint",
    tagline: "How does complexity bootstrap itself?",
    body: [
      "Emergence Loop is a preprint exploring the conditions under which macro-scale structure arises from simple local rules — and why that process seems to accelerate over time.",
      "The core argument: emergence isn't just a property of complex systems, it's a feedback loop. Each layer of complexity creates new substrates for the next layer. Life enables culture. Culture enables science. Science enables AI.",
      "The paper connects thermodynamics (why order doesn't violate entropy), information theory (mutual information as a measure of emergence), and a toy agent-based model that exhibits spontaneous hierarchical organisation.",
    ],
    demoLabel: "Explore: zoom from Planck scale to cosmic web",
  },
  "game-dev": {
    name: "Game Dev",
    tag: "Design / Engineering",
    tagline: "Every game is a thought experiment.",
    body: [
      "Games are the most honest systems design exercise: if the rules aren't fun, players immediately tell you by quitting.",
      "Projects range from a jam game built in 48 hours to longer explorations: a physics-based puzzle game, a procedural dungeon crawler, and the strategy engine inside Clash of Nations.",
      "Engine of choice: Godot 4 for 2D/3D, raw canvas for browser experiments. Interested in emergent gameplay, procedural generation, and AI-driven non-player behaviour.",
    ],
    demoLabel: "Play: browser demo of the current project",
  },
};

export function generateStaticParams() {
  return Object.keys(MISC).map((slug) => ({ slug }));
}

interface Props {
  params: { slug: string };
}

export default function MiscDeepPage({ params }: Props) {
  const item = MISC[params.slug];

  if (!item) {
    return (
      <main className="min-h-screen px-16 py-24">
        <Link
          href="/misc"
          className="inline-block text-sm tracking-[0.2em] uppercase text-[#a89f94] hover:text-[#e8e0d4] transition-colors mb-16"
        >
          ← Misc
        </Link>
        <p className="text-[#a89f94]">Page not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-16 py-24 max-w-4xl">
      <Link
        href="/misc"
        className="inline-block text-sm tracking-[0.2em] uppercase text-[#a89f94] hover:text-[#e8e0d4] transition-colors mb-16"
      >
        ← Misc
      </Link>

      <p className="text-xs tracking-[0.3em] uppercase text-[#4aff9e] mb-2">{item.tag}</p>
      <h1 className="text-6xl font-bold mb-4">{item.name}</h1>
      <p className="text-2xl text-[#a89f94] mb-20">{item.tagline}</p>

      <div className="space-y-6 mb-24">
        {item.body.map((para, i) => (
          <p key={i} className="text-[#e8e0d4] leading-relaxed text-lg">
            {para}
          </p>
        ))}
      </div>

      {/* Interactive placeholder */}
      <div className="border border-[#4aff9e]/30 p-12 flex items-center justify-center min-h-64">
        <div className="text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-[#4aff9e] mb-4">
            Interactive
          </p>
          <p className="text-[#a89f94] text-lg">{item.demoLabel}</p>
          <p className="text-sm text-[#a89f94]/50 mt-2">Coming soon.</p>
        </div>
      </div>
    </main>
  );
}
