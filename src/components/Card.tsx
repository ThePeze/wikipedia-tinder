import React, { useEffect, useRef, useState, type ReactNode } from "react";

type CardProps = {
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  firstLinkTitle: string | null;
  children?: ReactNode;

  onLeftSwipe: () => void;
  onRightSwipe: () => void;

  mode: "rabbithole" | "speedrun";
  isLocked?: boolean;
};

export default function Card({
  title,
  setTitle,
  firstLinkTitle,
  children,
  onLeftSwipe,
  onRightSwipe,
  mode,
  isLocked,
}: CardProps) {
  const SWIPE_THRESHOLD = 180;
  const MAX_X = 320;
  const MAX_Y = 80;

  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [rot, setRot] = useState(0);
  const [dragging, setDragging] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);

  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

  const reset = () => {
    setX(0);
    setY(0);
    setRot(0);
  };

  const animateSwipe = (dir: "left" | "right") => {
    if (isLocked) return;
    setDragging(false);

    const targetX = dir === "right" ? SWIPE_THRESHOLD + 40 : -(SWIPE_THRESHOLD + 40);
    setX(targetX);
    setY(0);
    setRot(clamp(targetX / 25, -12, 12));

    window.setTimeout(() => {
      if (dir === "right") {
        // Rabbithole direct redirect like your original behavior
        if (mode === "rabbithole" && firstLinkTitle) {
          setTitle(firstLinkTitle);
        }
        onRightSwipe();
      } else {
        onLeftSwipe();
      }
      reset();
    }, 160);
  };

  // Arrow keys
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isLocked) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        animateSwipe("left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        animateSwipe("right");
      }
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLocked, mode, firstLinkTitle]);

  return (
    <div
      style={{
        width: "min(420px, 92vw)",
        aspectRatio: "9 / 16",
        background: "white",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
        display: "flex",
        flexDirection: "column",
        transform: `translateX(${x}px) translateY(${y}px) rotate(${rot}deg)`,
        transition: dragging ? "none" : "transform 160ms ease",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <div
        style={{
          padding: 12,
          borderBottom: "1px solid #eee",
          fontWeight: 600,
        }}
        onPointerDown={(e) => {
          if (isLocked) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          startX.current = e.clientX;
          startY.current = e.clientY;
          reset();
        }}
        onPointerMove={(e) => {
          if (!dragging || isLocked) return;
          const dx = e.clientX - startX.current;
          const dy = e.clientY - startY.current;

          const clampedX = clamp(dx, -MAX_X, MAX_X);
          const clampedY = clamp(dy * 0.08, -MAX_Y, MAX_Y);

          setX(clampedX);
          setY(clampedY);
          setRot(clamp(clampedX / 25, -12, 12));
        }}
        onPointerUp={(e) => {
          if (isLocked) return;
          setDragging(false);
          const dx = e.clientX - startX.current;

          if (dx > SWIPE_THRESHOLD) animateSwipe("right");
          else if (dx < -SWIPE_THRESHOLD) animateSwipe("left");
          else reset();
        }}
        onPointerCancel={() => {
          setDragging(false);
          reset();
        }}
      >
        {title.replaceAll("_", " ")}
      </div>

      <div style={{ padding: 12, overflow: "auto" }}>
        <div style={{ lineHeight: 1.5, fontSize: "0.95rem" }}>{children}</div>
      </div>
    </div>
  );
}