export default function MdlDetailLoading() {
  return (
    <div className="animate-pulse space-y-8">
      {/* Back link + header skeleton */}
      <div>
        <div className="h-4 w-40 rounded bg-cloud" />
        <div className="mt-3 h-9 w-48 rounded bg-cloud" />
        <div className="mt-2 h-5 w-96 rounded bg-cloud" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg bg-white p-4 shadow-sm">
            <div className="h-3 w-24 rounded bg-cloud" />
            <div className="mt-3 h-6 w-20 rounded bg-cloud" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="h-5 w-56 rounded bg-cloud" />
        <div className="mt-4 h-[200px] w-full rounded bg-cloud" />
      </div>

      {/* Button skeleton */}
      <div className="h-10 w-52 rounded-lg bg-cloud" />

      {/* Recent developments skeleton */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="h-5 w-44 rounded bg-cloud" />
        <div className="mt-3 h-4 w-80 rounded bg-cloud" />
      </div>
    </div>
  );
}
