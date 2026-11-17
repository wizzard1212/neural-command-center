import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import type { WsEvent } from "@ncc/shared";

const clients = new Set<WebSocket>();

export function broadcast(event: WsEvent) {
  const payload = JSON.stringify(event);
  for (const socket of clients) {
    if (socket.readyState === socket.OPEN) socket.send(payload);
  }
}

export async function registerWs(app: FastifyInstance) {
  app.get("/ws", { websocket: true }, (socket) => {
    clients.add(socket);
    socket.on("close", () => clients.delete(socket));
  });
}
