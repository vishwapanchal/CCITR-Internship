"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface ThreatScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

function getScoreColor(score: number): string {
  if (score <= 25) return "#10b981"; // green
  if (score <= 50) return "#eab308"; // yellow
  if (score <= 75) return "#f57c00"; // orange
  return "#d32f2f"; // red
}

function getScoreLabel(score: number): string {
  if (score <= 25) return "LOW RISK";
  if (score <= 50) return "MODERATE";
  if (score <= 75) return "HIGH RISK";
  return "CRITICAL";
}

const sizeConfig = {
  sm: { svgSize: 100, radius: 38, strokeWidth: 5, fontSize: "text-xl", labelSize: "text-[9px]" },
  md: { svgSize: 160, radius: 60, strokeWidth: 8, fontSize: "text-4xl", labelSize: "text-xs" },
  lg: { svgSize: 220, radius: 85, strokeWidth: 10, fontSize: "text-5xl", labelSize: "text-sm" },
};

export default function ThreatScore({ score, size = "md", showLabel = true }: ThreatScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;
  const color = getScoreColor(score);
  const half = config.svgSize / 2;

  useEffect(() => {
    const timeout = setTimeout(() => setAnimatedScore(score), 300);
    return () => clearTimeout(timeout);
  }, [score]);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center">
        <svg width={config.svgSize} height={config.svgSize} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={half}
            cy={half}
            r={config.radius}
            stroke="#e4e4e7"
            strokeWidth={config.strokeWidth}
            fill="transparent"
          />
          {/* Score arc */}
          <motion.circle
            cx={half}
            cy={half}
            r={config.radius}
            stroke={color}
            strokeWidth={config.strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute flex flex-col items-center justify-center">
          <motion.span
            className={`${config.fontSize} font-bold font-display`}
            style={{ color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            {animatedScore}
          </motion.span>
          {showLabel && (
            <span className={`${config.labelSize} font-mono uppercase tracking-widest text-forensic-blue/60 mt-1`}>
              {getScoreLabel(score)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
