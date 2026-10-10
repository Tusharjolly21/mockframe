import { useEffect, useMemo, type FC } from "react";
import { ThreeCanvas } from "@remotion/three";
import { noise3D } from "@remotion/noise";
import { getRemotionEnvironment, spring, useCurrentFrame, useCurrentScale, useVideoConfig } from "remotion";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { shade } from "./Shapes";

/**
 * Real 3D abstract sculpture (three.js via @remotion/three): clear-coated
 * spheres, an iridescent torus, a satin capsule, a lacquered slab and a metal ring, lit
 * by a procedural studio environment so every surface carries real
 * reflections. Motion is frame-driven (springs + simplex noise), so renders
 * are deterministic.
 */

/** Procedural studio reflections — no HDR asset to fetch. Built synchronously
 *  so the very first rendered frame already carries the reflections. */
const StudioEnv: FC = () => {
  const gl = useThree((st) => st.gl);
  const scene = useThree((st) => st.scene);
  const env = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return tex;
  }, [gl]);
  scene.environment = env;
  useEffect(() => () => env.dispose(), [env]);
  return null;
};

type Kind = "sphere" | "torus" | "capsule" | "slab" | "ring" | "knot";

interface Piece {
  kind: Kind;
  pos: [number, number, number];
  scale: number;
  color: string;
  enterAt: number;
  rot?: [number, number, number];
  spin?: number;
  material: "gloss" | "satin" | "iridescent" | "chrome";
}

function geometryFor(kind: Kind) {
  switch (kind) {
    case "sphere":
      return <sphereGeometry args={[1, 64, 48]} />;
    case "torus":
      return <torusGeometry args={[1, 0.38, 40, 112]} />;
    case "capsule":
      return <capsuleGeometry args={[0.42, 1.3, 16, 48]} />;
    case "slab":
      return <boxGeometry args={[2.2, 1.4, 0.12]} />;
    case "ring":
      return <torusGeometry args={[1, 0.06, 16, 160]} />;
    case "knot":
      return <torusKnotGeometry args={[0.7, 0.22, 160, 24]} />;
  }
}

function MaterialFor({ material, color }: { material: Piece["material"]; color: string }) {
  switch (material) {
    case "gloss":
      return <meshPhysicalMaterial color={color} roughness={0.18} metalness={0.05} clearcoat={1} clearcoatRoughness={0.06} envMapIntensity={1.2} />;
    case "satin":
      return <meshPhysicalMaterial color={color} roughness={0.45} metalness={0.1} sheen={1} sheenColor={shade(color, 0.5)} envMapIntensity={0.9} />;
    case "iridescent":
      return <meshPhysicalMaterial color={color} roughness={0.15} metalness={0.4} iridescence={1} iridescenceIOR={1.6} iridescenceThicknessRange={[200, 900]} clearcoat={1} envMapIntensity={1.4} />;
    case "chrome":
      return <meshStandardMaterial color={shade(color, 0.7)} roughness={0.12} metalness={1} envMapIntensity={2.2} />;
  }
}

const PieceMesh: FC<{ p: Piece; i: number }> = ({ p, i }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({ frame: frame - p.enterAt, fps, config: { damping: 12, mass: 0.8, stiffness: 110 } });
  const t = frame / fps;
  // organic drift from simplex noise (seeded per piece)
  const nx = noise3D(`x${i}`, t * 0.18, 0, 0) * 0.18;
  const ny = noise3D(`y${i}`, t * 0.18, 0, 0) * 0.22;
  const nr = noise3D(`r${i}`, t * 0.12, 0, 0) * 0.35;
  const [rx, ry, rz] = p.rot ?? [0, 0, 0];
  const spin = (p.spin ?? 0.15) * t;
  const s = p.scale * Math.max(0.0001, e);
  return (
    <mesh position={[p.pos[0] + nx, p.pos[1] + ny + (1 - e) * -1.5, p.pos[2]]} rotation={[rx + nr + (1 - e) * 1.2, ry + spin, rz + nr * 0.5]} scale={[s, s, s]}>
      {geometryFor(p.kind)}
      <MaterialFor material={p.material} color={p.color} />
    </mesh>
  );
};

export const Sculpture3D: FC<{ accent: string; width: number; height: number; orbit?: number; layout?: "stack" | "orbit" }> = ({ accent, width, height, orbit = 0, layout = "stack" }) => {
  const portrait = height > width * 1.2;
  const pieces = useMemo<Piece[]>(() => {
    const a = accent;
    const b = shade(accent, -0.35);
    const c = shade(accent, 0.45);
    const spreadX = portrait ? 1.5 : 3.6;
    if (layout === "orbit") {
      return [
        { kind: "sphere", pos: [-spreadX * (portrait ? 1 : 1.15), portrait ? 1.0 : 1.1, -2], scale: 0.9, color: a, enterAt: 4, material: "gloss" },
        { kind: "torus", pos: [spreadX, portrait ? 0.9 : 1.2, -1.5], scale: 0.85, color: c, enterAt: 10, rot: [1.1, 0, 0.4], material: "iridescent" },
        { kind: "knot", pos: [spreadX * 0.9, portrait ? -2.7 : -1.9, -1], scale: 0.8, color: c, enterAt: 16, material: "chrome" },
        { kind: "capsule", pos: [-spreadX * 0.9, portrait ? -2.6 : -1.7, -0.8], scale: 0.8, color: c, enterAt: 22, rot: [0.3, 0, 0.9], material: "satin" },
        { kind: "sphere", pos: [portrait ? -0.9 : 4.6, portrait ? -3.3 : 2.2, -3], scale: 0.35, color: "#ffffff", enterAt: 28, material: "gloss" },
      ];
    }
    return [
      { kind: "slab", pos: [0.4, 0.2, -3.2], scale: portrait ? 1.7 : 2.4, color: shade(accent, -0.6), enterAt: 2, rot: [0.05, -0.25, 0.08], spin: 0.02, material: "gloss" },
      { kind: "sphere", pos: [spreadX * (portrait ? 0.95 : 1.15), portrait ? 1.7 : 0.9, -2.4], scale: portrait ? 1.0 : 1.25, color: a, enterAt: 6, material: "gloss" },
      { kind: "torus", pos: [-spreadX * (portrait ? 1 : 1.1), portrait ? 1.0 : 0.5, -2], scale: portrait ? 0.75 : 0.95, color: c, enterAt: 10, rot: [1.0, 0.2, 0.5], material: "iridescent" },
      { kind: "capsule", pos: [-spreadX * 0.7, -1.9, -0.6], scale: portrait ? 0.8 : 1.0, color: b, enterAt: 14, rot: [0.2, 0, 1.2], material: "satin" },
      { kind: "ring", pos: [0, 0.3, -4], scale: portrait ? 2.4 : 3.2, color: c, enterAt: 8, rot: [1.35, 0, 0], spin: 0.05, material: "chrome" },
      { kind: "sphere", pos: [spreadX * 0.8, -1.9, 0.2], scale: 0.42, color: c, enterAt: 20, material: "gloss" },
      { kind: "sphere", pos: [-spreadX * 1.05, -0.4, 0.4], scale: 0.22, color: "#ffffff", enterAt: 24, material: "chrome" },
    ];
  }, [accent, portrait, layout]);

  // The editor preview shows the composition scaled down, so a full-size WebGL
  // canvas would shade millions of pixels nobody sees. Match the canvas to the
  // on-screen size there; exports always render at full resolution.
  const rendering = getRemotionEnvironment().isRendering;
  // the in-browser exporter sets this so frames can be read back from the canvas
  const captureMode = Boolean((globalThis as { __MF_CAPTURE__?: boolean }).__MF_CAPTURE__);
  const scale = useCurrentScale({ dontThrowIfOutsideOfRemotion: true });
  const screenDpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const dpr = rendering || captureMode ? 1 : Math.min(1, Math.max(0.25, scale * screenDpr));

  return (
    <ThreeCanvas
      width={width}
      height={height}
      dpr={dpr}
      camera={{ fov: 32, position: [0, 0, 11] }}
      gl={{ antialias: true, preserveDrawingBuffer: rendering || captureMode, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <StudioEnv />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 6]} intensity={1.6} />
      <pointLight position={[-6, -2, 4]} intensity={40} color={accent} />
      <pointLight position={[6, 3, -2]} intensity={25} color={shade(accent, 0.5)} />
      <group rotation={[0, (orbit * Math.PI) / 180, 0]}>
        {pieces.map((p, i) => (
          <PieceMesh key={i} p={p} i={i} />
        ))}
      </group>
    </ThreeCanvas>
  );
};
