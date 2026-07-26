import Link from "next/link";

const PROJECTS = ["Lectify", "Warden", "Clash of Nations", "RoboCup", "Skillseed"];

export default function ProjectsSection() {
  return (
    <section className="section-full px-16">
      <div className="section-text max-w-lg">
        <p className="text-sm tracking-[0.3em] uppercase text-[#ff6b4a] mb-4">
          Projects
        </p>
        <h2 className="text-4xl font-bold mb-6">
          Things I&apos;ve built.
        </h2>
        <ul className="space-y-2 mb-8">
          {PROJECTS.map((p) => (
            <li key={p} className="text-[#a89f94] text-lg">
              {p}
            </li>
          ))}
        </ul>
        <Link
          href="/projects"
          className="text-[#ff6b4a] text-sm tracking-widest uppercase pointer-events-auto hover:opacity-70 transition-opacity"
        >
          Explore →
        </Link>
      </div>
    </section>
  );
}
