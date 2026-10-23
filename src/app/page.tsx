import { MockDelay } from "@/components/MockDelay";
import { ExploreSkeleton } from "@/components/skeletons/ExploreSkeleton";
import { ExploreFeed } from "@/components/views/ExploreFeed";

export default function ExplorePage() {
  return (
    <MockDelay ms={400} fallback={<ExploreSkeleton />}>
      <ExploreFeed />
    </MockDelay>
  );
}
