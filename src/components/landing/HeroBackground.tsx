"use client";

import { useEffect, useRef, useState } from "react";
import { Player } from "@remotion/player";
import styles from "@/styles/resident.module.css";
import { HeroNetworkOverlay } from "@/remotion/HeroNetworkOverlay";

const FPS = 30;
const DURATION_IN_FRAMES = 450; // 15s loop
const COMP_WIDTH = 1920;
const COMP_HEIGHT = 720;

export function HeroBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cover, setCover] = useState({ left: 0, top: 0, scale: 1 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      // Mirrors CSS `background-size: cover` / `object-fit: cover`, since
      // the Player only offers aspect-ratio-preserving "contain" scaling.
      const scale = Math.max(width / COMP_WIDTH, height / COMP_HEIGHT);
      setCover({
        scale,
        left: (width - COMP_WIDTH * scale) / 2,
        top: (height - COMP_HEIGHT * scale) / 2,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={styles.heroAnimatedLayer} aria-hidden="true">
      <Player
        component={HeroNetworkOverlay}
        durationInFrames={DURATION_IN_FRAMES}
        compositionWidth={COMP_WIDTH}
        compositionHeight={COMP_HEIGHT}
        fps={FPS}
        autoPlay
        loop
        initiallyMuted
        controls={false}
        clickToPlay={false}
        doubleClickToFullscreen={false}
        spaceKeyToPlayOrPause={false}
        showVolumeControls={false}
        style={{
          position: "absolute",
          left: cover.left,
          top: cover.top,
          width: COMP_WIDTH,
          height: COMP_HEIGHT,
          transform: `scale(${cover.scale})`,
          transformOrigin: "top left",
          background: "transparent",
        }}
      />
    </div>
  );
}

export default HeroBackground;
