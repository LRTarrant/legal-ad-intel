"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSubmitted(true);
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
            Reset your password
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
            {error}
          </div>
        )}

        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-center text-sm text-green-300">
              Check your email for a password reset link
            </div>
            <p className="text-center text-sm text-white/40">
              <Link
                href="/login"
                className="text-intelligence-teal transition hover:text-light-teal"
              >
                &larr; Back to login
              </Link>
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-white/70"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30 focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-intelligence-teal focus:ring-offset-2 focus:ring-offset-midnight-navy disabled:opacity-50"
                style={{ backgroundColor: "var(--color-accent, #1A8C96)" }}
              >
                {loading ? "Sending..." : "Send Reset Link"}
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
