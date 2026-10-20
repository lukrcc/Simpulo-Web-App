/** Static fallback shown while runtime route params resolve. */
export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse px-4 pt-6 md:px-6 md:pt-10" aria-busy="true" aria-label="Loading">
      <div className="aspect-[4/3] rounded-2xl bg-neutral-100 md:aspect-[3/1]" />
      <div className="mt-6 h-7 w-2/3 rounded-full bg-neutral-100" />
      <div className="mt-3 h-4 w-1/3 rounded-full bg-neutral-100" />
      <div className="mt-8 space-y-2">
        <div className="h-4 rounded-full bg-neutral-100" />
        <div className="h-4 w-5/6 rounded-full bg-neutral-100" />
      </div>
    </div>
  );
}
