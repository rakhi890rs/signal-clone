"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ConversationList from "@/components/ConversationList";
import ChatPane from "@/components/ChatPane";
import ConversationInfoPanel from "@/components/ConversationInfoPanel";
import NewChatModal from "@/components/NewChatModal";
import NewGroupModal from "@/components/NewGroupModal";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useWebSocket } from "@/lib/websocket";
import type { ConversationOut } from "@/lib/types";

export default function ChatApp() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationOut[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const refreshConversations = useCallback(() => {
    api
      .listConversations()
      .then(setConversations)
      .finally(() => setLoadingConvos(false));
  }, []);

  useEffect(() => {
    if (user) refreshConversations();
  }, [user, refreshConversations]);

  const upsertConversation = useCallback((conv: ConversationOut) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === conv.id);
      let next;
      if (idx === -1) next = [conv, ...prev];
      else {
        next = [...prev];
        next[idx] = conv;
      }
      return [...next].sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    });
  }, []);

  useWebSocket((event) => {
    if (event.type === "new_message") {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === event.message.conversation_id);
        if (idx === -1) {
          refreshConversations();
          return prev;
        }
        const next = [...prev];
        const conv = { ...next[idx] };
        conv.last_message_at = event.message.created_at;
        conv.last_message_preview = event.message.content.slice(0, 80);
        if (event.message.sender_id !== user?.id && event.message.conversation_id !== activeId) {
          conv.unread_count = (conv.unread_count || 0) + 1;
        }
        next.splice(idx, 1);
        return [conv, ...next];
      });
    }
    if (event.type === "conversation_updated") {
      upsertConversation(event.conversation);
    }
    if (event.type === "presence") {
      setConversations((prev) =>
        prev.map((c) => ({
          ...c,
          participants: c.participants.map((p) =>
            p.user.id === event.user_id ? { ...p, user: { ...p.user, is_online: event.is_online } } : p
          ),
        }))
      );
    }
  });

  // Clear unread count locally when opening a conversation
  useEffect(() => {
    if (!activeId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, unread_count: 0 } : c))
    );
  }, [activeId]);

  async function startChat(userId: string) {
    const conv = await api.createConversation({ is_group: false, participant_ids: [userId] });
    upsertConversation(conv);
    setActiveId(conv.id);
    setShowNewChat(false);
  }

  function handleGroupCreated(conversationId: string) {
    refreshConversations();
    setActiveId(conversationId);
    setShowNewGroup(false);
  }

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-signal-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-signal-blue border-t-transparent" />
      </div>
    );
  }

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  return (
    <div className="flex h-screen overflow-hidden bg-signal-bg">
      <div className={`${activeId ? "hidden md:flex" : "flex"} h-full`}>
        <ConversationList
          conversations={conversations}
          currentUser={user}
          activeId={activeId}
          onSelect={(id) => {
            setActiveId(id);
            setShowInfo(false);
          }}
          onNewChat={() => setShowNewChat(true)}
          onNewGroup={() => setShowNewGroup(true)}
          onLogout={logout}
        />
      </div>

      {activeConversation ? (
        <div className={`${activeId ? "flex" : "hidden md:flex"} h-full flex-1`}>
          <ChatPane
            conversation={activeConversation}
            currentUser={user}
            onOpenInfo={() => setShowInfo((v) => !v)}
            onBack={() => setActiveId(null)}
          />
          {showInfo && (
            <ConversationInfoPanel
              conversation={activeConversation}
              currentUser={user}
              onClose={() => setShowInfo(false)}
              onUpdated={upsertConversation}
            />
          )}
        </div>
      ) : (
        <div className="hidden flex-1 flex-col items-center justify-center gap-4 md:flex">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-signal-bg-secondary">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.07L2 22l4.93-1.38C8.42 21.5 10.15 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"
                stroke="#6B6D72"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <p className="text-signal-text-muted">
            {loadingConvos ? "Loading conversations…" : "Select a chat to start messaging"}
          </p>
        </div>
      )}

      {showNewChat && (
        <NewChatModal onClose={() => setShowNewChat(false)} onStartChat={startChat} />
      )}
      {showNewGroup && (
        <NewGroupModal onClose={() => setShowNewGroup(false)} onCreated={handleGroupCreated} />
      )}
    </div>
  );
}
