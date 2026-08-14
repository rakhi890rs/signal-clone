"use client";

import { useEffect, useState } from "react";
import Avatar from "./Avatar";
import { api } from "@/lib/api";
import type { ContactOut } from "@/lib/types";

export default function NewGroupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}) {
  const [step, setStep] = useState<"members" | "name">("members");
  const [contacts, setContacts] = useState<ContactOut[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listContacts().then(setContacts);
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createGroup() {
    if (!groupName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const conv = await api.createConversation({
        is_group: true,
        name: groupName.trim(),
        participant_ids: Array.from(selected),
      });
      onCreated(conv.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-signal-border bg-signal-bg-secondary shadow-xl">
        <div className="flex items-center justify-between border-b border-signal-border px-5 py-4">
          <h2 className="text-lg font-semibold text-signal-text-primary">
            {step === "members" ? "New group" : "Name your group"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-signal-text-secondary hover:bg-signal-bg-hover"
          >
            ✕
          </button>
        </div>

        {step === "members" && (
          <>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {contacts.length === 0 && (
                <p className="px-3 py-4 text-sm text-signal-text-muted">
                  Add some contacts first to start a group.
                </p>
              )}
              {contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggle(c.user.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-signal-bg-hover"
                >
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      selected.has(c.user.id)
                        ? "border-signal-blue bg-signal-blue"
                        : "border-signal-text-muted"
                    }`}
                  >
                    {selected.has(c.user.id) && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M4 12l6 6L20 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <Avatar name={c.user.display_name} color={c.user.avatar_color} size={38} />
                  <p className="text-sm font-medium text-signal-text-primary">
                    {c.nickname || c.user.display_name}
                  </p>
                </button>
              ))}
            </div>
            <div className="border-t border-signal-border px-5 py-3">
              <button
                disabled={selected.size === 0}
                onClick={() => setStep("name")}
                className="w-full rounded-lg bg-signal-blue py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next ({selected.size} selected)
              </button>
            </div>
          </>
        )}

        {step === "name" && (
          <div className="flex flex-1 flex-col gap-4 px-5 py-4">
            <input
              autoFocus
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name"
              className="w-full rounded-lg border border-signal-border bg-signal-bg-tertiary px-3.5 py-2.5 text-sm text-signal-text-primary placeholder:text-signal-text-muted focus:border-signal-blue focus:outline-none"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setStep("members")}
                className="flex-1 rounded-lg border border-signal-border py-2.5 text-sm font-medium text-signal-text-primary hover:bg-signal-bg-hover"
              >
                Back
              </button>
              <button
                onClick={createGroup}
                disabled={busy || !groupName.trim()}
                className="flex-1 rounded-lg bg-signal-blue py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Creating…" : "Create group"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
