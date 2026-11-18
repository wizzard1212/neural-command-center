import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useVaultStore } from "../store/useVaultStore";
import { useLiveStreamStore } from "../store/useLiveStreamStore";

const WS_URL = "ws://127.0.0.1:4000/ws";
const RECONNECT_DELAY_MS = 2000;

/** Ein einziger WebSocket für alle Live-Ereignisse der App (Vault, Trades,
 * Konten, News, ...), siehe Abschnitt 3: "Live-Strom, ein durchlaufender Feed
 * mit allem, was gerade passiert". */
export function useVaultWs() {
  const queryClient = useQueryClient();
  const pushVaultEvent = useVaultStore((s) => s.pushEvent);
  const pushLiveStream = useLiveStreamStore((s) => s.push);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let cancelled = false;

    const connect = () => {
      socket = new WebSocket(WS_URL);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);

          switch (data.type) {
            case "vault:changed": {
              pushVaultEvent({ path: data.path, kind: data.kind, ts: Date.now() });
              queryClient.invalidateQueries({ queryKey: ["vault", "graph"] });
              queryClient.invalidateQueries({ queryKey: ["vault", "stats"] });
              pushLiveStream({
                kind: "vault",
                label: data.path.split("/").pop(),
                detail: data.kind === "created" ? "Neue Notiz" : data.kind === "deleted" ? "Gelöscht" : "Geändert",
              });
              break;
            }
            case "trade:new": {
              queryClient.invalidateQueries({ queryKey: ["trades"] });
              pushLiveStream({ kind: "trade", label: "Neuer Trade erfasst" });
              break;
            }
            case "account:rule_violation": {
              queryClient.invalidateQueries({ queryKey: ["accounts"] });
              pushLiveStream({ kind: "account", label: "Regelwarnung", detail: data.message });
              break;
            }
            case "news:new": {
              queryClient.invalidateQueries({ queryKey: ["news"] });
              pushLiveStream({ kind: "news", label: "Wichtige News", detail: `Relevanz ${data.relevance}/5` });
              break;
            }
            case "briefing:done": {
              queryClient.invalidateQueries({ queryKey: ["briefing"] });
              pushLiveStream({ kind: "briefing", label: "Morgen-Briefing fertig" });
              break;
            }
          }
        } catch {
          // Ignoriere nicht-JSON-Nachrichten
        }
      };

      socket.onclose = () => {
        if (!cancelled) {
          timerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      socket?.close();
    };
  }, [queryClient, pushVaultEvent, pushLiveStream]);
}
