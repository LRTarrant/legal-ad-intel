export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded bg-cloud" />
        <div>
          <div className="h-7 w-64 rounded bg-cloud" />
          <div className="mt-1 h-4 w-48 rounded bg-cloud" />
        </div>
      </div>
      <div className="h-32 rounded-2xl bg-cloud" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-24 rounded-xl bg-cloud" />
        <div className="h-24 rounded-xl bg-cloud" />
      </div>
      <div className="h-[480px] rounded-2xl bg-cloud" />
      <div className="h-64 rounded-xl bg-cloud" />
    </div>
  );
}
