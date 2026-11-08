// Totality duration classes, one per whole minute, shared by the map's fill and its legend

import { theme } from "./theme.js";

type PathFillToken = Extract<keyof typeof theme, `--color-path-fill-${number}`>;

export type DurationClass = {
  // The class runs from here up to the next class's start; the last one is open-ended
  startSeconds: number;
  colorToken: PathFillToken;
};

// Each class of totality spans a whole minute
export const CLASS_SECONDS = 60;

// One colour per class, from under 1 min to 6 min and over
const CLASS_COLOR_TOKENS: PathFillToken[] = [
  "--color-path-fill-0",
  "--color-path-fill-1",
  "--color-path-fill-2",
  "--color-path-fill-3",
  "--color-path-fill-4",
  "--color-path-fill-5",
  "--color-path-fill-6",
];

// The classes in order, starting at 0 s, 60 s, … up to the last, open-ended class
export const DURATION_CLASSES: DurationClass[] = CLASS_COLOR_TOKENS.map((colorToken, i) => ({
  startSeconds: i * CLASS_SECONDS,
  colorToken,
}));
