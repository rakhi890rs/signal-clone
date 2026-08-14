import { format } from "date-fns";
import type { MessageOut } from "@/lib/types";

function StatusTicks({ status }: { status: "sent" | "delivered" | "read" | undefined }) {
  const color = status === "read" ? "#4ADE80" : "currentColor";
  if (!status || status === "sent") {
    return (
      <svg width="15" height="10" viewBox="0 0 16 11" fill="none" className="opacity-70">
        <path
          d="M1 5.5L5 9.5L15 1"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="19" height="10" viewBox="0 0 20 11" fill="none">
      <path
        d="M1 5.5L5 9.5L15 1"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 5.5L10 9.5L19 1"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MessageBubble({
  message,
  isOwn,
  senderName,
  showSender,
  aggregateStatus,
}: {
  message: MessageOut;
  isOwn: boolean;
  senderName?: string;
  showSender?: boolean;
  aggregateStatus?: "sent" | "delivered" | "read";
}) {
  if (message.message_type === "system") {
    return (
      <div className="flex justify-center py-1">
        <span className="rounded-full bg-signal-bg-tertiary px-3 py-1 text-xs text-signal-text-muted">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex animate-fade-in ${isOwn ? "justify-end" : "justify-start"} px-4 py-0.5`}>
      <div
        className={`max-w-[65%] rounded-bubble px-3.5 py-2 ${
          isOwn
            ? "rounded-br-md bg-signal-bubble-out text-white"
            : "rounded-bl-md bg-signal-bubble-in text-signal-text-primary"
        }`}
      >
        {showSender && senderName && !isOwn && (
          <p className="mb-0.5 text-xs font-semibold text-signal-blue">{senderName}</p>
        )}
        <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">
          {message.content}
        </p>
        <div
          className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${
            isOwn ? "text-white/70" : "text-signal-text-muted"
          }`}
        >
          <span>{format(new Date(message.created_at), "h:mm a")}</span>
          {isOwn && <StatusTicks status={aggregateStatus} />}
        </div>
      </div>
    </div>
  );
}
