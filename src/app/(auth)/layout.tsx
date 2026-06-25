export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark flex min-h-screen bg-surface-0">
      {/* Brand panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 bg-surface-1 relative overflow-hidden">
        {/* Decorative geometric elements */}
        <div className="absolute -top-32 -right-32 size-96 rounded-full border border-red/10 opacity-60" />
        <div className="absolute -top-16 -right-16 size-64 rounded-full border border-red/20 opacity-40" />
        <div className="absolute bottom-24 -left-16 size-48 rounded-full border border-red/5" />

        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-red text-white text-sm font-bold">
              ET
            </div>
            <span className="text-lg font-semibold tracking-tight text-white font-[var(--font-sora)]">
              ElphaTech
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-bold text-white leading-tight font-[var(--font-sora)]">
            Your project command center
          </h1>
          <p className="mt-4 text-base text-secondary-brand leading-relaxed">
            Track progress, share files, and collaborate with your team — all in one place.
          </p>
        </div>

        <p className="text-xs text-tertiary">
          &copy; {new Date().getFullYear()} ElphaTech Solutions
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex size-10 items-center justify-center rounded-lg bg-red text-white text-sm font-bold">
            ET
          </div>
          <span className="text-lg font-semibold tracking-tight text-white font-[var(--font-sora)]">
            ElphaTech
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
