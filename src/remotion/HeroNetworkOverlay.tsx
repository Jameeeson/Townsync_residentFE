import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

type Node = { x: number; y: number };

const NODES: Node[] = [
  { x: 18, y: 44 },
  { x: 34, y: 30 },
  { x: 50, y: 22 },
  { x: 66, y: 34 },
  { x: 82, y: 46 },
];

const LINKS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [1, 3],
];

const SWEEP_PERIOD = 150; // frames per sweep cycle (5s at 30fps)

export const HeroNetworkOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  const loopT = frame / durationInFrames;

  const vignette = 0.14 + 0.05 * Math.sin(2 * Math.PI * loopT);

  const sweepFrame = frame % SWEEP_PERIOD;
  const sweepX = interpolate(sweepFrame, [0, SWEEP_PERIOD * 0.55, SWEEP_PERIOD], [-40, 140, 140], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });
  const sweepOpacity = interpolate(
    sweepFrame,
    [0, SWEEP_PERIOD * 0.12, SWEEP_PERIOD * 0.45, SWEEP_PERIOD * 0.55],
    [0, 0.22, 0.1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ mixBlendMode: "screen" }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
      >
        {LINKS.map(([a, b], i) => {
          const from = NODES[a];
          const to = NODES[b];
          const flow = -((frame * 2.2 + i * 40) % 32);
          return (
            <line
              key={`${a}-${b}`}
              x1={(from.x / 100) * width}
              y1={(from.y / 100) * height}
              x2={(to.x / 100) * width}
              y2={(to.y / 100) * height}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={1.5}
              strokeDasharray="5 11"
              strokeDashoffset={flow}
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      {NODES.map((node, i) => {
        const phase = i * 1.1;
        const pulse = 1 + 0.18 * Math.sin(2 * Math.PI * (loopT * 3 + phase));
        const glowOpacity = 0.45 + 0.25 * Math.sin(2 * Math.PI * (loopT * 3 + phase));

        return (
          <div
            key={`${node.x}-${node.y}`}
            style={{
              position: "absolute",
              left: `${node.x}%`,
              top: `${node.y}%`,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.95)",
              boxShadow: `0 0 22px 7px rgba(255,255,255,${glowOpacity})`,
              scale: pulse,
              translate: "-50% -50%",
            }}
          />
        );
      })}

      <div
        style={{
          position: "absolute",
          inset: "-20% -60%",
          background:
            "linear-gradient(115deg, transparent 42%, rgba(255,255,255,0.9) 50%, transparent 58%)",
          translate: `${sweepX}% 0`,
          opacity: sweepOpacity,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(3,8,20,1) 100%)",
          opacity: vignette,
        }}
      />
    </AbsoluteFill>
  );
};

export default HeroNetworkOverlay;
