"use client";

// Intentional 404-style page.
// Robot falls over, page reassembles into the hire-me message.
// TODO: animate robot fall + text reassembly with Framer Motion

import { motion } from "framer-motion";
import Link from "next/link";

export default function ExperiencePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-8">
      {/* TODO: fallen robot canvas animation here */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.8 }}
      >
        <p className="text-sm tracking-[0.3em] uppercase text-[#a89f94] mb-6">404</p>
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          I haven&apos;t been hired yet.
        </h1>
        <p className="text-xl text-[#a89f94] mb-10">
          If you want to change that, contact me.
        </p>
        <Link
          href="mailto:khiem@example.com" // TODO: real email
          className="px-8 py-4 bg-[#f5c842] text-[#0a0a0a] font-semibold rounded-full hover:opacity-90 transition-opacity"
        >
          Let&apos;s talk
        </Link>
      </motion.div>
    </main>
  );
}
