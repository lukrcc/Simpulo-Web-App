import { Container } from "@/components/layout/Container";

/** Static fallback shown while runtime route params resolve. */
export function PageSkeleton() {
  return (
    <Container page width="narrow">
      <div className="animate-pulse" aria-busy="true" aria-label="Loading">
        <div className="aspect-[4/3] rounded-2xl bg-black/5 md:aspect-[3/1]" />
        <div className="mt-6 h-7 w-2/3 rounded-full bg-black/5" />
        <div className="mt-3 h-4 w-1/3 rounded-full bg-black/5" />
        <div className="mt-8 space-y-2">
          <div className="h-4 rounded-full bg-black/5" />
          <div className="h-4 w-5/6 rounded-full bg-black/5" />
        </div>
      </div>
    </Container>
  );
}
