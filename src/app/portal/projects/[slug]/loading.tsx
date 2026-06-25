export default function ProjectLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-navy2" />
        <div className="h-6 w-48 animate-pulse rounded-md bg-navy2" />
      </div>
      <div className="h-8 w-80 animate-pulse rounded-lg bg-navy2" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-brand bg-navy2 p-5">
            <div className="h-4 w-24 animate-pulse rounded bg-white/5" />
            <div className="mt-3 h-7 w-12 animate-pulse rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
