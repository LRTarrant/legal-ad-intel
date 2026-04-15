import { login } from "./actions";

export const metadata = {
  title: "Sign In | Legal Marketing Intelligence",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Legal Marketing Intelligence</h1>
          <p className="mt-2 text-sm text-zinc-400">Sign in to access competitive intelligence</p>
        </div>

        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="••••••••"
            />
          </div>

          <button
            formAction={login}
            className="w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
