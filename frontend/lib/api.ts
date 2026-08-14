import type {
  ContactOut,
  ConversationOut,
  MessageOut,
  UserOut,
} from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const WS_BASE = API_BASE.replace(/^http/, "ws");

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("signal_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Auth
  register: (data: {
    username: string;
    phone_number?: string;
    display_name: string;
    password: string;
  }) =>
    request<{ access_token: string; user: UserOut }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (username: string, password: string) =>
    request<{ access_token: string; user: UserOut }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  sendOtp: (phone_number: string) =>
    request<{ message: string }>(
      `/api/auth/send-otp?phone_number=${encodeURIComponent(phone_number)}`,
      { method: "POST" }
    ),

  verifyOtp: (phone_number: string, otp: string) =>
    request<{ verified: boolean }>("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone_number, otp }),
    }),

  me: () => request<UserOut>("/api/auth/me"),

  // Users
  searchUsers: (q: string) =>
    request<UserOut[]>(`/api/users/search?q=${encodeURIComponent(q)}`),

  updateProfile: (data: { display_name?: string; avatar_color?: string }) =>
    request<UserOut>("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Contacts
  listContacts: () => request<ContactOut[]>("/api/contacts"),

  addContact: (username: string, nickname?: string) =>
    request<ContactOut>("/api/contacts", {
      method: "POST",
      body: JSON.stringify({ username, nickname }),
    }),

  deleteContact: (contactId: string) =>
    request<void>(`/api/contacts/${contactId}`, { method: "DELETE" }),

  // Conversations
  listConversations: () => request<ConversationOut[]>("/api/conversations"),

  createConversation: (data: {
    is_group: boolean;
    name?: string;
    participant_ids: string[];
  }) =>
    request<ConversationOut>("/api/conversations", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  addMember: (conversationId: string, userId: string) =>
    request<ConversationOut>(`/api/conversations/${conversationId}/members`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }),

  removeMember: (conversationId: string, userId: string) =>
    request<ConversationOut>(
      `/api/conversations/${conversationId}/members/${userId}`,
      { method: "DELETE" }
    ),

  // Messages
  getMessages: (conversationId: string, before?: string) =>
    request<MessageOut[]>(
      `/api/conversations/${conversationId}/messages${before ? `?before=${before}` : ""}`
    ),

  sendMessage: (conversationId: string, content: string, replyToId?: string) =>
    request<MessageOut>(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, reply_to_id: replyToId }),
    }),

  markRead: (conversationId: string) =>
    request<{ ok: boolean }>(
      `/api/conversations/${conversationId}/messages/read`,
      { method: "POST" }
    ),
};

export { getToken };
