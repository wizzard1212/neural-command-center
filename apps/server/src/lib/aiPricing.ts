// Grobe Kostenschätzung für die KI-Kostenübersicht (Abschnitt 14: "Kosten-Logging").
// Preise ändern sich – das hier ist nur eine Annäherung, keine Abrechnungsgrundlage.
// Vor produktivem Einsatz auf https://www.anthropic.com/pricing prüfen.
interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

const PRICING_BY_PREFIX: [prefix: string, pricing: ModelPricing][] = [
  ["claude-opus", { inputPerMillion: 15, outputPerMillion: 75 }],
  ["claude-sonnet", { inputPerMillion: 3, outputPerMillion: 15 }],
  ["claude-haiku", { inputPerMillion: 0.8, outputPerMillion: 4 }],
];

const FALLBACK_PRICING: ModelPricing = { inputPerMillion: 3, outputPerMillion: 15 };

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING_BY_PREFIX.find(([prefix]) => model.includes(prefix))?.[1] ?? FALLBACK_PRICING;
  return (inputTokens / 1_000_000) * pricing.inputPerMillion + (outputTokens / 1_000_000) * pricing.outputPerMillion;
}
