import Link from "next/link";

export default function MarketNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-gray-500 mb-6">Market not found</p>
        <Link
          href="/dashboard"
          className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
        >
          &larr; Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
