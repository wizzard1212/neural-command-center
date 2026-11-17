import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GlassCard } from "../ui/GlassCard";
import { fetchAccountFeed, postFeedUpdate, type Account } from "../../lib/accountsApi";

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} h`;
  return `vor ${Math.round(hours / 24)} Tagen`;
}

export function AccountFeedList({ accounts }: { accounts: Account[] }) {
  const queryClient = useQueryClient();
  const { data: events } = useQuery({ queryKey: ["account-feed"], queryFn: fetchAccountFeed });
  const [text, setText] = useState("");
  const accountsById = new Map(accounts.map((a) => [a.id, a]));

  const post = useMutation({
    mutationFn: () => postFeedUpdate(text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-feed"] });
      setText("");
    },
  });

  return (
    <GlassCard title="Account-Feed">
      <div className="flex gap-2 mb-3">
        <input
          placeholder='z. B. "Support-Antwort von FTMO: Copier erlaubt"'
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && text && post.mutate()}
          className="flex-1 bg-bg2 border border-line rounded-lg px-2.5 py-1.5 text-sm text-text"
        />
        <button
          onClick={() => post.mutate()}
          disabled={!text || post.isPending}
          className="rounded-lg border border-cyan/30 px-3 py-1.5 text-xs text-cyan disabled:opacity-50"
        >
          Posten
        </button>
      </div>

      <ul className="flex flex-col gap-2 max-h-72 overflow-y-auto">
        {(events ?? []).map((e) => {
          const account = e.accountId ? accountsById.get(e.accountId) : null;
          return (
            <li key={e.id} className="text-sm border-l-2 border-line pl-3">
              <div className="text-text">{e.text}</div>
              <div className="text-text-faint text-xs">
                {account ? `${account.firm} ${account.program} · ` : ""}
                {timeAgo(e.ts)}
              </div>
            </li>
          );
        })}
        {events?.length === 0 && <p className="text-text-faint text-sm">Noch keine Ereignisse.</p>}
      </ul>
    </GlassCard>
  );
}
