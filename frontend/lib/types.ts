export interface UserOut {
  id: string;
  username: string;
  phone_number: string | null;
  display_name: string;
  avatar_color: string;
  is_online: boolean;
  last_seen: string;
}

export interface ContactOut {
  id: string;
  nickname: string | null;
  user: UserOut;
}

export interface ParticipantOut {
  user: UserOut;
  is_admin: boolean;
}

export interface ConversationOut {
  id: string;
  is_group: boolean;
  name: string | null;
  avatar_color: string;
  participants: ParticipantOut[];
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
}

export interface MessageStatusOut {
  user_id: string;
  status: "sent" | "delivered" | "read";
}

export interface MessageOut {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  message_type: "text" | "system";
  reply_to_id: string | null;
  created_at: string;
  edited_at: string | null;
  statuses: MessageStatusOut[];
}

export type WSEvent =
  | { type: "new_message"; message: MessageOut }
  | { type: "typing"; conversation_id: string; user_id: string; is_typing: boolean }
  | { type: "presence"; user_id: string; is_online: boolean }
  | {
      type: "messages_read";
      conversation_id: string;
      reader_id: string;
      message_ids: string[];
    }
  | { type: "conversation_updated"; conversation: ConversationOut }
  | { type: "pong" };
