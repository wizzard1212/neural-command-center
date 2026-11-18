import { API_BASE } from "./api";

export interface AskBrainResponse {
  answer: string;
  sources: { path: string; title: string }[];
}

export async function askBrain(question: string): Promise<AskBrainResponse> {
  const res = await fetch(`${API_BASE}/brain/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error((body as { message?: string })?.message ?? `API-Fehler ${res.status}`);
  }
  return res.json() as Promise<AskBrainResponse>;
}
