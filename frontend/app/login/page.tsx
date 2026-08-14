"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-signal-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-signal-blue">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.07L2 22l4.93-1.38C8.42 21.5 10.15 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"
                fill="white"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-signal-text-primary">
            Sign in to Signal
          </h1>
          <p className="text-sm text-signal-text-secondary">
            Enter your username and password to continue
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-signal-text-secondary">
              Username
            </label>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. rakhi"
              className="w-full rounded-lg border border-signal-border bg-signal-bg-secondary px-3.5 py-2.5 text-sm text-signal-text-primary placeholder:text-signal-text-muted focus:border-signal-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-signal-text-secondary">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-signal-border bg-signal-bg-secondary px-3.5 py-2.5 text-sm text-signal-text-primary placeholder:text-signal-text-muted focus:border-signal-blue focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !username || !password}
            className="mt-2 rounded-lg bg-signal-blue py-2.5 text-sm font-semibold text-white transition hover:bg-signal-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-signal-text-secondary">
          New here?{" "}
          <Link href="/register" className="font-medium text-signal-blue hover:underline">
            Create an account
          </Link>
        </p>

        <div className="mt-8 rounded-lg border border-signal-border bg-signal-bg-secondary p-4">
          <p className="text-xs font-medium text-signal-text-secondary">
            Seeded demo accounts (password: password123)
          </p>
          <p className="mt-1 text-xs text-signal-text-muted">
            rakhi · priya · arjun · dev · sara
          </p>
        </div>
      </div>
    </div>
  );
}
