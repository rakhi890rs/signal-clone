"use client";

import { useEffect, useState } from "react";
import Avatar from "./Avatar";
import { api } from "@/lib/api";
import type { ContactOut, UserOut } from "@/lib/types";

export default function NewChatModal({
  onClose,
  onStartChat,
}: {
  onClose: () => void;
  onStartChat: (userId: string) => void;
}) {
  const [contacts, setContacts] = useState<ContactOut[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listContacts().then(setContacts).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (query.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.searchUsers(query.trim()).then(setSearchResults).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  async function addByUsername() {
    setError(null);
    try {
      const contact = await api.addContact(query.trim());
      setContacts((c) => [...c, contact]);
      setQuery("");
      onStartChat(contact.user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add contact");
    }
  }

  const contactIds = new Set(contacts.map((c) => c.user.id));
  const extraResults = searchResults.filter((u) => !contactIds.has(u.id));
  const filteredContacts = contacts.filter((c) =>
    c.user.display_name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-signal-border bg-signal-bg-secondary shadow-xl">
        <div className="flex items-center justify-between border-b border-signal-border px-5 py-4">
          <h2 className="text-lg font-semibold text-signal-text-primary">New chat</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-signal-text-secondary hover:bg-signal-bg-hover"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or name"
            className="w-full rounded-lg border border-signal-border bg-signal-bg-tertiary px-3.5 py-2.5 text-sm text-signal-text-primary placeholder:text-signal-text-muted focus:border-signal-blue focus:outline-none"
          />
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {loading && <p className="px-3 py-2 text-sm text-signal-text-muted">Loading…</p>}

          {!loading && filteredContacts.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase text-signal-text-muted">
                Contacts
              </p>
              {filteredContacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onStartChat(c.user.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-signal-bg-hover"
                >
                  <Avatar name={c.user.display_name} color={c.user.avatar_color} size={40} online={c.user.is_online} />
                  <div>
                    <p className="text-sm font-medium text-signal-text-primary">
                      {c.nickname || c.user.display_name}
                    </p>
                    <p className="text-xs text-signal-text-muted">@{c.user.username}</p>
                  </div>
                </button>
              ))}
            </>
          )}

          {extraResults.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase text-signal-text-muted">
                Other users
              </p>
              {extraResults.map((u) => (
                <div
                  key={u.id}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-signal-bg-hover"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={u.display_name} color={u.avatar_color} size={40} online={u.is_online} />
                    <div>
                      <p className="text-sm font-medium text-signal-text-primary">{u.display_name}</p>
                      <p className="text-xs text-signal-text-muted">@{u.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const contact = await api.addContact(u.username);
                      setContacts((c) => [...c, contact]);
                      onStartChat(u.id);
                    }}
                    className="rounded-md bg-signal-blue px-2.5 py-1 text-xs font-medium text-white hover:bg-signal-blue-dark"
                  >
                    Add
                  </button>
                </div>
              ))}
            </>
          )}

          {!loading &&
            query.trim() &&
            filteredContacts.length === 0 &&
            extraResults.length === 0 && (
              <div className="px-3 py-6 text-center">
                <p className="text-sm text-signal-text-muted">No users found for &quot;{query}&quot;</p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
