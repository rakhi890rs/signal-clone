"use client";

import { useEffect, useRef, useState } from "react";
import { format, isSameDay } from "date-fns";
import Avatar from "./Avatar";
import MessageBubble from "./MessageBubble";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/websocket";
import type { ConversationOut, MessageOut, UserOut } from "@/lib/types";

function conversationDisplay(conv: ConversationOut, currentUserId: string) {
  if (conv.is_group) {
    return { name: conv.name || "Group", color: conv.avatar_color, other: undefined };
  }
  const other = conv.participants.find((p) => p.user.id !== currentUserId)?.user;
  return { name: other?.display_name || "Unknown", color: other?.avatar_color || "#2C6BED", other };
}

export default function ChatPane({
  conversation,
  currentUser,
  onOpenInfo,
  onBack,
}: {
  conversation: ConversationOut;
  currentUser: UserOut;
  onOpenInfo: () => void;
  onBack?: () => void;
}) {
  const [messages, setMessages] = useState<MessageOut[]>([]);
  const [draft, setDraft] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasTypingRef = useRef(false);

  const { name, color, other } = conversationDisplay(conversation, currentUser.id);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    api
      .getMessages(conversation.id)
      .then(setMessages)
      .finally(() => setLoading(false));
    api.markRead(conversation.id).catch(() => {});
  }, [conversation.id]);

  useEffect(() => {
    const unsub = wsClient.subscribe((event) => {
      if (event.type === "new_message" && event.message.conversation_id === conversation.id) {
        setMessages((prev) =>
          prev.some((m) => m.id === event.message.id) ? prev : [...prev, event.message]
        );
        if (event.message.sender_id !== currentUser.id) {
          api.markRead(conversation.id).catch(() => {});
        }
      }
      if (event.type === "typing" && event.conversation_id === conversation.id) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          if (event.is_typing) next.add(event.user_id);
          else next.delete(event.user_id);
          return next;
        });
      }
      if (event.type === "messages_read" && event.conversation_id === conversation.id) {
        setMessages((prev) =>
          prev.map((m) =>
            event.message_ids.includes(m.id)
              ? {
                  ...m,
                  statuses: m.statuses.map((s) =>
                    s.user_id === event.reader_id ? { ...s, status: "read" } : s
                  ),
                }
              : m
          )
        );
      }
    });
    return unsub;
  }, [conversation.id, currentUser.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleTypingChange(value: string) {
    setDraft(value);
    if (value && !wasTypingRef.current) {
      wasTypingRef.current = true;
      wsClient.send({ type: "typing", conversation_id: conversation.id, is_typing: true });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      wasTypingRef.current = false;
      wsClient.send({ type: "typing", conversation_id: conversation.id, is_typing: false });
    }, 1500);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    wasTypingRef.current = false;
    wsClient.send({ type: "typing", conversation_id: conversation.id, is_typing: false });

    const optimistic: MessageOut = {
      id: `optimistic-${Date.now()}`,
      conversation_id: conversation.id,
      sender_id: currentUser.id,
      content,
      message_type: "text",
      reply_to_id: null,
      created_at: new Date().toISOString(),
      edited_at: null,
      statuses: [],
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const sent = await api.sendMessage(conversation.id, content);
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? sent : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
  }

  const typingNames = Array.from(typingUsers)
    .map((id) => conversation.participants.find((p) => p.user.id === id)?.user.display_name)
    .filter(Boolean);

  return (
    <div className="flex h-full flex-1 flex-col bg-signal-bg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-signal-border px-4 py-2.5">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="text-signal-text-secondary md:hidden">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <button onClick={onOpenInfo} className="flex items-center gap-3 text-left">
            <Avatar
              name={name}
              color={color}
              size={40}
              isGroup={conversation.is_group}
              online={conversation.is_group ? undefined : other?.is_online}
            />
            <div>
              <p className="text-[15px] font-semibold text-signal-text-primary">{name}</p>
              <p className="text-xs text-signal-text-muted">
                {conversation.is_group
                  ? `${conversation.participants.length} members`
                  : typingNames.length > 0
                  ? "typing…"
                  : other?.is_online
                  ? "Online"
                  : "Offline"}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-signal-blue border-t-transparent" />
          </div>
        )}
        {!loading &&
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const showDateDivider =
              !prev || !isSameDay(new Date(prev.created_at), new Date(m.created_at));
            const isOwn = m.sender_id === currentUser.id;
            const showSender =
              conversation.is_group && (!prev || prev.sender_id !== m.sender_id);
            const senderName = conversation.participants.find((p) => p.user.id === m.sender_id)
              ?.user.display_name;

            const aggregateStatus = (() => {
              if (m.statuses.length === 0) return "sent" as const;
              if (m.statuses.every((s) => s.status === "read")) return "read" as const;
              if (m.statuses.some((s) => s.status === "delivered" || s.status === "read"))
                return "delivered" as const;
              return "sent" as const;
            })();

            return (
              <div key={m.id}>
                {showDateDivider && (
                  <div className="flex justify-center py-2">
                    <span className="rounded-full bg-signal-bg-tertiary px-3 py-1 text-xs text-signal-text-muted">
                      {format(new Date(m.created_at), "MMMM d, yyyy")}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={m}
                  isOwn={isOwn}
                  senderName={senderName}
                  showSender={showSender}
                  aggregateStatus={aggregateStatus}
                />
              </div>
            );
          })}

        {typingNames.length > 0 && (
          <div className="flex justify-start px-4 py-1">
            <div className="flex items-center gap-1 rounded-bubble rounded-bl-md bg-signal-bubble-in px-3.5 py-2.5">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-signal-text-muted" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-signal-text-muted" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-signal-text-muted" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-signal-border px-4 py-3">
        <button
          type="button"
          title="Attachments (coming soon)"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-signal-text-secondary hover:bg-signal-bg-hover"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <input
          value={draft}
          onChange={(e) => handleTypingChange(e.target.value)}
          placeholder="Type a message"
          className="flex-1 rounded-full border border-signal-border bg-signal-bg-secondary px-4 py-2.5 text-sm text-signal-text-primary placeholder:text-signal-text-muted focus:border-signal-blue focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-signal-blue text-white transition hover:bg-signal-blue-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </div>
  );
}
