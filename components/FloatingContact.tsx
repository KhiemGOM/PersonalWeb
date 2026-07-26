"use client";

import { motion } from "framer-motion";

export default function FloatingContact() {
  return (
    <motion.a
      href="mailto:khiem@example.com" // TODO: replace with real email
      className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-[#f5c842] text-[#0a0a0a] font-semibold text-sm tracking-wide shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.6 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.97 }}
    >
      <span className="text-base leading-none">✉</span>
      Contact
    </motion.a>
  );
}
