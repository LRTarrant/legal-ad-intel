"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase redirects here with a hash fragment containing the recovery token.
    // The Supabase client auto-detects the hash and exchanges it for a session.
    // We listen for the PASSWORD_RECOVERY event to know we can proceed.
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setSessionReady(true);
        }
      }
    );

    // Also check if the user already has a valid session (e.g., page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Sign out so they can log in fresh with the new password
    await supabase.auth.signOut();
    router.push("/login?success=Password+updated+successfully.+Please+log+in.");
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ backgroundColor: "var(--color-primary, #0B1D3A)" }}
    >
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link href="/">
            <Image
              src="/logo-horizontal-white.svg"
              alt="Legal Marketing Intelligence"
              width={200}
              height={48}
              priority
              className="mx-auto h-10 w-auto"
            />
          </Link>
          <p className="mt-4 text-sm text-white/60">
            Set a new password
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
            {error}
          </div>
        )}

        {!sessionReady ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-white/60">
              Verifying your reset link...
            </div>
            <p className="text-center text-sm text-white/40">
              If this takes too long, your link may have expired.{" "}
              <Link
                href="/forgot-password"
                className="text-intelligence-teal transition hover:text-light-teal"
              >
                Request a new one
              </Link>
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-white/70"
                >
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30 focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
                  placeholder="••••••••"
                />
                <p className="mt-1 text-xs text-white/40">
                  Minimum 8 characters
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-white/70"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30 focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-intelligence-teal focus:ring-offset-2 focus:ring-offset-midnight-navy disabled:opacity-50"
                style={{ backgroundColor: "var(--color-accent, #1A8C96)" }}
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>

            <p className="text-center text-sm text-white/40">
              <Link
                href="/login"
                className="text-intelligence-teal transition hover:text-light-teal"
              >
                &larr; Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
