export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded bg-cloud" />
        <div>
          <div className="h-8 w-80 rounded bg-cloud" />
          <div className="mt-1 h-4 w-96 rounded bg-cloud" />
        </div>
      </div>
      <div className="h-10 w-48 rounded bg-cloud" />
      <div className="h-32 rounded-xl bg-cloud" />
      <div className="h-24 rounded-xl bg-cloud" />
      <div className="h-96 rounded-xl bg-cloud" />
    </div>
  );
}
