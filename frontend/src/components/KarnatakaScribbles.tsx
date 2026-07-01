"use client";

import { motion } from "framer-motion";

export default function KarnatakaScribbles() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-50">
      {/* Top Left Scribble - Yellow (Karnataka Flag Top Color) */}
      <svg className="absolute top-[5%] left-[5%] md:left-[10%] w-64 h-64 md:w-96 md:h-96 text-[#FFD700]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <motion.path
          d="M10,90 Q20,10 40,30 T70,20 Q90,50 80,80"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />
        <motion.path
          d="M15,85 C10,40 50,10 60,40 S90,80 85,15"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.4 }}
          transition={{ duration: 5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1 }}
        />
      </svg>

      {/* Bottom Right Scribble - Red (Karnataka Flag Bottom Color) */}
      <svg className="absolute bottom-[5%] right-[5%] md:right-[10%] w-64 h-64 md:w-96 md:h-96 text-[#D32F2F]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <motion.path
          d="M90,90 Q80,10 60,30 T30,20 Q10,50 20,80"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={{ duration: 4.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.5 }}
        />
        <motion.path
          d="M85,85 C90,40 50,10 40,40 S10,80 15,15"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.5 }}
          transition={{ duration: 5.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1.5 }}
        />
      </svg>
      
      {/* Center Left - Mixed Chaotic Scribble */}
      <svg className="absolute top-[40%] -left-[10%] md:left-[5%] w-48 h-48 md:w-64 md:h-64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <motion.path
          d="M10,50 C30,10 70,90 90,50"
          stroke="#FFD700"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 2 }}
        />
        <motion.path
          d="M50,10 C10,30 90,70 50,90"
          stroke="#D32F2F"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 3.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1 }}
        />
      </svg>

      {/* Center Right - Mixed Chaotic Scribble */}
      <svg className="absolute top-[30%] -right-[10%] md:right-[5%] w-48 h-48 md:w-72 md:h-72" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <motion.path
          d="M20,20 Q60,10 80,80 T20,80"
          stroke="#FFD700"
          strokeWidth="1"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.4 }}
          transition={{ duration: 4.2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.2 }}
        />
        <motion.path
          d="M80,20 Q40,10 20,80 T80,80"
          stroke="#D32F2F"
          strokeWidth="1"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.4 }}
          transition={{ duration: 4.8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.8 }}
        />
      </svg>
    </div>
  );
}
