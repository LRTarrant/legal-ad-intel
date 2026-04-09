export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded bg-cloud" />
        <div>
          <div className="h-7 w-64 rounded bg-cloud" />
          <div className="mt-1 h-4 w-96 rounded bg-cloud" />
        </div>
      </div>
      <div className="h-40 rounded-xl bg-cloud" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-28 rounded-lg bg-cloud" />
        <div className="h-28 rounded-lg bg-cloud" />
        <div className="h-28 rounded-lg bg-cloud" />
      </div>
      <div className="h-24 rounded-xl bg-cloud" />
      <div className="h-96 rounded-xl bg-cloud" />
    </div>
  );
}
