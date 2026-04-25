export type AccentPreset = {
  id: string;
  label: string;
  accent: string;
  accentDeep: string;
  accentCyan: string;
};

export const ACCENTS: AccentPreset[] = [
  {
    id: "violet",
    label: "Violet",
    accent: "#8b5cf6",
    accentDeep: "#7c3aed",
    accentCyan: "#22d3ee",
  },
  {
    id: "aqua",
    label: "Aqua",
    accent: "#06b6d4",
    accentDeep: "#0891b2",
    accentCyan: "#67e8f9",
  },
  {
    id: "rose",
    label: "Rose",
    accent: "#f43f5e",
    accentDeep: "#be123c",
    accentCyan: "#fda4af",
  },
  {
    id: "mint",
    label: "Mint",
    accent: "#10b981",
    accentDeep: "#047857",
    accentCyan: "#6ee7b7",
  },
  {
    id: "amber",
    label: "Amber",
    accent: "#f59e0b",
    accentDeep: "#d97706",
    accentCyan: "#fde047",
  },
];

export const DEFAULT_ACCENT_ID = ACCENTS[0].id;
export const ACCENT_STORAGE_KEY = "doppel:accent";
