import Link from "next/link";

export default function AboutSection() {
  return (
    <section className="section-full px-16">
      <div className="section-text max-w-md ml-auto">
        <p className="text-sm tracking-[0.3em] uppercase text-[#4a9eff] mb-4">
          About
        </p>
        <h2 className="text-4xl font-bold mb-4">
          Theoretical physics nerd who builds things.
        </h2>
        <p className="text-[#a89f94] mb-8">
          Anime, Minecraft, and the occasional existential question about emergence.
        </p>
        <Link
          href="/about"
          className="text-[#4a9eff] text-sm tracking-widest uppercase pointer-events-auto hover:opacity-70 transition-opacity"
        >
          Learn more →
        </Link>
      </div>
    </section>
  );
}
