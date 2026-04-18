"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

interface InviteData {
  valid: boolean;
  reason?: string;
  email?: string;
  product_name?: string;
  branding?: {
    logo_url: string;
    accent_color: string;
    primary_color: string;
    font_family: string;
  };
}

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/invites/validate?token=${token}`);
        const data = await res.json();
        setInvite(data);
      } catch {
        setInvite({ valid: false, reason: "not_found" });
      } finally {
        setLoading(false);
      }
    }
    validate();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, full_name: fullName, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.push("/login?success=Account+created.+Please+log+in.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const primaryColor = invite?.branding?.primary_color ?? "#0B1D3A";
  const accentColor = invite?.branding?.accent_color ?? "#1A8C96";
  const logoUrl = invite?.branding?.logo_url ?? "/logo-horizontal-white.svg";
  const productName = invite?.product_name ?? "Legal Marketing Intelligence";

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: primaryColor }}
      >
        <p className="text-white/60 text-sm">Loading…</p>
      </div>
    );
  }

  if (!invite?.valid) {
    const messages: Record<string, string> = {
      expired: "This invitation has expired. Please ask your administrator for a new one.",
      accepted: "This invitation has already been accepted. Please log in.",
      not_found: "This invitation link is invalid.",
    };

    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center px-4"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="w-full max-w-sm space-y-6 text-center">
          <Image
            src={logoUrl}
            alt={productName}
            width={200}
            height={48}
            priority
            className="mx-auto h-10 w-auto"
          />
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {messages[invite?.reason ?? "not_found"]}
          </div>
          <a
            href="/login"
            className="inline-block text-sm transition hover:opacity-80"
            style={{ color: accentColor }}
          >
            &larr; Go to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Image
            src={logoUrl}
            alt={productName}
            width={200}
            height={48}
            priority
            className="mx-auto h-10 w-auto"
          />
          <h1 className="mt-6 text-lg font-semibold text-white">
            You&rsquo;ve been invited to join {productName}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Create your account to get started.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70">
              Email
            </label>
            <input
              type="email"
              value={invite.email ?? ""}
              readOnly
              className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/50 cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-white/70">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30 focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white/70">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30 focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/70">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
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
            disabled={submitting}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
            style={{
              backgroundColor: accentColor,
              "--tw-ring-color": accentColor,
            } as React.CSSProperties}
          >
            {submitting ? "Creating Account…" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-white/40">
          <a
            href="/login"
            className="transition hover:opacity-80"
            style={{ color: accentColor }}
          >
            &larr; Already have an account? Log in
          </a>
        </p>
      </div>
    </div>
  );
}
