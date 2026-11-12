// Your houses: its rows, in their order. "See all" opens one of them as a grid (/your-houses/all/[group]). A plain module, so the server page
// can check the route against it (from the client component it would only get a client reference).
export const YOUR_ROWS = ["hosting", "going", "waiting", "livedIn", "saved", "nextTrip"] as const;
export type YourRowKey = (typeof YOUR_ROWS)[number];
