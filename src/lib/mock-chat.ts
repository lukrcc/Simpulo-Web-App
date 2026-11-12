// Mock chat history: every crew thread with 2+ people gets several days of realistic conversation, direct threads
// a short exchange. Deterministic (seeded per thread, anchored to MOCK_NOW) so server and client build the same
// data. Message texts are user content – written as the crew would, never translated.
import type { Attachment, JoinRequest, Message, Reaction, Stay, Thread, User } from "./types";

/** "Now" for the mock data – the newest generated messages land shortly before it. */
export const MOCK_NOW = "2026-10-22T19:30:00Z";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** mulberry32 – tiny seeded PRNG. */
function rng(seedText: string) {
  let seed = 0;
  for (const char of seedText) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Random = ReturnType<typeof rng>;
const pick = <T,>(random: Random, list: readonly T[]): T => list[Math.floor(random() * list.length)];
const between = (random: Random, min: number, max: number) => min + Math.floor(random() * (max - min + 1));

const VIBE_ACTIVITY: Record<Stay["vibe"], string> = {
  fitness: "gym",
  "surf-water": "surf",
  "remote-work": "cowork session",
  founder: "deep work block",
  creator: "shoot",
  wellness: "yoga",
  adventure: "hike",
  culture: "museum visit",
  party: "night out",
  holiday: "beach day",
  social: "dinner",
  students: "study session",
};

const EMOJI_REPLIES = ["🔥", "🙌", "😂😂", "❤️", "👍", "🤙", "🥳"];
const REACTIONS = ["👍", "❤️", "😂", "🔥", "🙌", "👀"];

// Lines by beat. {name} = someone else in the crew, {city}, {activity}.
const GREETINGS = [
  "Hey everyone! So excited for this 🙌",
  "Hi house 👋 can't wait",
  "Hello hello! Just booked my flight",
  "Hey! Happy to be in. Who's been to {city} before?",
];
const LOGISTICS = [
  "What time is everyone landing? I'm in at 14:20 on the 12th",
  "I land around 9pm, will grab a Grab from the airport",
  "Anyone up for sharing a ride from the airport?",
  "Should we rent scooters for the whole stay? Saw ~€4/day",
  "Scooter guy near the villa does weekly deals, I'll ask",
  "Is there a {activity} spot close by? Want to keep the routine",
  "Found a great {activity} place 6 min away 💪",
  "Groceries split weekly like the rules say? I can do the first run",
  "Do we need adapters there? Type C or G?",
  "I'll bring a speaker and the good coffee",
  "Morning {activity} at 7 tomorrow, who's in?",
  "Late check-in ok with the owner? I might arrive after midnight",
  "Can someone share the wifi speed when we're there? Calls all day for me",
  "Laundry service is like €2/kg around there apparently",
  "What's the plan for the first dinner? I vote local warung",
];
const CHATTER = [
  "Haha same",
  "Love that",
  "Perfect, thanks {name}!",
  "Agree with {name}",
  "Sounds good to me",
  "Let's do it",
  "Wait really? 😅",
  "Counting the days now",
  "Just watched a video of {city} sunsets, unreal",
  "Does anyone cook? I make a decent pasta",
  "I'm in for that",
  "Noted 👌",
];
const LINK_INTROS = ["What about this one?", "Found another option:", "This looks good, pool + fast wifi", "Bit pricier but look at the kitchen"];
const PLANS = [
  "Rough plan for week one:\n– Day 1: arrive, groceries, early night\n– Day 2: {activity} + explore {city}\n– Day 3: everyone works, dinner together\nOpen to changes!",
  "Packing list I'm using:\n• adapter\n• reef shoes\n• sunscreen (it's pricey there)\n• headphones for calls\nAnything I'm missing?",
  "Ok here's the deal with the villa:\n1. check-in from 15:00\n2. cleaning twice a week\n3. owner lives next door if anything breaks\nLink is in the pinned card above.",
];
const DIRECT_LINES = [
  "Hey! Quick question about the House",
  "How's the wifi at the place? I take a lot of calls",
  "Is it ok if I arrive a day later?",
  "Totally, no problem",
  "Thanks for the quick reply!",
  "Are you more of an early riser or night owl?",
  "Early – I like a quiet morning before work",
  "Same here 🙌",
  "Do you know if there's parking for a scooter?",
  "Yes, right in front of the gate",
  "Great, see you there then",
  "Let me know if you have any other questions",
  "Will do. Really looking forward to it",
  "👍",
  "Sent you the details in the House chat",
];

function fill(template: string, values: { name: string; city: string; activity: string }): string {
  return template.replace("{name}", values.name).replace("{city}", values.city).replace("{activity}", values.activity);
}

interface Seed {
  stays: Stay[];
  users: User[];
  joinRequests: JoinRequest[];
}

/** Evening-heavy timestamps over the last few days: clusters 17:00–23:30, a few mornings, nothing overnight. */
function timeline(random: Random, count: number, days: number, endAt: number): number[] {
  const times: number[] = [];
  const dayStart = (d: number) => {
    const date = new Date(endAt - d * DAY);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  };
  const perDay = Math.ceil(count / days);
  for (let d = days - 1; d >= 0 && times.length < count; d--) {
    const base = dayStart(d);
    // Optional short morning cluster, then the evening.
    const clusters = random() < 0.4 ? [8 * HOUR + between(random, 0, 90) * MINUTE, 18 * HOUR] : [17 * HOUR + between(random, 0, 120) * MINUTE];
    let remaining = Math.min(perDay + between(random, -2, 3), count - times.length);
    for (const start of clusters) {
      let at = base + start;
      const inCluster = clusters.length === 2 && start < 12 * HOUR ? Math.min(3, remaining) : remaining;
      for (let i = 0; i < inCluster; i++) {
        at += (random() < 0.7 ? between(random, 1, 4) : between(random, 6, 40)) * MINUTE;
        // Stop before midnight and before "now".
        if (at > base + 23.5 * HOUR || at > endAt) break;
        times.push(at);
        remaining--;
      }
    }
  }
  return times.toSorted((a, b) => a - b);
}

let counter = 0;
const nextId = (threadId: string) => `${threadId}-g${++counter}`;

/** Adds generated history to every thread; returns threads plus lastReadAt marks (a few unread at the end). */
export function withMockHistory(threads: Thread[], seed: Seed): { threads: Thread[]; lastReadAt: Record<string, string> } {
  counter = 0;
  const lastReadAt: Record<string, string> = {};
  const endAt = new Date(MOCK_NOW).getTime();
  const userName = (id: string) => seed.users.find((u) => u.id === id)?.name.split(" ")[0] ?? "";

  const result = threads.map((thread) => {
    const stay = seed.stays.find((s) => s.id === thread.houseId);
    const people = [...new Set(thread.participantIds)];
    if (!stay || people.length < 2) return thread;
    const random = rng(thread.id);
    const generated: Message[] = [];
    const city = stay.city || stay.region.split(",")[0];
    const activity = VIBE_ACTIVITY[stay.vibe];
    // Past Houses: the chat happened before the trip, not this week.
    const anchor =
      stay.status === "completed"
        ? new Date(`${stay.startDate}T00:00:00Z`).getTime() - 3 * DAY
        : // Booked: the planning chat ends before the booking confirmation line.
          stay.bookingConfirmedAt
          ? new Date(stay.bookingConfirmedAt).getTime() - HOUR
          : endAt;

    const say = (senderId: string, text: string, extra: Partial<Message> = {}): Message => ({
      id: nextId(thread.id),
      threadId: thread.id,
      senderId,
      text,
      createdAt: "",
      ...extra,
    });
    const line = (key: NonNullable<Message["event"]>["key"], values: Record<string, string | number> = {}) =>
      say("system", "", { type: "system", event: { key, values } });
    const someoneElse = (userId: string) => userName(pick(random, people.filter((p) => p !== userId)));

    if (thread.type === "direct") {
      const total = between(random, 8, 15);
      for (let i = 0; i < total; i++) {
        const from = people[i % 2];
        generated.push(say(from, DIRECT_LINES[(i + between(random, 0, 2)) % DIRECT_LINES.length]));
      }
    } else {
      const total = between(random, 25, 60);
      const host = stay.hostId;
      const members = people.filter((p) => p !== host);
      // Story beats in order; chatter fills the gaps up to `total`. Payments and the lock never show here – they're on
      // the House page.
      const beats: Message[] = [];
      // Each member greets with a different line (they repeat only past the list's end).
      const greetingOffset = between(random, 0, GREETINGS.length - 1);
      members.forEach((member, m) => {
        beats.push(line("joined", { name: userName(member) }));
        beats.push(say(member, fill(GREETINGS[(m + greetingOffset) % GREETINGS.length], { name: userName(host), city, activity })));
      });
      if (stay.spotsFilled >= stay.spotsTotal) beats.push(line("crewComplete"));
      const linkCount = between(random, 2, 3);
      const linkOffset = between(random, 0, LINK_INTROS.length - 1);
      for (let i = 0; i < linkCount; i++) {
        const url = i === linkCount - 1 && stay.accommodationLink ? stay.accommodationLink : `https://www.${pick(random, ["airbnb.com/rooms", "booking.com/hotel"])}/${stay.slug}-${i + 1}`;
        // Each link its own intro – never the same line twice in one chat.
        beats.push(say(pick(random, people), `${LINK_INTROS[(i + linkOffset) % LINK_INTROS.length]} ${url}`, { type: "link" }));
      }
      beats.push(say(pick(random, people), fill(pick(random, PLANS), { name: "", city, activity })));
      // Photos from the House's own (local, public/mock/houses) – never an outside image host that may not answer.
      const pool = stay.photos ?? [];
      const imageCount = pool.length > 0 ? between(random, 1, 2) : 0;
      for (let i = 0; i < imageCount; i++) {
        const attachments: Attachment[] = Array.from({ length: i === 0 ? 1 : 2 }, (_, n) => ({
          kind: "image",
          url: pool[(i * 2 + n + 1) % pool.length],
          name: `IMG_${2040 + i * 10 + n}.jpg`,
        }));
        beats.push(say(pick(random, people), i === 0 ? "View from the place 😍" : "", { type: "image", attachments }));
      }
      const beatSlots = new Set<number>();
      // Spread beats across the history.
      beats.forEach((_, i) => beatSlots.add(Math.min(total - 1, Math.round(((i + 1) / (beats.length + 2)) * total))));
      let beat = 0;
      const usedLines = new Set<string>();
      for (let i = 0; i < total; i++) {
        if (beatSlots.has(i) && beat < beats.length) {
          generated.push(beats[beat++]);
          continue;
        }
        const from = pick(random, people);
        const roll = random();
        // A line of logistics or chatter appears once per chat (a second "Found a great … place" reads like a bug); emoji may repeat.
        const fresh = (lines: readonly string[]) => {
          const unused = lines.filter((line) => !usedLines.has(line));
          const line = pick(random, unused.length > 0 ? unused : lines);
          usedLines.add(line);
          return line;
        };
        const text =
          roll < 0.12 ? pick(random, EMOJI_REPLIES) : roll < 0.5 ? fill(fresh(LOGISTICS), { name: someoneElse(from), city, activity }) : fill(fresh(CHATTER), { name: someoneElse(from), city, activity });
        // Never the same text twice in a row from the generator.
        if (generated.at(-1)?.text === text) continue;
        generated.push(say(from, text));
      }
      while (beat < beats.length) generated.push(beats[beat++]);
    }

    const days = thread.type === "direct" ? between(random, 1, 3) : between(random, 3, 6);
    const times = timeline(random, generated.length, days, anchor);
    // If clusters filled fewer slots than messages, squeeze the rest in minute steps after the last one.
    const stamped = generated.map((message, i) => ({
      ...message,
      createdAt: new Date(times[i] ?? (times.at(-1) ?? anchor - HOUR) + (i - times.length + 1) * MINUTE).toISOString(),
    }));

    // Replies and reactions on some messages (only on people's messages).
    const human = stamped.filter((m) => m.senderId !== "system");
    human.forEach((message, i) => {
      if (i > 3 && random() < 0.08) {
        const target = human[between(random, Math.max(0, i - 6), i - 1)];
        message.replyToId = target.id;
      }
      if (random() < 0.18) {
        const reactors = people.filter((p) => p !== message.senderId && random() < 0.6);
        if (reactors.length > 0) {
          const reactions: Reaction[] = [{ emoji: pick(random, REACTIONS), userIds: reactors }];
          if (random() < 0.25) reactions.push({ emoji: pick(random, REACTIONS.filter((r) => r !== reactions[0].emoji)), userIds: [reactors[0]] });
          message.reactions = reactions;
        }
      }
    });

    // Booked: the host confirmed it, and the address is on the House page now.
    if (thread.type === "house" && stay.bookingConfirmedAt) {
      stamped.push({ ...line("bookingConfirmed"), createdAt: stay.bookingConfirmedAt }, { ...line("addressShared"), createdAt: stay.bookingConfirmedAt });
    }
    const messages = [...thread.messages, ...stamped].toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
    // Leave the newest few unread in about half the threads.
    const unread = random() < 0.5 ? between(random, 2, 6) : 0;
    const readUpTo = messages.at(-1 - unread);
    if (readUpTo && stay.status !== "completed") lastReadAt[thread.id] = readUpTo.createdAt;
    else if (messages.at(-1)) lastReadAt[thread.id] = messages.at(-1)!.createdAt;
    return { ...thread, messages };
  });

  return { threads: result, lastReadAt };
}
