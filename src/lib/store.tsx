"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { joinRequests as mockJoinRequests, stays as mockStays, threads as mockThreads, users as mockUsers } from "./mock";
import { crewThreadId, mockLastReadAt } from "./mock-extras";
import type { JoinRequest, Message, NewStayInput, Stay, Thread, User } from "./types";
import { makeId, slugify } from "./utils";

export { crewThreadId };

interface StoreState {
  users: User[];
  stays: Stay[];
  joinRequests: JoinRequest[];
  threads: Thread[];
  /** null = logged out (mock auth) */
  currentUserId: string | null;
  /** threadId → ISO timestamp of the newest message the current user has seen */
  lastReadAt: Record<string, string>;
}

// Actions that belong to "the current user" leave the user out: the reducer fills in state.currentUserId when it
// processes them. So an action dispatched right after login() in the same click already acts as the new user.
type StoreAction =
  | { type: "login"; userId: string }
  | { type: "logout" }
  | { type: "updateCurrentUser"; patch: ProfilePatch }
  | { type: "createStay"; stay: Omit<Stay, "hostId">; threadId: string }
  | { type: "requestToJoin"; request: Omit<JoinRequest, "userId"> }
  | { type: "acceptRequest"; requestId: string; systemMessage: Pick<Message, "id" | "createdAt"> }
  | { type: "declineRequest"; requestId: string }
  | { type: "sendMessage"; threadId: string; message: Omit<Message, "userId"> }
  | { type: "createThread"; thread: Thread }
  | { type: "markThreadRead"; threadId: string; at: string }
  | { type: "lockAccommodation"; stayId: string; link?: string; pricePerPerson?: number }
  | { type: "setAcceptingRequests"; stayId: string; accepting: boolean };

/** The profile bits the Create flow's "About you" step and the photo sheet can change. */
export type ProfilePatch = Partial<
  Pick<
    User,
    | "name"
    | "age"
    | "country"
    | "bio"
    | "languages"
    | "photos"
    | "instagram"
    | "tiktok"
    | "youtube"
    | "twitch"
    | "kick"
    | "linkedin"
    | "x"
    | "website"
  >
>;

interface StoreActions {
  login: (userId: string) => void;
  logout: () => void;
  updateCurrentUser: (patch: ProfilePatch) => void;
  /** Creates a House hosted by the current user. Returns its slug. */
  createStay: (input: NewStayInput) => string;
  requestToJoin: (stayId: string, message: string) => void;
  acceptRequest: (requestId: string) => void;
  declineRequest: (requestId: string) => void;
  sendMessage: (threadId: string, text: string) => void;
  /**
   * Finds or creates the 1:1 thread between the current user and `userId` about a stay. Returns its id.
   * Pass `asUserId` when calling right after login (e.g. from a requireAuth callback), before the new user is in state.
   */
  openDirectThread: (stayId: string, userId: string, asUserId?: string) => string;
  markThreadRead: (threadId: string) => void;
  lockAccommodation: (stayId: string, link?: string, pricePerPerson?: number) => void;
  /** Host's "Taking requests" switch. Nothing else ever changes it. */
  setAcceptingRequests: (stayId: string, accepting: boolean) => void;
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
  currentUserId: null,
  lastReadAt: mockLastReadAt,
};

/** Mock auth: the chosen user survives a refresh. */
const MOCK_USER_KEY = "simpulo:mock-user";

function updateThread(threads: Thread[], threadId: string, update: (t: Thread) => Thread): Thread[] {
  return threads.map((t) => (t.id === threadId ? update(t) : t));
}

function reducer(state: StoreState, action: StoreAction): StoreState {
  const me = state.currentUserId;
  switch (action.type) {
    case "login":
      return state.users.some((u) => u.id === action.userId) ? { ...state, currentUserId: action.userId } : state;

    case "logout":
      return { ...state, currentUserId: null };

    case "updateCurrentUser":
      if (!me) return state;
      return { ...state, users: state.users.map((u) => (u.id === me ? { ...u, ...action.patch } : u)) };

    case "createStay": {
      if (!me) return state;
      // Every House gets its crew thread right away, with the host as first member.
      const thread: Thread = { id: action.threadId, type: "crew", stayId: action.stay.id, participantIds: [me], messages: [] };
      return { ...state, stays: [{ ...action.stay, hostId: me }, ...state.stays], threads: [thread, ...state.threads] };
    }

    case "requestToJoin": {
      if (!me) return state;
      const stay = state.stays.find((s) => s.id === action.request.stayId);
      const alreadyAsked = state.joinRequests.some(
        (r) => r.stayId === action.request.stayId && r.userId === me && r.status !== "declined",
      );
      // The host can't join their own House; a second request would only duplicate the first; a House that
      // isn't taking requests doesn't get new ones.
      if (!stay || stay.hostId === me || alreadyAsked || !stay.acceptingRequests) return state;
      return { ...state, joinRequests: [...state.joinRequests, { ...action.request, userId: me }] };
    }

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
        // Only the spot count changes – whether the House keeps taking requests is the host's call.
        stays: state.stays.map((s) => (s.id === stay.id ? { ...s, spotsFilled } : s)),
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
      if (!me) return state;
      return {
        ...state,
        threads: updateThread(state.threads, action.threadId, (t) => ({
          ...t,
          messages: [...t.messages, { ...action.message, userId: me }],
        })),
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

    case "setAcceptingRequests":
      return {
        ...state,
        stays: state.stays.map((s) => (s.id === action.stayId ? { ...s, acceptingRequests: action.accepting } : s)),
      };

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

  // Restore the mock user after a refresh (client only, so the server render stays logged out).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MOCK_USER_KEY);
      if (saved) dispatch({ type: "login", userId: saved });
    } catch {
      // storage unavailable – stay logged out
    }
  }, []);

  const login = useCallback((userId: string) => {
    dispatch({ type: "login", userId });
    try {
      localStorage.setItem(MOCK_USER_KEY, userId);
    } catch {
      // not persisted, still logged in for this visit
    }
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: "logout" });
    try {
      localStorage.removeItem(MOCK_USER_KEY);
    } catch {
      // nothing to clean up
    }
  }, []);

  const updateCurrentUser = useCallback((patch: ProfilePatch) => dispatch({ type: "updateCurrentUser", patch }), []);

  const createStay = useCallback((input: NewStayInput): string => {
    const id = makeId("s");
    const slug = `${slugify(input.title) || "house"}-${id.slice(-4)}`;
    dispatch({
      type: "createStay",
      threadId: crewThreadId(id),
      stay: {
        ...input,
        id,
        slug,
        // No geocoding yet: created Houses have no coordinates and no static map preview.
        lat: 0,
        lng: 0,
        mapPreviewUrl: "",
        spotsFilled: 1,
        currency: "EUR",
        status: "published",
        acceptingRequests: true,
        featured: false,
        createdAt: new Date().toISOString(),
      },
    });
    return slug;
  }, []);

  const requestToJoin = useCallback((stayId: string, message: string) => {
    dispatch({
      type: "requestToJoin",
      request: { id: makeId("r"), stayId, message: message.trim(), status: "pending", createdAt: new Date().toISOString() },
    });
  }, []);

  const sendMessage = useCallback((threadId: string, text: string) => {
    if (!text.trim()) return;
    dispatch({
      type: "sendMessage",
      threadId,
      message: { id: makeId("m"), text: text.trim(), createdAt: new Date().toISOString() },
    });
  }, []);

  const openDirectThread = useCallback(
    (stayId: string, userId: string, asUserId?: string): string => {
      const me = asUserId ?? currentUserId;
      if (!me) return "";
      const existing = threads.find(
        (t) =>
          t.type === "direct" &&
          t.stayId === stayId &&
          t.participantIds.includes(me) &&
          t.participantIds.includes(userId),
      );
      if (existing) return existing.id;
      const thread: Thread = {
        id: makeId("direct"),
        type: "direct",
        stayId,
        participantIds: [me, userId],
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
  const setAcceptingRequests = useCallback(
    (stayId: string, accepting: boolean) => dispatch({ type: "setAcceptingRequests", stayId, accepting }),
    [],
  );
  const lockAccommodation = useCallback(
    (stayId: string, link?: string, pricePerPerson?: number) =>
      dispatch({ type: "lockAccommodation", stayId, link, pricePerPerson }),
    [],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      login,
      logout,
      updateCurrentUser,
      createStay,
      requestToJoin,
      acceptRequest,
      declineRequest,
      sendMessage,
      openDirectThread,
      markThreadRead,
      lockAccommodation,
      setAcceptingRequests,
    }),
    [state, login, logout, updateCurrentUser, createStay, requestToJoin, acceptRequest, declineRequest, sendMessage, openDirectThread, markThreadRead, lockAccommodation, setAcceptingRequests],
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

/** The logged-in user, or undefined when logged out. */
export function getCurrentUser(store: Pick<StoreState, "users" | "currentUserId">): User | undefined {
  return store.currentUserId ? findUser(store, store.currentUserId) : undefined;
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

export function isCrewMember(store: StoreData, stay: Stay, userId: string | null): boolean {
  if (!userId) return false;
  return (
    stay.hostId === userId ||
    store.joinRequests.some((r) => r.stayId === stay.id && r.userId === userId && r.status === "accepted")
  );
}

export function getMyRequest(store: StoreData, stayId: string): JoinRequest | undefined {
  if (!store.currentUserId) return undefined;
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
