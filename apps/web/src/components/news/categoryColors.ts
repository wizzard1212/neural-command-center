export const CATEGORY_COLORS: Record<string, string> = {
  Zentralbank: "#FFD166", // gold
  Makrodaten: "#00D4FF", // cyan
  Geopolitik: "#FF5A5A", // rot
  Unternehmen: "#A855F7", // violett
  Krypto: "#00FF9D", // grün
  Regulierung: "#FF7A1A", // orange
};

export function categoryColor(category: string | null): string {
  return category ? (CATEGORY_COLORS[category] ?? "#6B7A94") : "#45526B";
}
