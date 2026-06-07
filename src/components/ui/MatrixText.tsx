"use client";

import { useState, useEffect, useRef } from "react";
import type { MatrixTextProps } from "@/types/ui";

const COLOR_CLASSES = {
  cyan: "glow-text-cyan",
  green: "glow-text-green",
  purple: "glow-text-purple",
  pink: "glow-text-cyan",
  amber: "glow-text-amber",
  white: "glow-text-white",
} as const;

/**
 * Matrix-style character-by-character typing animation.
 */
export default function MatrixText({
  text,
  speed = 8,
  color = "green",
  className = "",
  continuous = false,
  onComplete,
  disabledAnimation = false,
}: MatrixTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const indexRef = useRef(0);
  const textRef = useRef(text);

  useEffect(() => {
    if (disabledAnimation) {
      setDisplayedText(text);
      setShowCursor(false);
      onComplete?.();
      return;
    }

    textRef.current = text;
    indexRef.current = 0;
    setDisplayedText("");
    setShowCursor(true);

    const timer = setInterval(() => {
      if (indexRef.current < textRef.current.length) {
        setDisplayedText(textRef.current.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        clearInterval(timer);
        if (!continuous) {
          setTimeout(() => setShowCursor(false), 2000);
        }
        onComplete?.();

        if (continuous) {
          setTimeout(() => {
            indexRef.current = 0;
            setDisplayedText("");
          }, 1500);
        }
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, continuous, onComplete, disabledAnimation]);

  return (
    <span className={`matrix-text ${COLOR_CLASSES[color]} ${className}`}>
      {displayedText}
      {showCursor && <span className="matrix-cursor" />}
    </span>
  );
}
