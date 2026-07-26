import Link from "next/link";

const COMPETITIONS = [
  {
    slug: "ioai",
    name: "IOAI",
    tag: "International",
    desc: "International Olympiad in Artificial Intelligence. Represented Vietnam on the world stage.",
  },
  {
    slug: "voai",
    name: "VOAI",
    tag: "National",
    desc: "Vietnamese Olympiad in Artificial Intelligence. National qualification route to IOAI.",
  },
  {
    slug: "ftc",
    name: "FTC Vietnam + Worlds",
    tag: "Robotics",
    desc: "FIRST Tech Challenge — autonomous + driver-controlled robot competition. Vietnam team that made it to Worlds.",
  },
  {
    slug: "barn",
    name: "BARN",
    tag: "Robotics / Nav",
    desc: "Blind and Realistic Navigation challenge. Mobile robot navigation in cluttered, unknown environments.",
  },
];

export default function CompetitionsPage() {
  return (
    <main className="min-h-screen px-16 py-24">
      <Link
        href="/"
        className="inline-block text-sm tracking-[0.2em] uppercase text-[#a89f94] hover:text-[#e8e0d4] transition-colors mb-16"
      >
        ← Home
      </Link>

      <p className="text-sm tracking-[0.3em] uppercase text-[#7c4aff] mb-4">Competitions</p>
      <h1 className="text-5xl font-bold mb-16">The arena.</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
        {COMPETITIONS.map((c) => (
          <Link
            key={c.slug}
            href={`/competitions/${c.slug}`}
            className="group border border-white/10 p-8 hover:border-[#7c4aff]/50 transition-colors"
          >
            <p className="text-xs tracking-[0.3em] uppercase text-[#7c4aff] mb-3">{c.tag}</p>
            <h2 className="text-2xl font-bold mb-3 group-hover:text-[#7c4aff] transition-colors">
              {c.name}
            </h2>
            <p className="text-[#a89f94] leading-relaxed">{c.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
