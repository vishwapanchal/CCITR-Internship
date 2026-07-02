"use client";

import { m, MotionConfig, LazyMotion, domAnimation } from "framer-motion";
import { usePathname } from "next/navigation";

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <m.div
          key={pathname}
          initial={{ opacity: 0, scale: 0.9, y: 20, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 1.05, y: -20, filter: "blur(10px)" }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            mass: 0.5,
          }}
          className="flex flex-col flex-1 h-full w-full origin-bottom"
        >
          {children}
        </m.div>
      </MotionConfig>
    </LazyMotion>
  );
}
