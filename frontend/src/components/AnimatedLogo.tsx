"use client";

import { m } from "framer-motion";

const text = "APEX-X";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const letterVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.5, rotateX: -90 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      type: "spring",
      damping: 12,
      stiffness: 200,
    },
  },
  hover: {
    scale: 1.2,
    color: "#818cf8", // primary-light
    y: -5,
    rotateZ: Math.random() > 0.5 ? 5 : -5,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 10,
    },
  },
};

export default function AnimatedLogo() {
  return (
    <m.div
      className="flex items-center cursor-pointer group"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex font-display font-black text-2xl md:text-3xl tracking-tighter">
        {text.split("").map((char, index) => (
          <m.span
            key={index}
            variants={letterVariants}
            whileHover="hover"
            className="inline-block bg-gradient-to-br from-primary via-accent to-primary-light bg-clip-text text-transparent drop-shadow-sm transition-colors"
            style={{
              textShadow: "0px 4px 15px rgba(79, 70, 229, 0.3)",
            }}
          >
            {char}
          </m.span>
        ))}
        {/* Blinking cursor effect for tech vibe */}
        <m.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="inline-block ml-1 w-2 h-6 md:h-8 bg-primary translate-y-1"
        />
      </div>
    </m.div>
  );
}
