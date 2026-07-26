import Link from "next/link";

const COMPETITIONS = ["IOAI", "VOAI", "FTC Vietnam + Worlds", "BARN"];

export default function CompetitionsSection() {
  return (
    <section className="section-full px-16">
      <div className="section-text max-w-lg ml-auto">
        <p className="text-sm tracking-[0.3em] uppercase text-[#7c4aff] mb-4">
          Competitions
        </p>
        <h2 className="text-4xl font-bold mb-6">
          The arena.
        </h2>
        <ul className="space-y-2 mb-8">
          {COMPETITIONS.map((c) => (
            <li key={c} className="text-[#a89f94] text-lg">
              {c}
            </li>
          ))}
        </ul>
        <Link
          href="/competitions"
          className="text-[#7c4aff] text-sm tracking-widest uppercase pointer-events-auto hover:opacity-70 transition-opacity"
        >
          Explore →
        </Link>
      </div>
    </section>
  );
}
