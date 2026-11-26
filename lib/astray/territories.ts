// The territories a question can belong to. The AI tags every question with one, so the hole
// can learn which ones you keep choosing. Each has a fixed direction on a compass around the
// tunnel: your habits dent the walls on their side, and rejected questions fly back there.
export const TERRITORIES = [
  "science",
  "nature",
  "space",
  "body",
  "mind",
  "people",
  "society",
  "history",
  "money",
  "technology",
  "language",
  "art",
  "everyday",
  "myth",
] as const;

export type Territory = (typeof TERRITORIES)[number];

export function isTerritory(value: string): value is Territory {
  return (TERRITORIES as readonly string[]).includes(value);
}

/** Compass direction (radians) for a territory around the tunnel. */
export function territoryAngle(t: Territory): number {
  return (TERRITORIES.indexOf(t) / TERRITORIES.length) * Math.PI * 2 - Math.PI / 2;
}

// Style: the *kind* of question, separate from its topic. Habits live here as much as in
// topics (always the playful ones, always the small personal ones), so Astray pushes on both.
export const STYLE_AXES = {
  tone: ["playful", "serious"],
  scale: ["small", "vast"],
  lens: ["concrete", "abstract"],
  focus: ["personal", "worldly"],
} as const;

export type StyleAxis = keyof typeof STYLE_AXES;
export type StyleValue = (typeof STYLE_AXES)[StyleAxis][number];
export type Style = { [A in StyleAxis]?: (typeof STYLE_AXES)[A][number] };

export const STYLE_VALUES = Object.values(STYLE_AXES).flat() as StyleValue[];

/** Read "serious, vast, abstract, worldly" (any order, any extras ignored) into a Style. */
export function parseStyle(raw: string): Style | undefined {
  const style: Style = {};
  for (const word of raw.toLowerCase().split(/[\s,;/|]+/)) {
    for (const [axis, values] of Object.entries(STYLE_AXES) as [StyleAxis, readonly string[]][]) {
      if (values.includes(word)) (style as Record<string, string>)[axis] = word;
    }
  }
  return Object.keys(style).length ? style : undefined;
}

export function styleValues(style?: Style): StyleValue[] {
  return style ? (Object.values(style) as StyleValue[]) : [];
}

/** The other end of an axis: playful ↔ serious and so on. */
export function opposite(value: StyleValue): StyleValue {
  for (const values of Object.values(STYLE_AXES) as readonly (readonly StyleValue[])[]) {
    const i = values.indexOf(value);
    if (i !== -1) return values[1 - i];
  }
  return value;
}
