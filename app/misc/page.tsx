import Link from "next/link";

const MISC = [
  {
    slug: "emergence-loop",
    name: "Emergence Loop",
    tag: "Research / Preprint",
    desc: "How does complexity bootstrap itself? A preprint on emergent hierarchical structure.",
  },
  {
    slug: "game-dev",
    name: "Game Dev",
    tag: "Design / Engineering",
    desc: "Jam games, procedural dungeons, and a strategy engine. Games as systems design.",
  },
];

export default function MiscPage() {
  return (
    <main className="min-h-screen px-16 py-24">
      <Link
        href="/"
        className="inline-block text-sm tracking-[0.2em] uppercase text-[#a89f94] hover:text-[#e8e0d4] transition-colors mb-16"
      >
        ← Home
      </Link>

      <p className="text-sm tracking-[0.3em] uppercase text-[#4aff9e] mb-4">Misc</p>
      <h1 className="text-5xl font-bold mb-16">The odd corners.</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
        {MISC.map((m) => (
          <Link
            key={m.slug}
            href={`/misc/${m.slug}`}
            className="group border border-white/10 p-8 hover:border-[#4aff9e]/50 transition-colors"
          >
            <p className="text-xs tracking-[0.3em] uppercase text-[#4aff9e] mb-3">{m.tag}</p>
            <h2 className="text-2xl font-bold mb-3 group-hover:text-[#4aff9e] transition-colors">
              {m.name}
            </h2>
            <p className="text-[#a89f94] leading-relaxed">{m.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
