import { Bone } from "./Bone";

const ROWS = 6;

/** Messages list: search field and chat rows (avatar, name, preview) – same 56px ListRows (40px avatar) as InboxList. */
export function ThreadListSkeleton() {
  return (
    <div>
      <Bone className="h-11 rounded-xl" />
      <Bone className="mx-3 mt-5 mb-2 h-3 w-20" />
      <ul className="divide-y divide-line">
        {Array.from({ length: ROWS }, (_, i) => (
          <li key={i} className="flex min-h-14 items-center gap-3 px-3 py-2">
            <Bone className="size-10 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Bone className="h-3.5 w-1/2" />
              <Bone className="h-3.5 w-4/5" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
