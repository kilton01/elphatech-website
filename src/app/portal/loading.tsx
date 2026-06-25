export default function PortalLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-32 animate-pulse rounded-md bg-navy2" />
          <div className="h-4 w-48 animate-pulse rounded-md bg-navy2" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-md bg-navy2" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-brand bg-navy2 p-5">
            <div className="h-5 w-3/4 animate-pulse rounded bg-white/5" />
            <div className="mt-2 h-4 w-full animate-pulse rounded bg-white/5" />
            <div className="mt-4 flex gap-4">
              <div className="h-3 w-16 animate-pulse rounded bg-white/5" />
              <div className="h-3 w-16 animate-pulse rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
