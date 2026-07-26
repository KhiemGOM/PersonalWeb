import Link from "next/link";

export default function MiscSection() {
  return (
    <section className="section-full px-16">
      <div className="section-text max-w-lg">
        <p className="text-sm tracking-[0.3em] uppercase text-[#4aff9e] mb-4">
          Misc
        </p>
        <h2 className="text-4xl font-bold mb-4">
          The odd corners.
        </h2>
        <p className="text-[#a89f94] mb-8">
          A preprint on emergence. Some game dev. Things that don&apos;t fit elsewhere.
        </p>
        <Link
          href="/misc"
          className="text-[#4aff9e] text-sm tracking-widest uppercase pointer-events-auto hover:opacity-70 transition-opacity"
        >
          Explore →
        </Link>
      </div>
    </section>
  );
}
