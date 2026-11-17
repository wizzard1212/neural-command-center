import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useVaultStore } from "../store/useVaultStore";

const WS_URL = "ws://127.0.0.1:4000/ws";
const RECONNECT_DELAY_MS = 2000;

export function useVaultWs() {
  const queryClient = useQueryClient();
  const pushEvent = useVaultStore((s) => s.pushEvent);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let cancelled = false;

    const connect = () => {
      socket = new WebSocket(WS_URL);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          if (data.type === "vault:changed") {
            pushEvent({ path: data.path, kind: data.kind, ts: Date.now() });
            queryClient.invalidateQueries({ queryKey: ["vault", "graph"] });
            queryClient.invalidateQueries({ queryKey: ["vault", "stats"] });
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
  }, [queryClient, pushEvent]);
}
