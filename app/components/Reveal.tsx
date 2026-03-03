"use client";

import { useEffect, useRef, useState } from "react";

export default function Reveal({
  children,
  delayMs = 0,
  durationMs = 900,
  distance = 12,
  once = true,
}: {
  children: React.ReactNode;
  delayMs?: number;
  durationMs?: number;
  distance?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setVisible(false);
        }
      },
      {
        threshold: 0.15,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      className={visible ? "ipc-reveal ipc-reveal-in" : "ipc-reveal"}
      style={{
        transitionDelay: `${delayMs}ms`,
        transitionDuration: `${durationMs}ms`,
        transform: visible
          ? "translate3d(0, 0, 0)"
          : `translate3d(0, ${distance}px, 0)`,
      }}
    >
      {children}
    </div>
  );
}