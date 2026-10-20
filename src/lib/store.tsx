"use client";

import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import { CURRENT_USER_ID, joinRequests as mockJoinRequests, stays as mockStays, threads as mockThreads, users as mockUsers } from "./mock";
import { DEFAULT_MAP_PREVIEW, crewThreadId, mockLastReadAt } from "./mock-extras";
import type { JoinRequest, Message, NewStayInput, Stay, Thread, User } from "./types";
import { makeId, slugify } from "./utils";

export { crewThreadId };

interface StoreState {
  users: User[];
  stays: Stay[];
  joinRequests: JoinRequest[];
  threads: Thread[];
  currentUserId: string;
  /** threadId → ISO timestamp of the newest message the current user has seen */
  lastReadAt: Record<string, string>;
}

type StoreAction =
  | { type: "createStay"; stay: Stay; thread: Thread }
  | { type: "requestToJoin"; request: JoinRequest }
  | { type: "acceptRequest"; requestId: string; systemMessage: Pick<Message, "id" | "createdAt"> }
  | { type: "declineRequest"; requestId: string }
  | { type: "sendMessage"; threadId: string; message: Message }
  | { type: "createThread"; thread: Thread }
  | { type: "markThreadRead"; threadId: string; at: string }
  | { type: "lockAccommodation"; stayId: string; link?: string; pricePerPerson?: number };

interface StoreActions {
  createStay: (input: NewStayInput) => Stay;
  requestToJoin: (stayId: string, message: string) => void;
  acceptRequest: (requestId: string) => void;
  declineRequest: (requestId: string) => void;
  sendMessage: (threadId: string, text: string) => void;
  /** Finds or creates the 1:1 thread between the current user and `userId` about a stay. Returns its id. */
  openDirectThread: (stayId: string, userId: string) => string;
  markThreadRead: (threadId: string) => void;
  lockAccommodation: (stayId: string, link?: string, pricePerPerson?: number) => void;
}

type StoreValue = StoreState & StoreActions;

/** Every stay has exactly one crew thread – seed empty ones where the mock data has none. */
function withCrewThreads(stays: Stay[], threads: Thread[], requests: JoinRequest[]): Thread[] {
  const missing = stays
    .filter((stay) => !threads.some((t) => t.id === crewThreadId(stay.id)))
    .map<Thread>((stay) => ({
      id: crewThreadId(stay.id),
      type: "crew",
      stayId: stay.id,
      participantIds: [
        stay.hostId,
        ...requests.filter((r) => r.stayId === stay.id && r.status === "accepted").map((r) => r.userId),
      ],
      messages: [],
    }));
  return [...threads, ...missing];
}

const initialState: StoreState = {
  users: mockUsers,
  stays: mockStays,
  joinRequests: mockJoinRequests,
  threads: withCrewThreads(mockStays, mockThreads, mockJoinRequests),
  currentUserId: CURRENT_USER_ID,
  lastReadAt: mockLastReadAt,
};

function updateThread(threads: Thread[], threadId: string, update: (t: Thread) => Thread): Thread[] {
  return threads.map((t) => (t.id === threadId ? update(t) : t));
}

function reducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case "createStay":
      return { ...state, stays: [action.stay, ...state.stays], threads: [action.thread, ...state.threads] };

    case "requestToJoin":
      return { ...state, joinRequests: [...state.joinRequests, action.request] };

    case "acceptRequest": {
      const request = state.joinRequests.find((r) => r.id === action.requestId);
      const stay = request && state.stays.find((s) => s.id === request.stayId);
      if (!request || !stay || request.status === "accepted" || stay.spotsFilled >= stay.spotsTotal) {
        return state;
      }
      const spotsFilled = stay.spotsFilled + 1;
      const name = state.users.find((u) => u.id === request.userId)?.name.split(" ")[0] ?? "Someone";
      const systemMessage: Message = { ...action.systemMessage, userId: "system", text: `${name} joined the crew` };
      return {
        ...state,
        joinRequests: state.joinRequests.map((r) => (r.id === request.id ? { ...r, status: "accepted" } : r)),
        stays: state.stays.map((s) =>
          s.id === stay.id ? { ...s, spotsFilled, status: spotsFilled >= s.spotsTotal ? "full" : s.status } : s,
        ),
        threads: updateThread(state.threads, crewThreadId(stay.id), (t) => ({
          ...t,
          participantIds: t.participantIds.includes(request.userId) ? t.participantIds : [...t.participantIds, request.userId],
          messages: [...t.messages, systemMessage],
        })),
      };
    }

    case "declineRequest":
      return {
        ...state,
        joinRequests: state.joinRequests.map((r) =>
          r.id === action.requestId && r.status === "pending" ? { ...r, status: "declined" } : r,
        ),
      };

    case "sendMessage":
      return {
        ...state,
        threads: updateThread(state.threads, action.threadId, (t) => ({ ...t, messages: [...t.messages, action.message] })),
        // Your own message is read by definition.
        lastReadAt: { ...state.lastReadAt, [action.threadId]: action.message.createdAt },
      };

    case "createThread":
      return { ...state, threads: [...state.threads, action.thread] };

    case "markThreadRead": {
      const current = state.lastReadAt[action.threadId];
      if (current && current >= action.at) return state;
      return { ...state, lastReadAt: { ...state.lastReadAt, [action.threadId]: action.at } };
    }

    case "lockAccommodation":
      return {
        ...state,
        stays: state.stays.map((s) =>
          s.id === action.stayId
            ? {
                ...s,
                accommodationStatus: "locked",
                accommodationLink: action.link?.trim() || s.accommodationLink,
                pricePerPerson: action.pricePerPerson ?? s.pricePerPerson,
              }
            : s,
        ),
      };
  }
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { currentUserId, threads } = state;

  const createStay = useCallback(
    (input: NewStayInput): Stay => {
      const id = makeId("s");
      const stay: Stay = {
        ...input,
        id,
        slug: `${slugify(input.title) || "stay"}-${id.slice(-4)}`,
        hostId: currentUserId,
        // No geocoding yet: created stays get a placeholder map and no coordinates.
        lat: 0,
        lng: 0,
        mapPreviewUrl: DEFAULT_MAP_PREVIEW,
        spotsFilled: 1,
        currency: "EUR",
        status: "published",
        featured: false,
        createdAt: new Date().toISOString(),
      };
      // Every stay gets its crew thread right away, with the host as first member.
      const thread: Thread = { id: crewThreadId(id), type: "crew", stayId: id, participantIds: [currentUserId], messages: [] };
      dispatch({ type: "createStay", stay, thread });
      return stay;
    },
    [currentUserId],
  );

  const requestToJoin = useCallback(
    (stayId: string, message: string) => {
      dispatch({
        type: "requestToJoin",
        request: {
          id: makeId("r"),
          stayId,
          userId: currentUserId,
          message: message.trim(),
          status: "pending",
          createdAt: new Date().toISOString(),
        },
      });
    },
    [currentUserId],
  );

  const sendMessage = useCallback(
    (threadId: string, text: string) => {
      if (!text.trim()) return;
      dispatch({
        type: "sendMessage",
        threadId,
        message: { id: makeId("m"), userId: currentUserId, text: text.trim(), createdAt: new Date().toISOString() },
      });
    },
    [currentUserId],
  );

  const openDirectThread = useCallback(
    (stayId: string, userId: string): string => {
      const existing = threads.find(
        (t) =>
          t.type === "direct" &&
          t.stayId === stayId &&
          t.participantIds.includes(currentUserId) &&
          t.participantIds.includes(userId),
      );
      if (existing) return existing.id;
      const thread: Thread = {
        id: makeId("direct"),
        type: "direct",
        stayId,
        participantIds: [currentUserId, userId],
        messages: [],
      };
      dispatch({ type: "createThread", thread });
      return thread.id;
    },
    [threads, currentUserId],
  );

  const acceptRequest = useCallback(
    (requestId: string) =>
      dispatch({
        type: "acceptRequest",
        requestId,
        systemMessage: { id: makeId("m"), createdAt: new Date().toISOString() },
      }),
    [],
  );
  const declineRequest = useCallback((requestId: string) => dispatch({ type: "declineRequest", requestId }), []);
  const markThreadRead = useCallback(
    (threadId: string) => {
      const last = threads.find((t) => t.id === threadId)?.messages.at(-1);
      if (last) dispatch({ type: "markThreadRead", threadId, at: last.createdAt });
    },
    [threads],
  );
  const lockAccommodation = useCallback(
    (stayId: string, link?: string, pricePerPerson?: number) =>
      dispatch({ type: "lockAccommodation", stayId, link, pricePerPerson }),
    [],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      createStay,
      requestToJoin,
      acceptRequest,
      declineRequest,
      sendMessage,
      openDirectThread,
      markThreadRead,
      lockAccommodation,
    }),
    [state, createStay, requestToJoin, acceptRequest, declineRequest, sendMessage, openDirectThread, markThreadRead, lockAccommodation],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside <StoreProvider>");
  return store;
}

// Selectors – pure helpers over store state.

type StoreData = Pick<StoreState, "users" | "stays" | "joinRequests" | "currentUserId">;

export function findUser(store: Pick<StoreState, "users">, userId: string): User | undefined {
  return store.users.find((u) => u.id === userId);
}

export function getCurrentUser(store: Pick<StoreState, "users" | "currentUserId">): User {
  const user = findUser(store, store.currentUserId);
  if (!user) throw new Error(`Current user ${store.currentUserId} not found`);
  return user;
}

/** Host first, then accepted guests. */
export function getCrew(store: StoreData, stay: Stay): User[] {
  const memberIds = [
    stay.hostId,
    ...store.joinRequests
      .filter((r) => r.stayId === stay.id && r.status === "accepted")
      .map((r) => r.userId),
  ];
  return memberIds.map((id) => findUser(store, id)).filter((u): u is User => Boolean(u));
}

export function isCrewMember(store: StoreData, stay: Stay, userId: string): boolean {
  return (
    stay.hostId === userId ||
    store.joinRequests.some((r) => r.stayId === stay.id && r.userId === userId && r.status === "accepted")
  );
}

export function getMyRequest(store: StoreData, stayId: string): JoinRequest | undefined {
  return store.joinRequests.findLast((r) => r.stayId === stayId && r.userId === store.currentUserId);
}

export function pendingRequestCount(store: StoreData, stayId: string): number {
  return store.joinRequests.filter((r) => r.stayId === stayId && r.status === "pending").length;
}

export function getCrewThread(store: Pick<StoreState, "threads">, stayId: string): Thread | undefined {
  return store.threads.find((t) => t.id === crewThreadId(stayId));
}

/** Unread = the newest message is from someone else (or the system) and newer than the last read mark. */
export function isThreadUnread(store: Pick<StoreState, "lastReadAt" | "currentUserId">, thread: Thread): boolean {
  const last = thread.messages.at(-1);
  if (!last || last.userId === store.currentUserId) return false;
  const readAt = store.lastReadAt[thread.id];
  return !readAt || readAt < last.createdAt;
}
