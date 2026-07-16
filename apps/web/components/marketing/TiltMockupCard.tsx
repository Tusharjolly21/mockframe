"use client";

import React, { useRef, useState } from "react";
import { motion, useSpring, useTransform } from "motion/react";

interface Props {
  background?: string;
  width?: string;
  height?: string;
  children: React.ReactNode;
}

export function TiltMockupCard({ background, width = "260px", height = "340px", children }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);

  // Motion spring values for smooth tilt updates
  const rotateX = useSpring(0, { damping: 20, stiffness: 150 });
  const rotateY = useSpring(0, { damping: 20, stiffness: 150 });

  // Specular sheen position maps
  const sheenX = useSpring(50, { damping: 25, stiffness: 120 });
  const sheenY = useSpring(50, { damping: 25, stiffness: 120 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const widthNum = rect.width;
    const heightNum = rect.height;

    // Calculate cursor relative position (-0.5 to 0.5)
    const posX = (e.clientX - rect.left) / widthNum - 0.5;
    const posY = (e.clientY - rect.top) / heightNum - 0.5;

    // Map position to max rotation angle (e.g. 18 degrees)
    rotateX.set(-posY * 18);
    rotateY.set(posX * 18);

    // Map sheen gradient center (0% to 100%)
    sheenX.set((posX + 0.5) * 100);
    sheenY.set((posY + 0.5) * 100);
  };

  const handleMouseEnter = () => {
    setHovering(true);
  };

  const handleMouseLeave = () => {
    setHovering(false);
    rotateX.set(0);
    rotateY.set(0);
    sheenX.set(50);
    sheenY.set(50);
  };

  // Convert Spring values to dynamic background radial gradient styles
  const sheenBg = useTransform(
    [sheenX, sheenY],
    ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 65%)`
  );

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex items-center justify-center overflow-hidden rounded-[24px] border border-white/10 transition-all duration-300 select-none"
      style={{
        background: background || "radial-gradient(circle at 30% 30%, rgba(124, 58, 237, 0.22), transparent 70%), linear-gradient(135deg, #09080f 0%, #13111c 100%)",
        perspective: "1200px",
        transformStyle: "preserve-3d",
        width,
        height,
        boxShadow: hovering
          ? "0 40px 90px rgba(0, 0, 0, 0.8), 0 0 50px rgba(139, 92, 246, 0.2)"
          : "0 30px 60px rgba(0,0,0,0.55)",
      }}
    >
      {/* 3D Tilting Body Wrapper */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        {/* Render children inside the 3D rotation frame */}
        {children}

        {/* Specular sheen overlay */}
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: sheenBg,
            pointerEvents: "none",
            mixBlendMode: "overlay",
            zIndex: 50,
          }}
        />
      </motion.div>
    </div>
  );
}
