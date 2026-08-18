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
          initial={{ opacity: 0, scale: 0.98, y: 10, filter: "blur(5px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 1.02, y: -10, filter: "blur(5px)" }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
            mass: 0.8,
          }}
          className="flex flex-col flex-1 h-full w-full origin-top"
        >
          {children}
        </m.div>
      </MotionConfig>
    </LazyMotion>
  );
}
