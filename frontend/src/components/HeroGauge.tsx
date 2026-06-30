"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function HeroGauge({ score = 87 }: { score?: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedScore(score);
    }, 500);
    return () => clearTimeout(timeout);
  }, [score]);

  // Circumference calculation
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="relative flex items-center justify-center">
        {/* Background Circle */}
        <svg className="w-40 h-40 transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-border-subtle"
          />
          {/* Animated Circle */}
          <motion.circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={`${
              score > 80 ? "text-critical" : score > 50 ? "text-warning" : "text-success"
            }`}
          />
        </svg>
        {/* Score Text */}
        <div className="absolute flex flex-col items-center justify-center">
          <motion.span 
            className="text-4xl font-display font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            {animatedScore}
          </motion.span>
          <span className="text-xs font-mono uppercase tracking-widest text-forensic-blue/70">Threat Score</span>
        </div>
      </div>
    </div>
  );
}
