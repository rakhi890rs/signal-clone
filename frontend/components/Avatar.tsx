function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  name,
  color,
  size = 48,
  isGroup = false,
  online,
}: {
  name: string;
  color: string;
  size?: number;
  isGroup?: boolean;
  online?: boolean;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white select-none"
        style={{ backgroundColor: color, fontSize: size * 0.38 }}
      >
        {isGroup ? (
          <svg
            width={size * 0.5}
            height={size * 0.5}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M17 20c0-2.76-2.24-5-5-5s-5 2.24-5 5M12 12a4 4 0 100-8 4 4 0 000 8zM21 20c0-2.17-1.4-4-3.5-4.65M16.5 11.35A3.5 3.5 0 1015 4.6"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          initials(name)
        )}
      </div>
      {online !== undefined && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-signal-bg"
          style={{
            width: size * 0.28,
            height: size * 0.28,
            backgroundColor: online ? "#4ADE80" : "#6B6D72",
          }}
        />
      )}
    </div>
  );
}
