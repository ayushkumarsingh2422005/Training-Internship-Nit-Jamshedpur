"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "font-size-level";
const LEVELS = [0, 1, 2, 3] as const;
type FontLevel = (typeof LEVELS)[number];

function applyLevel(level: FontLevel) {
  document.documentElement.setAttribute("data-font-size-level", String(level));
  try {
    localStorage.setItem(STORAGE_KEY, String(level));
  } catch {
    /* ignore */
  }
}

function readStoredLevel(): FontLevel {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw !== null ? Number(raw) : 1;
    if (LEVELS.includes(parsed as FontLevel)) return parsed as FontLevel;
  } catch {
    /* ignore */
  }
  return 1;
}

export function FontSizeControls() {
  const [level, setLevel] = useState<FontLevel>(1);

  useEffect(() => {
    const stored = readStoredLevel();
    setLevel(stored);
    applyLevel(stored);
  }, []);

  const setAndApply = (next: FontLevel) => {
    setLevel(next);
    applyLevel(next);
  };

  return (
    <div className="font-size-group" role="group" aria-label="Font size">
      <button
        type="button"
        className={`font-btn${level === 0 ? " active" : ""}`}
        aria-label="Decrease font size"
        aria-pressed={level === 0}
        disabled={level === 0}
        onClick={() => setAndApply(Math.max(0, level - 1) as FontLevel)}
      >
        A-
      </button>
      <button
        type="button"
        className={`font-btn${level === 1 ? " active" : ""}`}
        aria-label="Default font size"
        aria-pressed={level === 1}
        onClick={() => setAndApply(1)}
      >
        A
      </button>
      <button
        type="button"
        className={`font-btn${level >= 2 ? " active" : ""}`}
        aria-label="Increase font size"
        aria-pressed={level >= 2}
        disabled={level === 3}
        onClick={() => setAndApply(Math.min(3, level + 1) as FontLevel)}
      >
        A+
      </button>
    </div>
  );
}
