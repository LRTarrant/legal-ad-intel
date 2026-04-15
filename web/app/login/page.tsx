import Link from "next/link";
import Image from "next/image";
import { login } from "./actions";

export const metadata = {
  title: "Log In | Legal Marketing Intelligence",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-midnight-navy px-4">
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
            Sign in to access competitive intelligence
          </p>
        </div>

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
            className="w-full rounded-lg bg-intelligence-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-light-teal focus:outline-none focus:ring-2 focus:ring-intelligence-teal focus:ring-offset-2 focus:ring-offset-midnight-navy"
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
