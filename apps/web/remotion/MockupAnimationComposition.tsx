"use client";

import { useVideoConfig, useCurrentFrame, spring, interpolate, AbsoluteFill } from "remotion";
import React from "react";

interface Props {
  imageUrl?: string;
  backgroundColor?: string;
  tiltAngle?: number;
}

export function MockupAnimationComposition({
  imageUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
  backgroundColor = "#0f172a",
  tiltAngle = 12,
}: Props) {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  // Smooth entrance scale animation
  const scale = spring({
    frame,
    fps,
    from: 0.8,
    to: 1,
    config: {
      damping: 12,
    },
  });

  // Specular sheen sweep from top-left to bottom-right
  const sheenProgress = interpolate(
    frame,
    [0, durationInFrames],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  const sheenOffset = sheenProgress * 200 - 50; // -50% to 150%

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* 3D Mockup Card */}
      <div
        style={{
          transform: `scale(${scale}) rotateY(${tiltAngle}deg) rotateX(8deg)`,
          transformStyle: "preserve-3d",
          perspective: 1000,
          position: "relative",
          width: "360px",
          height: "640px",
          borderRadius: "32px",
          backgroundColor: "#1e1e24",
          border: "8px solid rgba(255,255,255,0.1)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {/* Screenshot Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Mockup scene"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Specular sheen layer */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${sheenOffset}%`,
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 70%)",
            pointerEvents: "none",
            transform: "skewX(-25deg)",
          }}
        />
      </div>
    </AbsoluteFill>
  );
}
