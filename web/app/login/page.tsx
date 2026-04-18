import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { login } from "./actions";
import { resolveTenant } from "@/lib/tenant";

export const metadata = {
  title: "Log In | Legal Marketing Intelligence",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;

  let branding;
  try {
    const headersList = await headers();
    const host = headersList.get("host") ?? "";
    branding = host ? await resolveTenant(host) : null;
  } catch {
    branding = null;
  }

  const logoSrc = branding?.logoUrl ?? "/logo-horizontal-white.svg";
  const altText = branding?.productName ?? "Legal Marketing Intelligence";
  const headline = branding?.loginHeadline ?? "Sign in to access competitive intelligence";

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ backgroundColor: "var(--color-primary, #0B1D3A)" }}
    >
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link href="/">
            <Image
              src={logoSrc}
              alt={altText}
              width={200}
              height={48}
              priority
              className="mx-auto h-10 w-auto"
            />
          </Link>
          <p className="mt-4 text-sm text-white/60">
            {headline}
          </p>
        </div>

        {success && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-center text-sm text-green-300">
            {success}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
            {error === "Invalid+credentials" || error === "Invalid credentials"
              ? "Invalid email or password. Please try again."
              : "An error occurred. Please try again."}
          </div>
        )}

        <form className="space-y-4">
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
              className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30 focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-white/70"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30 focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
              placeholder="••••••••"
            />
          </div>

          <button
            formAction={login}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-intelligence-teal focus:ring-offset-2 focus:ring-offset-midnight-navy"
            style={{ backgroundColor: "var(--color-accent, #1A8C96)" }}
          >
            Log In
          </button>
        </form>

        <p className="text-center text-sm text-white/40">
          <Link
            href="/"
            className="text-intelligence-teal transition hover:text-light-teal"
          >
            &larr; Back to homepage
          </Link>
        </p>
      </div>
    </div>
  );
}
