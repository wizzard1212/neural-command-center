import { GlassCard } from "./GlassCard";

export function PagePlaceholder({ title, phaseNote }: { title: string; phaseNote: string }) {
  return (
    <div className="h-full flex flex-col gap-4">
      <h1 className="font-heading text-xl text-text">{title}</h1>
      <GlassCard className="flex-1 flex items-center justify-center">
        <p className="text-text-faint text-sm max-w-md text-center">{phaseNote}</p>
      </GlassCard>
    </div>
  );
}
