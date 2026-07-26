import Link from "next/link";

const HOBBIES = [
  {
    label: "Theoretical Physics",
    accent: "#4a9eff",
    description:
      "Cosmology, quantum mechanics, and the mathematics of emergence. I wrote a preprint on emergent complexity — the idea that macro-scale structure arises from simple local rules.",
    detail: "Currently reading: Penrose, Weinberg, and whatever arXiv sends my way.",
  },
  {
    label: "Anime",
    accent: "#ff6b4a",
    description:
      "Long-form storytelling that takes its premise seriously. World-building, narrative structure, and the occasional existential gut-punch.",
    detail: "Favourites: Steins;Gate, Vinland Saga, Mushishi.",
  },
  {
    label: "Minecraft",
    accent: "#4aff9e",
    description:
      "Redstone engineering, mega-builds, and the weird emergent complexity that comes from a sandbox. Also a useful reminder that good systems design = fun.",
    detail: "Current project: a CPU in redstone. Slowly.",
  },
  {
    label: "Research",
    accent: "#f5c842",
    description:
      "Emergence Loop — a preprint exploring how complexity bootstraps itself from simple rules. AI, thermodynamics, and a bit of philosophy of science.",
    detail: "See /misc/emergence-loop for the full paper.",
  },
  {
    label: "Game Dev",
    accent: "#7c4aff",
    description:
      "Designing systems that are fun. Every game is a thought experiment: what happens when you give players these rules and this goal?",
    detail: "See /misc/game-dev for projects.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen px-16 py-24">
      <Link
        href="/"
        className="inline-block text-sm tracking-[0.2em] uppercase text-[#a89f94] hover:text-[#e8e0d4] transition-colors mb-16"
      >
        ← Home
      </Link>

      <p className="text-sm tracking-[0.3em] uppercase text-[#4a9eff] mb-4">About</p>
      <h1 className="text-5xl font-bold mb-4">Khiem Nguyen Dang</h1>
      <p className="text-xl text-[#a89f94] mb-20 max-w-xl">
        Builder, researcher, and competitor based in Vietnam. Theoretical physics nerd who
        got distracted writing software.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {HOBBIES.map((h) => (
          <div
            key={h.label}
            className="border border-white/10 p-8 hover:border-white/20 transition-colors"
          >
            <p
              className="text-xs tracking-[0.3em] uppercase mb-3"
              style={{ color: h.accent }}
            >
              {h.label}
            </p>
            <p className="text-[#e8e0d4] mb-4 leading-relaxed">{h.description}</p>
            <p className="text-sm text-[#a89f94]">{h.detail}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
