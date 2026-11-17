import { GlassCard } from "../components/ui/GlassCard";

export function ZentralePage() {
  return (
    <div className="flex flex-col gap-4 h-full">
      <GlassCard className="flex-1 min-h-[420px] flex items-center justify-center">
        <div className="text-center text-text-faint">
          <p className="font-heading text-lg text-text-muted">Gehirn</p>
          <p className="text-sm max-w-sm mx-auto mt-1">
            Das 3D-Neuronen-Netz aus deinem Obsidian-Vault kommt in Phase 2 (Vault-Parser + three.js).
          </p>
        </div>
      </GlassCard>

      <div className="grid grid-cols-12 gap-4">
        <GlassCard className="col-span-12 lg:col-span-5" title="Morgen-Briefing">
          <p className="text-text-faint text-sm">Kommt in Phase 6 – täglich 07:30 Europe/Berlin.</p>
        </GlassCard>

        <GlassCard className="col-span-12 lg:col-span-4" title="Konten-Übersicht">
          <p className="text-text-faint text-sm">Kommt in Phase 3 (Konten, Ampel, Ziel 1,1 Mio $).</p>
        </GlassCard>

        <GlassCard className="col-span-12 lg:col-span-3" title="Heute wichtig">
          <p className="text-text-faint text-sm">Kommt in Phase 9 (Kalender & Kein-Trade-Fenster).</p>
        </GlassCard>

        <GlassCard className="col-span-12 lg:col-span-4" title="Top-Trends">
          <p className="text-text-faint text-sm">Kommt in Phase 7 (Social-Feed, Hype-Radar).</p>
        </GlassCard>

        <GlassCard className="col-span-12 lg:col-span-4" title="Offene To-dos aus dem Vault">
          <p className="text-text-faint text-sm">Kommt in Phase 2 (Vault-Parser, offene Checkboxen).</p>
        </GlassCard>

        <GlassCard className="col-span-12 lg:col-span-4" title="Gehirn-Statistik">
          <p className="text-text-faint text-sm">Kommt in Phase 2 (Notizen, Links, aktivste Region).</p>
        </GlassCard>
      </div>
    </div>
  );
}
