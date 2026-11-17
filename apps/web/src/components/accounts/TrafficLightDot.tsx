import clsx from "clsx";
import type { TrafficLight } from "../../lib/accountsApi";

const COLOR_CLASS: Record<string, string> = {
  green: "bg-green",
  yellow: "bg-orange",
  red: "bg-red",
};

export function TrafficLightDot({ light, size = "md" }: { light: TrafficLight; size?: "sm" | "md" }) {
  return (
    <span
      className={clsx(
        "rounded-full inline-block",
        size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3",
        COLOR_CLASS[light.color],
        light.pulsing && "animate-pulse-red",
      )}
    />
  );
}
