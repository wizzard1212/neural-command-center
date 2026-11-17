// Design-Tokens aus SPEC.md Abschnitt 15. Niemals Pink/Magenta (Hue ~300-345°) hinzufügen.
export const colorTokens = {
  bg0: "#05070C",
  bg1: "#07090F",
  bg2: "#0A0D16",
  bg3: "#0D1120",
  line: "#1B2740",
  text: "#C9D6E8",
  textMuted: "#6B7A94",
  textFaint: "#45526B",
  cyan: "#00D4FF",
  ice: "#7DF9FF",
  green: "#00FF9D",
  red: "#FF5A5A",
  violet: "#A855F7",
  violetLight: "#C084FC",
  gold: "#FFD166",
  orange: "#FF7A1A",
  orangeLight: "#FFA04D",
  white: "#FFFFFF",
} as const;

export type AreaKey =
  | "trading"
  | "firma"
  | "modeln"
  | "ideen_business"
  | "clipping"
  | "fundament"
  | "ideen_start"
  | "dashboard_daten";

// Gehirn-Regionen aus Abschnitt 4.1 (Vault-Ordner/Tag -> Farbe + Region)
export const brainRegions: Record<
  AreaKey,
  { color: string; region: string; folders: string[] }
> = {
  trading: { color: colorTokens.green, region: "stirnlappen", folders: ["01", "Trading"] },
  firma: { color: colorTokens.cyan, region: "scheitel", folders: ["03", "Firma"] },
  modeln: { color: colorTokens.orange, region: "schlaefe", folders: ["07", "Modeln"] },
  ideen_business: {
    color: colorTokens.violet,
    region: "hinterkopf",
    folders: ["02", "08", "09", "11"],
  },
  clipping: { color: colorTokens.ice, region: "kleinhirn", folders: ["10", "Clipping"] },
  fundament: { color: colorTokens.gold, region: "hirnstamm", folders: ["04", "05", "06"] },
  ideen_start: { color: colorTokens.white, region: "zentrum", folders: [] },
  dashboard_daten: { color: colorTokens.green, region: "impulse", folders: ["Dashboard"] },
};

export function resolveAreaForPath(path: string): AreaKey {
  const normalized = path.replace(/\\/g, "/");
  const topFolder = normalized.split("/")[0] ?? "";
  for (const [area, def] of Object.entries(brainRegions) as [AreaKey, typeof brainRegions[AreaKey]][]) {
    if (def.folders.some((f) => topFolder === f || topFolder.startsWith(`${f} `))) {
      return area;
    }
  }
  return "ideen_start";
}
