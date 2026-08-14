"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

type Step = "phone" | "otp" | "profile";

export default function RegisterPage() {
  const { register } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.sendOtp(phone.trim());
      setInfo(res.message);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.verifyOtp(phone.trim(), otp.trim());
      setStep("profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  async function completeRegistration(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register({
        username: username.trim(),
        phone_number: phone.trim(),
        display_name: displayName.trim(),
        password,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
            Create your account
          </h1>
          <div className="flex items-center gap-1.5">
            {(["phone", "otp", "profile"] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`h-1.5 w-8 rounded-full ${
                  step === s || (["otp", "profile"].includes(step) && i === 0) || (step === "profile" && i === 1)
                    ? "bg-signal-blue"
                    : "bg-signal-border"
                }`}
              />
            ))}
          </div>
        </div>

        {step === "phone" && (
          <form onSubmit={sendOtp} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-signal-text-secondary">
                Phone number
              </label>
              <input
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 90000 00000"
                className="w-full rounded-lg border border-signal-border bg-signal-bg-secondary px-3.5 py-2.5 text-sm text-signal-text-primary placeholder:text-signal-text-muted focus:border-signal-blue focus:outline-none"
              />
              <p className="mt-1.5 text-xs text-signal-text-muted">
                We&apos;ll send a verification code (mocked for this demo).
              </p>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={busy || !phone}
              className="mt-2 rounded-lg bg-signal-blue py-2.5 text-sm font-semibold text-white transition hover:bg-signal-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyOtp} className="flex flex-col gap-4">
            {info && (
              <p className="rounded-lg bg-signal-blue/10 px-3 py-2 text-xs text-signal-blue">
                {info}
              </p>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-signal-text-secondary">
                Verification code
              </label>
              <input
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full rounded-lg border border-signal-border bg-signal-bg-secondary px-3.5 py-2.5 text-center text-lg tracking-[0.5em] text-signal-text-primary placeholder:text-signal-text-muted focus:border-signal-blue focus:outline-none"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={busy || otp.length !== 6}
              className="mt-2 rounded-lg bg-signal-blue py-2.5 text-sm font-semibold text-white transition hover:bg-signal-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Verifying…" : "Verify"}
            </button>
          </form>
        )}

        {step === "profile" && (
          <form onSubmit={completeRegistration} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-signal-text-secondary">
                Username
              </label>
              <input
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a unique username"
                className="w-full rounded-lg border border-signal-border bg-signal-bg-secondary px-3.5 py-2.5 text-sm text-signal-text-primary placeholder:text-signal-text-muted focus:border-signal-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-signal-text-secondary">
                Display name
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How others will see you"
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
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={busy || !username || !displayName || !password}
              className="mt-2 rounded-lg bg-signal-blue py-2.5 text-sm font-semibold text-white transition hover:bg-signal-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Creating account…" : "Create account"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-signal-text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-signal-blue hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
