"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { useMemo, useState } from "react";
import Avatar from "./Avatar";
import type { ConversationOut, UserOut } from "@/lib/types";

function conversationDisplay(conv: ConversationOut, currentUserId: string) {
  if (conv.is_group) {
    return { name: conv.name || "Group", color: conv.avatar_color };
  }
  const other = conv.participants.find((p) => p.user.id !== currentUserId)?.user;
  return { name: other?.display_name || "Unknown", color: other?.avatar_color || "#2C6BED", other };
}

export default function ConversationList({
  conversations,
  currentUser,
  activeId,
  onSelect,
  onNewChat,
  onNewGroup,
  onLogout,
}: {
  conversations: ConversationOut[];
  currentUser: UserOut;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onLogout: () => void;
}) {
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter((c) => {
      const { name } = conversationDisplay(c, currentUser.id);
      return name.toLowerCase().includes(q);
    });
  }, [conversations, query, currentUser.id]);

  return (
    <div className="flex h-full w-full flex-col border-r border-signal-border bg-signal-bg-secondary md:w-[380px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setMenuOpen((v) => !v)} className="relative">
            <Avatar name={currentUser.display_name} color={currentUser.avatar_color} size={38} />
          </button>
          <h1 className="text-lg font-semibold text-signal-text-primary">Chats</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewGroup}
            title="New group"
            className="flex h-9 w-9 items-center justify-center rounded-full text-signal-text-secondary transition hover:bg-signal-bg-hover"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path
                d="M17 20c0-2.76-2.24-5-5-5s-5 2.24-5 5M12 12a4 4 0 100-8 4 4 0 000 8zM21 20c0-2.17-1.4-4-3.5-4.65M16.5 11.35A3.5 3.5 0 1015 4.6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            onClick={onNewChat}
            title="New chat"
            className="flex h-9 w-9 items-center justify-center rounded-full text-signal-text-secondary transition hover:bg-signal-bg-hover"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 20c4.42 0 8-3.58 8-8a8 8 0 10-8 8zM8 12h7M12 8v8"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mx-4 mb-2 rounded-lg border border-signal-border bg-signal-bg-tertiary p-2">
          <p className="px-2 py-1 text-sm font-medium text-signal-text-primary">
            {currentUser.display_name}
          </p>
          <p className="px-2 pb-1 text-xs text-signal-text-muted">@{currentUser.username}</p>
          <button
            onClick={onLogout}
            className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-sm text-red-400 hover:bg-signal-bg-hover"
          >
            Sign out
          </button>
        </div>
      )}

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 rounded-lg bg-signal-bg-tertiary px-3 py-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-signal-text-muted">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-sm text-signal-text-primary placeholder:text-signal-text-muted focus:outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
            <p className="text-sm text-signal-text-muted">
              {conversations.length === 0
                ? "No conversations yet. Start a new chat!"
                : "No results found"}
            </p>
          </div>
        )}
        {filtered.map((conv) => {
          const { name, color, other } = conversationDisplay(conv, currentUser.id) as {
            name: string;
            color: string;
            other?: UserOut;
          };
          const isActive = conv.id === activeId;
          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                isActive ? "bg-signal-blue/15" : "hover:bg-signal-bg-hover"
              }`}
            >
              <Avatar
                name={name}
                color={color}
                size={48}
                isGroup={conv.is_group}
                online={conv.is_group ? undefined : other?.is_online}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[15px] font-medium text-signal-text-primary">
                    {name}
                  </p>
                  <span className="shrink-0 text-xs text-signal-text-muted">
                    {formatDistanceToNowStrict(new Date(conv.last_message_at), {
                      addSuffix: false,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm text-signal-text-secondary">
                    {conv.last_message_preview || "No messages yet"}
                  </p>
                  {conv.unread_count > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-signal-blue px-1.5 text-[11px] font-semibold text-white">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
