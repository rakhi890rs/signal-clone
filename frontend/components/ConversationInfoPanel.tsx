"use client";

import { useState } from "react";
import Avatar from "./Avatar";
import NewChatModal from "./NewChatModal";
import { api } from "@/lib/api";
import type { ConversationOut, UserOut } from "@/lib/types";

export default function ConversationInfoPanel({
  conversation,
  currentUser,
  onClose,
  onUpdated,
}: {
  conversation: ConversationOut;
  currentUser: UserOut;
  onClose: () => void;
  onUpdated: (conv: ConversationOut) => void;
}) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const myParticipant = conversation.participants.find((p) => p.user.id === currentUser.id);
  const isAdmin = myParticipant?.is_admin ?? false;

  async function removeMember(userId: string) {
    setBusyUserId(userId);
    try {
      const updated = await api.removeMember(conversation.id, userId);
      onUpdated(updated);
    } finally {
      setBusyUserId(null);
    }
  }

  async function addMember(userId: string) {
    const updated = await api.addMember(conversation.id, userId);
    onUpdated(updated);
    setShowAddMember(false);
  }

  if (!conversation.is_group) {
    const other = conversation.participants.find((p) => p.user.id !== currentUser.id)?.user;
    if (!other) return null;
    return (
      <div className="flex h-full w-full flex-col bg-signal-bg-secondary md:w-[340px]">
        <PanelHeader title="Contact info" onClose={onClose} />
        <div className="flex flex-col items-center gap-3 border-b border-signal-border px-6 py-8">
          <Avatar name={other.display_name} color={other.avatar_color} size={96} online={other.is_online} />
          <div className="text-center">
            <p className="text-lg font-semibold text-signal-text-primary">{other.display_name}</p>
            <p className="text-sm text-signal-text-muted">@{other.username}</p>
          </div>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs font-medium uppercase text-signal-text-muted">Status</p>
          <p className="mt-1 text-sm text-signal-text-primary">
            {other.is_online ? "Online now" : "Offline"}
          </p>
          {other.phone_number && (
            <>
              <p className="mt-4 text-xs font-medium uppercase text-signal-text-muted">Phone</p>
              <p className="mt-1 text-sm text-signal-text-primary">{other.phone_number}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-signal-bg-secondary md:w-[340px]">
      <PanelHeader title="Group info" onClose={onClose} />
      <div className="flex flex-col items-center gap-3 border-b border-signal-border px-6 py-8">
        <Avatar name={conversation.name || "Group"} color={conversation.avatar_color} size={96} isGroup />
        <div className="text-center">
          <p className="text-lg font-semibold text-signal-text-primary">{conversation.name}</p>
          <p className="text-sm text-signal-text-muted">
            {conversation.participants.length} members
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="flex items-center justify-between px-4 pb-2">
          <p className="text-xs font-medium uppercase text-signal-text-muted">Members</p>
          {isAdmin && (
            <button
              onClick={() => setShowAddMember(true)}
              className="text-xs font-medium text-signal-blue hover:underline"
            >
              + Add
            </button>
          )}
        </div>
        {conversation.participants.map((p) => (
          <div
            key={p.user.id}
            className="flex items-center justify-between gap-3 rounded-lg px-4 py-2 hover:bg-signal-bg-hover"
          >
            <div className="flex items-center gap-3">
              <Avatar name={p.user.display_name} color={p.user.avatar_color} size={38} online={p.user.is_online} />
              <div>
                <p className="text-sm font-medium text-signal-text-primary">
                  {p.user.display_name}
                  {p.user.id === currentUser.id && (
                    <span className="ml-1.5 text-xs text-signal-text-muted">(you)</span>
                  )}
                </p>
                {p.is_admin && <p className="text-xs text-signal-blue">Admin</p>}
              </div>
            </div>
            {isAdmin && p.user.id !== currentUser.id && (
              <button
                onClick={() => removeMember(p.user.id)}
                disabled={busyUserId === p.user.id}
                className="text-xs font-medium text-red-400 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {showAddMember && (
        <NewChatModal
          onClose={() => setShowAddMember(false)}
          onStartChat={(userId) => addMember(userId)}
        />
      )}
    </div>
  );
}

function PanelHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-signal-border px-4 py-3">
      <h2 className="text-[15px] font-semibold text-signal-text-primary">{title}</h2>
      <button
        onClick={onClose}
        className="flex h-8 w-8 items-center justify-center rounded-full text-signal-text-secondary hover:bg-signal-bg-hover"
      >
        ✕
      </button>
    </div>
  );
}
