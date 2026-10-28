// src/lib/mock.ts – Simpulo mock data (no backend)
// Images: local WebP files in public/mock, fetched once from Pixabay by scripts/fetch-mock-images.ts (queries and
// paths in ./mock-images). Map placeholders still come from picsum.photos (next.config: images.remotePatterns).
import { FACE_QUERIES, THEME_QUERIES, THEME_QUERY_FIXES, houseThemePath, userFacePath as userFace, userPhotoPath } from './mock-images';
import { extraHosts, extraHouses, type ExtraHost, type ExtraHouse } from './mock-houses-extra';

export type Vibe =
  | 'fitness' | 'surf' | 'creator' | 'streaming' | 'founder' | 'remote-work' | 'trading' | 'wellness' | 'yoga'
  | 'diving' | 'climbing' | 'language' | 'students' | 'holiday'
  | 'mixed' // mixed: fits no single vibe – also the filter key of Houses with a custom vibe (Stay.customVibe)
  | 'party' | 'singles' | 'weekend' | 'business' | 'social' | 'adventure' | 'culture' | 'food' | 'study';
export type AccommodationStatus = 'open' | 'locked';
/** Currencies a host can price a House in. */
export type Currency = 'EUR' | 'USD' | 'IDR' | 'GBP' | 'AUD' | 'THB';

// booked = paid + booking confirmed; closed = host ended it early; draft_unclaimed = prepared by Simpulo for someone
// who hasn't claimed it yet (no host, never listed – see Stay.claim)
export type StayStatus = 'draft_unclaimed' | 'draft' | 'published' | 'booked' | 'completed' | 'closed';
export type RequestStatus = 'pending' | 'accepted' | 'declined';

/**
 * Where someone came from: the `ref` (the user whose share link they opened) and the UTM tags of their first visit
 * (first touch, see src/lib/growth.ts). Copied onto the user at signup and onto every request and payment.
 */
export interface Attribution {
  refUserId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface User extends Attribution {
  id: string;
  name: string;
  age: number;
  country: string;          // plain text, no flag
  city: string;             // current base
  languages: string[];      // ISO-ish labels shown as text: "English", "German"
  bio: string;
  photos: string[];         // [0] = face, then the theme photos of their House (see the photo pass at the end)
  facePhotoQuery?: string;  // Pixabay search for the face photo (mock only)
  imageQueries?: string[];  // Pixabay searches (mock only): [0] portrait (= facePhotoQuery), [1..2] lifestyle photos
  verified: boolean;
  /** Professional host: runs hosted experiences ("Pro host" label – feature flag hostPremium) */
  isPro: boolean;
  /** May add a host fee to their Houses (feature flag hostPremium) */
  canChargeHostFee: boolean;
  /** One line on pro profiles, e.g. "Surf coach · ISA Level 2" */
  proTitle?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
  x?: string;
  threads?: string;
  twitch?: string;
  kick?: string;            // Kick username
  website?: string;
  preferredCurrency?: Currency; // for approximate conversions only; unset = from the browser locale
  privateContacts?: PrivateContacts; // crew only – see canSeePrivateContacts in the store
  savedStayIds?: string[];  // hearted Houses ("Saved" on the Houses page)
  hostAlerts?: string[];    // host ids: notify me when they open a House ("Notify me" on profiles; no counts anywhere)
  email?: string;           // account email (mock) – shown in Settings
  signInMethod?: 'apple' | 'google' | 'email';
  settings?: UserSettings;  // unset = defaults (everything on, nobody blocked)
  deletedAt?: string;       // mock "Delete account"
}

export type ReportReason = 'spam' | 'harassment' | 'fake' | 'unsafe' | 'other';

/** Mock moderation queue entry (Report sheet). */
export interface Report {
  id: string;
  reporterId: string;
  target: { kind: 'user' | 'stay' | 'message'; id: string };
  reason: ReportReason;
  text?: string;
  createdAt: string;
}

export type NotificationGroup = 'requests' | 'messages' | 'payments' | 'hostAlerts';

export interface UserSettings {
  notifications: Record<NotificationGroup, { push: boolean; email: boolean }>;
  blockedUserIds: string[];
}

/** Direct channels a user shares only with people they live with (accepted crews). */
export interface PrivateContacts {
  whatsapp?: string;        // E.164, e.g. '+4917612345678'
  telegram?: string;        // handle without @
  signal?: string;          // E.164
  discord?: string;         // 'nico#0421' or an invite handle
  phone?: string;           // E.164
  facetime?: string;        // phone or Apple ID email – shown on Apple devices only
}

export interface Stay {
  id: string;
  slug: string;
  title: string;
  hostId: string;
  vibe: Vibe;
  language: string;         // ISO 639-1 code the House runs in ('en', 'de', 'ja') – one of the host's languages
  city: string;
  region: string;           // "Bali, Indonesia"
  lat: number;
  lng: number;
  mapPreviewUrl: string;    // static map placeholder
  startDate: string;        // ISO
  endDate: string;
  spotsTotal: number;
  spotsFilled: number;
  budgetPerPerson?: { min: number; max: number };
  pricePerPerson?: number;  // only when locked
  currency: Currency;       // everything on the House is stored and charged in this currency
  accommodationStatus: AccommodationStatus;
  accommodationLink?: string;
  description: string;
  whyText: string;
  dayText: string;
  lookingForText: string;
  houseRules: string[];
  interests: string[];
  status: StayStatus;
  acceptingRequests: boolean; // host's "Taking requests" switch – never flipped automatically
  featured: boolean;        // shown in Spotlight (later: boosted)
  hostNote?: string;        // short personal line from the host, max 60 chars (shown on cards)
  customVibe?: string;      // host's own vibe label (max 20 chars); `vibe` is then 'mixed'
  themeQueries?: string[];  // Pixabay searches for the House's theme photos (mock only)
  imageQueries?: string[];  // the same searches, as listed in the data: [0] cover, then the gallery
  photos?: string[];        // theme photos – the gallery is the host's face, then these (none for Houses opened in the app)
  createdAt: string;
  // Set when the host locks the accommodation (payments are created then):
  lockedAt?: string;
  totalPrice?: number;      // whole place, in `currency`
  payByDate?: string;       // YYYY-MM-DD
  // After everyone paid and the host uploaded the booking:
  bookingConfirmedAt?: string;
  bookingProofUrl?: string;
  /** Optional host fee on top of the stay share ("Host experience": coaching, guestlists …): per person, ≤ 30 % of the
   *  share, hosts with canChargeHostFee only. Feature flag hostPremium – off, the store hides it. */
  hostFeePerPerson?: number;
  /** What the host fee pays for – a checklist on the House page */
  hostOffer?: string[];
  /** The ages the host is aiming for ("Looking for 27–38") – shown only, no filter */
  ageRange?: { min: number; max: number };
  /** Prepared on behalf of someone (admin): who it's for and the claim link. Kept after the claim, with claimedAt. */
  claim?: StayClaim;
  /** "Do it again?": the House this draft was copied from */
  duplicatedFrom?: string;
}

/** A House Simpulo prepared for a creator from their own post – they claim it via /claim/{token}. */
export interface StayClaim {
  token: string;
  name: string;             // who it's for, shown until claimed
  photoUrl: string;
  sourceLink: string;       // the original post the House was prepared from
  createdAt: string;
  claimedAt?: string;
  claimedBy?: string;
}

export type PaymentRecordStatus = 'pending' | 'paid' | 'refunded';

/** One crew member's share of a locked place. Fee rules: src/lib/fees.ts. */
export interface Payment extends Attribution {
  id: string;
  stayId: string;
  userId: string;
  share: number;
  hostFee?: number;         // the host programme (Stay.hostFeePerPerson) – 0 / unset for the host's own share
  fee: number;              // guest fee: 10 % of the share, min 10, max 50 (house currency)
  total: number;            // share + hostFee + fee – what the guest pays
  status: PaymentRecordStatus;
  paidAt?: string;
}

export interface JoinRequest extends Attribution {
  id: string;
  stayId: string;
  userId: string;
  message: string;
  status: RequestStatus;
  createdAt: string;
}

export type MessageType = 'text' | 'image' | 'link' | 'lock' | 'payment' | 'system';

export interface Attachment {
  kind: 'image' | 'file';
  url: string;
  name?: string;
  size?: number;            // bytes
}

export interface Reaction {
  emoji: string;
  userIds: string[];
}

/** What a "lock" message carries: the booked place and what everyone pays by when. */
export interface LockDetails {
  link: string;
  title: string;
  total: number;
  perPerson: number;
  spots: number;
  payBy: string;            // ISO date
}

export interface Message {
  id: string;
  userId: string | 'system';
  text: string;
  createdAt: string;
  type?: MessageType;       // missing = derived: system → 'system', images → 'image', has a link → 'link', else 'text'
  lock?: LockDetails;       // type 'lock' only
  attachments?: Attachment[];
  replyToId?: string;
  reactions?: Reaction[];
  event?: MessageEvent;     // app-generated lines (joined, locked, paid …) – rendered from translations; text stays ''
}

/** App-generated chat line: a translation key plus its values (numbers like prices are formatted when shown). */
export type SystemEventKey =
  | 'joined' | 'left' | 'removed' | 'locked' | 'unlocked' | 'closed' | 'paid' | 'bookingConfirmed'
  | 'reminderPayment' | 'reminderArrival';
export interface MessageEvent {
  key: SystemEventKey;
  values: Record<string, string | number>;
}

export interface Thread {
  id: string;
  type: 'crew' | 'direct';
  stayId: string;
  participantIds: string[];
  messages: Message[];
}

const map = (seed: string) => `https://picsum.photos/seed/map-${seed}/800/500?grayscale`;

export const CURRENT_USER_ID = 'u1';

/** The original people; isPro / canChargeHostFee are filled in below (see `users`). */
const coreUsers: Omit<User, 'isPro' | 'canChargeHostFee'>[] = [
  {
    id: 'u1', name: 'Lukas', age: 30, country: 'Germany', city: 'Osaka',
    languages: ['German', 'English'],
    bio: 'Remote app-dev teacher. Train every morning, work German hours, free before 3 pm.',
    photos: [userFace('u1')],
    verified: true, instagram: 'lukas.moves', website: 'https://simpulo.app', savedStayIds: ['s2', 's13', 's19'], hostAlerts: ['u18'],
    email: 'lukas@simpulo.app', signInMethod: 'apple',
    settings: {
      notifications: { requests: { push: true, email: true }, messages: { push: true, email: false }, payments: { push: true, email: true }, hostAlerts: { push: false, email: true } },
      blockedUserIds: ['u14'],
    },
    privateContacts: { whatsapp: '+4917612345678', telegram: 'lukasmoves', facetime: 'lukas.moves@icloud.com' },
  },
  {
    id: 'u2', name: 'Mara', age: 27, country: 'Netherlands', city: 'Canggu',
    languages: ['Dutch', 'English', 'Spanish'],
    bio: 'Travel creator, 18k on TikTok. Filming a Bali series this winter.',
    photos: [userFace('u2')],
    verified: true, instagram: 'mara.goes', tiktok: 'mara.goes', youtube: '@maragoes', linkedin: 'mara-de-vries', x: 'maragoes', threads: 'mara.goes', website: 'https://maragoes.com', privateContacts: { whatsapp: '+31612345678', telegram: 'mara_goes', signal: '+31612345678', facetime: '+31612345678' },
  },
  {
    id: 'u3', name: 'Tom', age: 33, country: 'United Kingdom', city: 'Lisbon',
    languages: ['English', 'Portuguese'],
    bio: 'Building a fintech side project. Surf before standup.',
    photos: [userFace('u3')],
    verified: true, linkedin: 'tom-ellis', x: 'tomellis', website: 'https://tomellis.dev', privateContacts: { phone: '+447700900123' },
  },
  {
    id: 'u4', name: 'Aisha', age: 29, country: 'Australia', city: 'Melbourne',
    languages: ['English'],
    bio: 'Physio & Muay Thai nerd. Looking for people who train seriously and eat well.',
    photos: [userFace('u4')],
    verified: true, instagram: 'aisha.fights', youtube: '@aishafights', tiktok: 'aisha.fights', privateContacts: { whatsapp: '+61412345678', telegram: 'aishafights' },
  },
  {
    id: 'u5', name: 'Jonas', age: 25, country: 'Sweden', city: 'Chiang Mai',
    languages: ['Swedish', 'English', 'German'],
    bio: 'Freelance motion designer. Night owl, coffee snob, always up for a hike.',
    photos: [userFace('u5')],
    verified: false, instagram: 'jonas.motion', threads: 'jonas.motion', linkedin: 'jonas-lind', privateContacts: { whatsapp: '+46701234567', signal: '+46701234567' },
  },
  {
    id: 'u6', name: 'Priya', age: 31, country: 'India', city: 'Bangkok',
    languages: ['Hindi', 'English'],
    bio: 'Product manager on a 6-month sabbatical. Yoga, markets, slow mornings.',
    photos: [userFace('u6')],
    verified: true, linkedin: 'priya-nair', instagram: 'priya.slow', privateContacts: { whatsapp: '+919812345678' },
  },
  {
    id: 'u7', name: 'Diego', age: 28, country: 'Mexico', city: 'Da Nang',
    languages: ['Spanish', 'English'],
    bio: 'Streams indie game dev on Twitch. Need a house with fast wifi and a pool.',
    photos: [userFace('u7')],
    verified: true, twitch: 'diegobuilds', x: 'diegobuilds', website: 'https://diegobuilds.gg', privateContacts: { whatsapp: '+525512345678', discord: 'diegobuilds#7731' },
  },
  {
    id: 'u8', name: 'Lena', age: 24, country: 'Austria', city: 'Berlin',
    languages: ['German', 'English', 'French'],
    bio: 'Medical student on a gap semester. First solo trip – want a crew, not a hostel.',
    photos: [userFace('u8')],
    verified: false, instagram: 'lena.wanders', tiktok: 'lena.wanders', threads: 'lena.wanders', privateContacts: {},
  },
  { id: 'u9', name: 'Sofia', age: 26, country: 'Italy', city: 'Canggu',
    languages: ['Italian', 'English'],
    bio: 'Pilates instructor and sunrise person. Teaching at two studios in Canggu this season.',
    photos: [userFace('u9')],
    verified: true, instagram: 'sofia.flows', tiktok: 'sofia.flows', youtube: '@sofiaflows', privateContacts: { whatsapp: '+393471234567', telegram: 'sofiaflows', facetime: 'sofia.flows@icloud.com' },
  },
  { id: 'u10', name: 'Ben', age: 35, country: 'Canada', city: 'Mexico City',
    languages: ['English', 'French', 'Spanish'],
    bio: 'Ex-agency, now solo consultant. Cooking is how I make friends.',
    photos: [userFace('u10')],
    verified: true, linkedin: 'ben-carter', website: 'https://bencarter.co', privateContacts: { whatsapp: '+14165550123' },
  },
  { id: 'u11', name: 'Yuki', age: 28, country: 'Japan', city: 'Osaka',
    languages: ['Japanese', 'English'],
    bio: 'UX designer, first long trip outside Japan. Quiet, tidy, loves a good café.',
    photos: [userFace('u11')],
    verified: true, instagram: 'yuki.makes', threads: 'yuki.makes', privateContacts: { telegram: 'yukimakes' },
  },
  { id: 'u12', name: 'Marco', age: 32, country: 'Brazil', city: 'Florianópolis',
    languages: ['Portuguese', 'English', 'Spanish'],
    bio: 'Jiu-jitsu brown belt, runs a small SaaS. Looking for mats and a pool.',
    photos: [userFace('u12')],
    verified: true, instagram: 'marco.rolls', youtube: '@marcorolls', x: 'marcorolls', privateContacts: { whatsapp: '+5548991234567' },
  },
  { id: 'u13', name: 'Hannah', age: 29, country: 'Ireland', city: 'Lisbon',
    languages: ['English'],
    bio: 'Writes a newsletter about slow travel (9k subs). Tea, books, long walks.',
    photos: [userFace('u13')],
    verified: true, instagram: 'hannah.slowly', website: 'https://slowly.substack.com', privateContacts: { whatsapp: '+353851234567', telegram: 'hannahslowly' },
  },
  { id: 'u14', name: 'Karim', age: 27, country: 'France', city: 'Bangkok',
    languages: ['French', 'English', 'Arabic'],
    bio: 'Runs a Shopify store from anywhere with wifi. Gym at 6, calls at 15.',
    photos: [userFace('u14')],
    verified: false, instagram: 'karim.ships', tiktok: 'karim.ships', privateContacts: { whatsapp: '+33612345678' },
  },
  { id: 'u15', name: 'Emma', age: 24, country: 'Denmark', city: 'Copenhagen',
    languages: ['Danish', 'English', 'German'],
    bio: 'Nursing degree done, three months off before the first job. First time in Asia.',
    photos: [userFace('u15')],
    verified: false, instagram: 'emma.away', tiktok: 'emma.away', threads: 'emma.away', privateContacts: {},
  },
  { id: 'u16', name: 'Raj', age: 31, country: 'Singapore', city: 'Singapore',
    languages: ['English', 'Tamil', 'Mandarin'],
    bio: 'Backend engineer, remote for a US startup. Nights are free, days are mine.',
    photos: [userFace('u16')],
    verified: true, linkedin: 'raj-menon', x: 'rajbuilds', twitch: 'rajbuilds', privateContacts: { phone: '+6581234567' },
  },
  // No photos yet – exercises the "No photo yet" / "Add a photo" paths.
  { id: 'u17', name: 'Noah', age: 26, country: 'Belgium', city: 'Ghent',
    languages: ['Dutch', 'English', 'French'],
    bio: 'Just signed up – looking for my first shared house.',
    photos: [], verified: false, instagram: 'noah.ghent', linkedin: 'noah-peeters', privateContacts: { whatsapp: '+32470123456' },
  },
  // Streaming hosts
  { id: 'u18', name: 'Nico', age: 29, country: 'Germany', city: 'Lisbon',
    languages: ['German', 'English', 'Portuguese'],
    bio: 'Twitch variety streamer, 40k followers. Live most evenings, always up for a raid.',
    photos: [userFace('u17')],
    verified: true, twitch: 'nicoplays', kick: 'nicoplays', youtube: '@nicoplays', instagram: 'nico.plays', privateContacts: { whatsapp: '+4915112345678', telegram: 'nicoplays', discord: 'nico#0421' },
  },
  { id: 'u19', name: 'Sasha', age: 26, country: 'Ukraine', city: 'Bangkok',
    languages: ['Ukrainian', 'English', 'Russian'],
    bio: 'IRL and travel streamer. Street food, night markets and a backpack full of batteries.',
    photos: [userFace('u19')],
    verified: true, kick: 'sashairl', twitch: 'sashairl', tiktok: 'sasha.irl', privateContacts: { telegram: 'sashairl', discord: 'sashairl' },
  },
  { id: 'u20', name: 'Leo', age: 31, country: 'Spain', city: 'Canggu',
    languages: ['Spanish', 'English', 'Catalan'],
    bio: 'Chess and cozy-games streamer. Works EU evenings, surfs in the morning.',
    photos: [userFace('u20')],
    verified: true, twitch: 'leomoves', kick: 'leomoves', x: 'leomoves', privateContacts: { whatsapp: '+34612345678', discord: 'leomoves#1990' },
  },
  // ── 20 more hosts, one per community House (s26–s45) ──
  { id: 'u21', name: 'Arjun', age: 31, country: 'India', city: 'Bangkok',
    languages: ['English', 'Hindi'],
    bio: 'Futures day trader for six years. Trades the US open from Bangkok at night, gym and sleep by day.',
    photos: [userFace('u21')],
    verified: true, x: 'arjuntrades', youtube: '@arjunmehta', linkedin: 'arjun-mehta',
    privateContacts: { whatsapp: '+66812345678', telegram: 'arjunmehta' } },
  { id: 'u22', name: 'Sven', age: 29, country: 'Norway', city: 'Lisbon',
    languages: ['Norwegian', 'English'],
    bio: 'Solidity dev, shipped two DeFi protocols. Now building wallet UX that normal people can use.',
    photos: [userFace('u22')],
    verified: true, x: 'svenbuilds', website: 'https://svenolsen.xyz', linkedin: 'sven-olsen',
    privateContacts: { telegram: 'svenbuilds', signal: '+4791234567' } },
  { id: 'u23', name: 'Omar', age: 34, country: 'Jordan', city: 'Dubai',
    languages: ['Arabic', 'English'],
    bio: 'Funded FX trader, trains twice a day, asleep by ten. London session is my office.',
    photos: [userFace('u23')],
    verified: true, instagram: 'omar.trades', x: 'omarhaddadfx',
    privateContacts: { whatsapp: '+971501234567', facetime: '+971501234567' } },
  { id: 'u24', name: 'Lucía', age: 28, country: 'Spain', city: 'Sevilla',
    languages: ['Spanish', 'English', 'French'],
    bio: 'Profe de español y examinadora DELE. Organizo semanas de inmersión en mi ciudad.',
    photos: [userFace('u24')],
    verified: true, instagram: 'lucia.habla', tiktok: 'luciahabla', youtube: '@luciahabla',
    privateContacts: { whatsapp: '+34654123456' } },
  { id: 'u25', name: 'Freya', age: 30, country: 'Sweden', city: 'Ubud',
    languages: ['Swedish', 'English'],
    bio: 'Yoga teacher (E-RYT 500). I mentor people through their first 200-hour training.',
    photos: [userFace('u25')],
    verified: true, instagram: 'freya.flows', website: 'https://freyaflows.com',
    privateContacts: { whatsapp: '+46731234567', telegram: 'freyaflows', facetime: 'freya.flows@icloud.com' } },
  { id: 'u26', name: 'João', age: 33, country: 'Portugal', city: 'Ericeira',
    languages: ['Portuguese', 'English', 'Spanish'],
    bio: 'ISA-certified surf coach, 15 winters in Ericeira. Video analysis nerd.',
    photos: [userFace('u26')],
    verified: true, instagram: 'joao.surfcoach', youtube: '@joaosurfcoach',
    privateContacts: { whatsapp: '+351912345678' } },
  { id: 'u27', name: 'Maya', age: 27, country: 'Australia', city: 'Gili Air',
    languages: ['English', 'Indonesian'],
    bio: 'PADI Course Director. Took 300 people from their first breath underwater to Divemaster.',
    photos: [userFace('u27')],
    verified: true, instagram: 'maya.dives', tiktok: 'mayadives', youtube: '@mayadives',
    privateContacts: { whatsapp: '+6281234567890', telegram: 'mayadives' } },
  { id: 'u28', name: 'Tomáš', age: 32, country: 'Czech Republic', city: 'Krabi',
    languages: ['Czech', 'English'],
    bio: 'Climbing guide, 8a on a good day. Every dry season in Tonsai since 2018.',
    photos: [userFace('u28')],
    verified: true, instagram: 'tomas.climbs', website: 'https://tomasclimbs.cz',
    privateContacts: { whatsapp: '+420601234567', signal: '+420601234567' } },
  { id: 'u29', name: 'Carla', age: 29, country: 'Spain', city: 'Barcelona',
    languages: ['Spanish', 'Catalan', 'English'],
    bio: 'Hyrox Elite athlete and coach. Programming for 40 members at my box in Poblenou.',
    photos: [userFace('u29')],
    verified: true, instagram: 'carla.hyrox', tiktok: 'carlahyrox', youtube: '@carlahyrox',
    privateContacts: { whatsapp: '+34612987654', facetime: '+34612987654' } },
  { id: 'u30', name: 'Thabo', age: 35, country: 'South Africa', city: 'Cape Town',
    languages: ['English', 'Zulu', 'Afrikaans'],
    bio: '2:38 marathoner and run coach. Knows every hill on the Atlantic seaboard.',
    photos: [userFace('u30')],
    verified: true, instagram: 'thabo.runs', x: 'thaboruns', website: 'https://thaboruns.co.za',
    privateContacts: { whatsapp: '+27821234567' } },
  { id: 'u31', name: 'Nora', age: 38, country: 'Ireland', city: 'Tbilisi',
    languages: ['English', 'Russian'],
    bio: 'Novelist – two books out, the third in edits. I host a quiet residency for people finishing a draft.',
    photos: [userFace('u31')],
    verified: true, website: 'https://norahayes.com', instagram: 'nora.writes', threads: 'nora.writes',
    privateContacts: { telegram: 'norahayes' } },
  { id: 'u32', name: 'Jannik', age: 27, country: 'Germany', city: 'Berlin',
    languages: ['German', 'English'],
    bio: 'Producer und Mixing Engineer, Techno und Leftfield. Studio in Kreuzberg.',
    photos: [userFace('u32')],
    verified: true, instagram: 'jannik.wav', youtube: '@jannikwav', website: 'https://jannikwav.de',
    privateContacts: { whatsapp: '+4915712345678', telegram: 'jannikwav' } },
  { id: 'u33', name: 'Ingrid', age: 36, country: 'Norway', city: 'Reine',
    languages: ['Norwegian', 'English', 'German'],
    bio: 'Landscape photographer and aurora guide. Shoots for Nordic tourism boards.',
    photos: [userFace('u33')],
    verified: true, instagram: 'ingrid.north', website: 'https://ingridnorth.no', youtube: '@ingridnorth',
    privateContacts: { whatsapp: '+4790123456', facetime: 'ingrid.solberg@icloud.com' } },
  { id: 'u34', name: 'Priyanka', age: 24, country: 'United Kingdom', city: 'Cape Town',
    languages: ['English', 'Hindi'],
    bio: 'Final-year medical student at UCL, doing my surgery elective at Groote Schuur.',
    photos: [userFace('u34')],
    verified: true, instagram: 'priya.med', linkedin: 'priyanka-rao',
    privateContacts: { whatsapp: '+447911123456', telegram: 'priyarao' } },
  { id: 'u35', name: 'Daniel', age: 22, country: 'Canada', city: 'Seoul',
    languages: ['English', 'Korean'],
    bio: 'Exchange semester at Yonsei, studying CS. Already knows every late-night jjigae spot.',
    photos: [userFace('u35')],
    verified: false, instagram: 'dan.in.seoul', tiktok: 'daninseoul',
    privateContacts: { whatsapp: '+16475551234', telegram: 'dankim' } },
  { id: 'u36', name: 'Valeria', age: 31, country: 'Mexico', city: 'Mexico City',
    languages: ['Spanish', 'English'],
    bio: 'Product designer, remote for a Berlin startup. Building the house I wish I had on my first solo trip.',
    photos: [userFace('u36')],
    verified: true, instagram: 'vale.designs', linkedin: 'valeria-ruiz', x: 'valeruiz',
    privateContacts: { whatsapp: '+5215512345678', telegram: 'valeruiz', facetime: '+5215512345678' } },
  { id: 'u37', name: 'Richard', age: 44, country: 'United Kingdom', city: 'Funchal',
    languages: ['English', 'Portuguese'],
    bio: 'Second-time founder (exited a logistics SaaS), now building in climate. Dad of two.',
    photos: [userFace('u37')],
    verified: true, linkedin: 'richard-hale', x: 'richhale', website: 'https://richardhale.co',
    privateContacts: { whatsapp: '+447700900456' } },
  { id: 'u38', name: 'Ava', age: 34, country: 'New Zealand', city: 'Koh Phangan',
    languages: ['English'],
    bio: 'Breathwork facilitator, five years sober. Koh Phangan is more than full-moon parties.',
    photos: [userFace('u38')],
    verified: true, instagram: 'ava.breathes', tiktok: 'avabreathes', website: 'https://avabreathes.com',
    privateContacts: { whatsapp: '+64211234567', telegram: 'avabreathes' } },
  { id: 'u39', name: 'Bram', age: 26, country: 'Belgium', city: 'Antwerp',
    languages: ['Dutch', 'English', 'French'],
    bio: 'Tomorrowland every year since 2017. Plans the timetable in a spreadsheet.',
    photos: [userFace('u39')],
    verified: false, instagram: 'bram.festivals', tiktok: 'bramfestivals',
    privateContacts: { whatsapp: '+32478123456', telegram: 'bramfest' } },
  { id: 'u40', name: 'Chloé', age: 29, country: 'France', city: 'Chamonix',
    languages: ['French', 'English'],
    bio: 'Ski instructor (ESF) and backcountry splitboarder. Fifth winter in Chamonix.',
    photos: [userFace('u40')],
    verified: true, instagram: 'chloe.peaks', youtube: '@chloepeaks', tiktok: 'chloepeaks',
    privateContacts: { whatsapp: '+33612398765', facetime: '+33612398765' } },
  { id: 'u41', name: 'Marta', age: 32, country: 'Spain', city: 'Las Palmas',
    languages: ['Spanish', 'English', 'German'],
    bio: 'Canarian product designer, remote for a Munich scale-up. Knows every coworking and every quiet beach on Gran Canaria.',
    photos: [userFace('u41')],
    verified: true, instagram: 'marta.remote', linkedin: 'martasuarezdesign', website: 'https://martasuarez.design',
    privateContacts: { whatsapp: '+34628123456', telegram: 'martaremote' } },
  { id: 'u42', name: 'Felix', age: 29, country: 'Germany', city: 'El Médano',
    languages: ['German', 'English', 'Spanish'],
    bio: 'Data analyst, four hours of overlap with Berlin, the rest belongs to the ocean. Surfing El Médano since 2021.',
    photos: [userFace('u42')],
    verified: true, instagram: 'felix.surfs.data', youtube: '@felixsurfsdata',
    privateContacts: { whatsapp: '+4915123456789', signal: '+4915123456789' } },
  { id: 'u43', name: 'Inês', age: 34, country: 'Portugal', city: 'Ponta do Sol',
    languages: ['Portuguese', 'English', 'French'],
    bio: 'Community lead for remote workers on Madeira. Sunset at the pier, levada hikes on Sundays, cake in between.',
    photos: [userFace('u43')],
    verified: true, instagram: 'ines.madeira', linkedin: 'inesferreira', tiktok: 'inesonmadeira',
    privateContacts: { whatsapp: '+351912345678', telegram: 'inesmadeira', facetime: 'ines.madeira@icloud.com' } },
  { id: 'u44', name: 'Moritz', age: 27, country: 'Austria', city: 'Innsbruck',
    languages: ['German', 'English'],
    bio: 'Bauingenieur, an jedem Wochenende im Winter auf der Piste. Organisiert die Hütte, die Après-Ski-Playlist und den Frühstückseinkauf.',
    photos: [userFace('u44')],
    verified: false, instagram: 'moritz.powder', tiktok: 'moritzpowder',
    privateContacts: { whatsapp: '+436641234567' } },
  { id: 'u45', name: 'Clara', age: 26, country: 'Germany', city: 'Berlin',
    languages: ['German', 'English', 'Italian'],
    bio: 'Vor einem Jahr für den ersten Job nach Berlin gezogen und die ersten Wochen allein in einem WG-Zimmer gesessen. Das soll niemand mehr müssen.',
    photos: [userFace('u45')],
    verified: true, instagram: 'clara.inberlin', linkedin: 'claraweber', threads: 'clara.inberlin',
    privateContacts: { whatsapp: '+4917698765432', telegram: 'clarainberlin', signal: '+4917698765432' } },
  { id: 'u46', name: 'Minjun', age: 24, country: 'South Korea', city: 'Seoul',
    languages: ['Korean', 'English'],
    bio: 'Former semi-pro Valorant player, now coaching and streaming. Knows the best PC bangs in Hongdae and where to eat at 3 am.',
    photos: [userFace('u46')],
    verified: true, twitch: 'minjungg', youtube: '@minjungg', x: 'minjun_gg', kick: 'minjungg',
    privateContacts: { discord: 'minjun#2207', telegram: 'minjungg' } },
  { id: 'u47', name: 'Alba', age: 30, country: 'Spain', city: 'Tarifa',
    languages: ['Spanish', 'English', 'Italian'],
    bio: 'IKO kite instructor, eight seasons in Tarifa. Reads the Levante forecast like other people read the news.',
    photos: [userFace('u47')],
    verified: true, instagram: 'alba.kites', youtube: '@albakites',
    privateContacts: { whatsapp: '+34611987654', facetime: '+34611987654' } },
  { id: 'u48', name: 'James', age: 36, country: 'United Kingdom', city: 'Marbella',
    languages: ['English', 'Spanish'],
    bio: 'Ex-tennis coach turned padel coach. Runs a club academy in Marbella, drinks his coffee courtside.',
    photos: [userFace('u48')],
    verified: true, instagram: 'james.padel', linkedin: 'jamesholtpadel', website: 'https://padelwithjames.com',
    privateContacts: { whatsapp: '+34655123987', phone: '+34655123987' } },
];

const coreStays: Stay[] = [
  {
    id: 's1', slug: 'fitness-house-canggu-feb', title: 'Fitness House Canggu', hostId: 'u1', vibe: 'fitness', language: 'en',
    city: 'Canggu', region: 'Bali, Indonesia', lat: -8.65, lng: 115.14, mapPreviewUrl: map('canggu'),
    startDate: '2027-02-12', endDate: '2027-02-26', spotsTotal: 5, spotsFilled: 5,
    pricePerPerson: 480, currency: 'EUR', accommodationStatus: 'locked',
    accommodationLink: 'https://www.airbnb.com/rooms/example-canggu-villa',
    description: 'Two weeks, one villa, a gym five minutes away. We train in the morning, work or surf in the afternoon, cook together at night.',
    whyText: 'I was happiest in Bali when I had a gym routine and people around me who kept it. I want that again, with new people.',
    dayText: '07:00 gym · 09:00 breakfast together · work/surf until 16:00 · dinner at home or Batu Bolong · early nights.',
    lookingForText: 'People who actually train, keep a clean house and don\'t need a party every night. Mixed group preferred.',
    houseRules: ['No smoking inside', 'Quiet after 23:00', 'Clean up the same day'],
    interests: ['gym', 'surfing', 'healthy food', 'remote work'],
    hostNote: 'Gym is 5 min away, I checked', acceptingRequests: true, status: 'published', featured: true, createdAt: '2026-10-18T09:00:00Z',
  },
  {
    id: 's2', hostFeePerPerson: 100, slug: 'creator-house-uluwatu', title: 'Creator House Uluwatu', hostId: 'u2', vibe: 'creator', language: 'en',
    city: 'Uluwatu', region: 'Bali, Indonesia', lat: -8.83, lng: 115.09, mapPreviewUrl: map('uluwatu'),
    startDate: '2026-12-02', endDate: '2026-12-16', spotsTotal: 4, spotsFilled: 2,
    budgetPerPerson: { min: 500, max: 700 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'Cliff villa, sunsets, content every day. Shooting a Bali series and want other creators in the house.',
    whyText: 'Filming alone is lonely and slow. Four creators in one house means four cameras, four audiences and better footage.',
    dayText: 'Sunrise shoots · edit by the pool · afternoons free · sunset at Single Fin twice a week.',
    lookingForText: 'Creators from 5k followers up who post consistently. Any niche, as long as you\'re comfortable on camera.',
    houseRules: ['Shared gear stays in the living room', 'Ask before filming others'],
    interests: ['content', 'surfing', 'sunsets', 'editing'],
    hostNote: 'Two spots left, filming starts Dec 3', acceptingRequests: true, status: 'published', featured: true, createdAt: '2026-10-15T11:00:00Z',
  },
  {
    id: 's3', slug: 'founder-house-lisbon', title: 'Founder House Lisbon', hostId: 'u3', vibe: 'founder', language: 'en',
    city: 'Lisbon', region: 'Portugal', lat: 38.72, lng: -9.14, mapPreviewUrl: map('lisbon'),
    startDate: '2027-01-10', endDate: '2027-02-07', spotsTotal: 5, spotsFilled: 1,
    budgetPerPerson: { min: 700, max: 950 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'Four weeks of deep work with people building their own thing. Big table, good wifi, surf at Carcavelos.',
    whyText: 'Shipping alone is slow. I want four other people at the table who are as serious about their project as I am.',
    dayText: '07:30 surf or run · 09:00–13:00 deep work · lunch together · 14:00–18:00 work · demo night every Friday.',
    lookingForText: 'Builders with a live project (app, agency, newsletter – anything with users). No job-hunters, no "idea stage".',
    houseRules: ['Deep-work hours are silent', 'Friday demo is mandatory'],
    interests: ['startups', 'surfing', 'coding', 'coffee'],
    hostNote: 'Three houses on the shortlist – vote with us', acceptingRequests: true, status: 'published', featured: true, createdAt: '2026-10-12T08:00:00Z',
  },
  {
    id: 's4', hostFeePerPerson: 120, slug: 'muay-thai-house-phuket', title: 'Muay Thai House Phuket', hostId: 'u4', vibe: 'fitness', language: 'en',
    city: 'Rawai', region: 'Phuket, Thailand', lat: 7.77, lng: 98.33, mapPreviewUrl: map('phuket'),
    startDate: '2026-11-20', endDate: '2026-12-11', spotsTotal: 4, spotsFilled: 4,
    pricePerPerson: 620, currency: 'EUR', accommodationStatus: 'locked',
    accommodationLink: 'https://www.booking.com/example-rawai-house',
    description: 'Three weeks, two sessions a day at Tiger, meal prep in the house.',
    whyText: 'Camps are great but the accommodation is a bunker. I want the training and a real house with people who get it.',
    dayText: '06:30 session · nap · 16:00 session · cook together · asleep by 22:00.',
    lookingForText: 'Anyone who has trained before and can handle two sessions a day.',
    houseRules: ['No alcohol in the house', 'Meal-prep Sunday is a team job'],
    interests: ['muay thai', 'nutrition', 'recovery'],
    acceptingRequests: false, status: 'published', featured: false, createdAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 's5', slug: 'mountain-coliving-chiang-mai', title: 'Mountain Coliving Chiang Mai', hostId: 'u5', vibe: 'remote-work', language: 'en',
    city: 'Chiang Mai', region: 'Thailand', lat: 18.79, lng: 98.98, mapPreviewUrl: map('chiangmai'),
    startDate: '2027-01-05', endDate: '2027-03-05', spotsTotal: 6, spotsFilled: 2,
    budgetPerPerson: { min: 350, max: 450 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'Two months in a house near Doi Suthep. Cheap, quiet, fast wifi, weekend hikes.',
    whyText: 'Long stays are where real friendships happen. Two months is long enough to build a routine with people.',
    dayText: 'Flexible – people work different time zones. Shared dinner three nights a week, hike every Saturday.',
    lookingForText: 'Remote workers with a steady job or clients. Introverts welcome, we have enough rooms to disappear.',
    houseRules: ['Headphones in shared spaces', 'Guests only with a heads-up'],
    interests: ['hiking', 'coffee', 'remote work', 'cooking'],
    hostNote: 'Introverts very welcome, it\'s a big house', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-10T07:00:00Z',
  },
  {
    id: 's6', slug: 'slow-house-bangkok', title: 'Slow House Bangkok', hostId: 'u6', vibe: 'wellness', language: 'en',
    city: 'Ari', region: 'Bangkok, Thailand', lat: 13.78, lng: 100.54, mapPreviewUrl: map('bangkok'),
    startDate: '2026-11-28', endDate: '2026-12-12', spotsTotal: 3, spotsFilled: 1,
    currency: 'EUR', accommodationStatus: 'open',
    description: 'Two weeks in Ari: yoga, markets, no plans after 20:00. For people who want a calm base in a loud city.',
    whyText: 'I\'m on a sabbatical and want company that slows me down instead of speeding me up.',
    dayText: '07:00 yoga on the terrace · market breakfast · free day · tea on the roof at sunset.',
    lookingForText: 'Calm people, 28+, who don\'t need nightlife. Reading in the same room counts as a plan.',
    houseRules: ['No work calls in shared rooms', 'Shoes off'],
    interests: ['yoga', 'markets', 'reading', 'tea'],
    hostNote: 'Calm people only – I promise good tea', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-16T12:00:00Z',
  },
  {
    id: 's7', slug: 'dev-house-da-nang', title: 'Dev House Da Nang', hostId: 'u7', vibe: 'founder', language: 'en',
    city: 'My Khe', region: 'Da Nang, Vietnam', lat: 16.06, lng: 108.24, mapPreviewUrl: map('danang'),
    startDate: '2027-02-01', endDate: '2027-03-01', spotsTotal: 5, spotsFilled: 2,
    pricePerPerson: 390, currency: 'EUR', accommodationStatus: 'locked',
    accommodationLink: 'https://www.airbnb.com/rooms/example-danang-house',
    description: 'A month by the beach with other devs. I stream, you ship, we swim at 17:00.',
    whyText: 'Streaming from a house with other builders is more fun and the chat loves it.',
    dayText: 'Work until 17:00 · beach · dinner on An Thuong street · optional late game night.',
    lookingForText: 'Developers, designers, indie hackers. Must be fine with being on stream occasionally.',
    houseRules: ['Stream room is off limits while live', 'Pool rules: no glass'],
    interests: ['gamedev', 'streaming', 'beach', 'coffee'],
    hostNote: 'Flying in Jan 31 – who\'s in?', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-17T15:00:00Z',
  },
  {
    id: 's8', slug: 'first-trip-crew-lombok', title: 'First-Trip Crew Lombok', hostId: 'u8', vibe: 'holiday', language: 'en',
    city: 'Kuta Lombok', region: 'Lombok, Indonesia', lat: -8.89, lng: 116.28, mapPreviewUrl: map('lombok'),
    startDate: '2026-12-18', endDate: '2026-12-28', spotsTotal: 4, spotsFilled: 0,
    budgetPerPerson: { min: 250, max: 350 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'Ten days over Christmas with people who also don\'t want to spend it in a hostel dorm.',
    whyText: 'It\'s my first solo trip and I\'d rather share a house with three people I\'ve talked to than a dorm with twelve I haven\'t.',
    dayText: 'No plan. Beaches, scooters, one day trip to the Gilis, Christmas dinner together.',
    lookingForText: 'Easy-going people under 30. Beginners at travelling are very welcome.',
    houseRules: ['Be nice', 'Split groceries evenly'],
    interests: ['beaches', 'snorkeling', 'scooters'],
    hostNote: 'First-timers very welcome', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-19T18:00:00Z',
  },
  {
    id: 's9', slug: 'surf-house-ericeira', title: 'Surf House Ericeira', hostId: 'u3', vibe: 'surf', language: 'en',
    city: 'Ericeira', region: 'Portugal', lat: 38.96, lng: -9.42, mapPreviewUrl: map('ericeira'),
    startDate: '2026-11-06', endDate: '2026-11-09', spotsTotal: 3, spotsFilled: 3,
    pricePerPerson: 140, currency: 'EUR', accommodationStatus: 'locked',
    accommodationLink: 'https://www.airbnb.com/rooms/example-ericeira',
    description: 'Long weekend, three nights, surf both mornings. Quick trip from Lisbon.',
    whyText: 'Weekend test run for the Lisbon house – come surf and see if we get along.',
    dayText: 'Dawn patrol · brunch · second session or nap · grilled fish.',
    lookingForText: 'Intermediate surfers with their own board or willing to rent.',
    houseRules: ['Wetsuits on the balcony, not in the bathroom'],
    interests: ['surfing', 'seafood'],
    // Dev scenario "booked": everyone paid, booking confirmation uploaded.
    acceptingRequests: false, status: 'booked', featured: false, createdAt: '2026-10-08T09:00:00Z',
    lockedAt: '2026-10-10T10:00:00Z', totalPrice: 420, payByDate: '2026-10-15',
    bookingConfirmedAt: '2026-10-16T09:30:00Z', bookingProofUrl: 'https://picsum.photos/seed/booking-s9/1200/1600',
  },
  {
    id: 's10', slug: 'remote-week-canggu-nov', title: 'Remote Week Canggu', hostId: 'u2', vibe: 'remote-work', language: 'en',
    city: 'Canggu', region: 'Bali, Indonesia', lat: -8.65, lng: 115.14, mapPreviewUrl: map('canggu2'),
    startDate: '2026-11-03', endDate: '2026-11-10', spotsTotal: 4, spotsFilled: 3,
    budgetPerPerson: { min: 200, max: 300 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'One week, short notice. Work from the villa, surf at Batu Bolong, one dinner out.',
    whyText: 'I have a gap between two shoots and don\'t want to spend it alone.',
    dayText: 'Work mornings, beach afternoons, nothing fancy.',
    lookingForText: 'Anyone already in Bali or arriving this week.',
    houseRules: ['Keep the kitchen clean'],
    interests: ['remote work', 'surfing'],
    hostNote: 'Short notice – I\'m already in Canggu', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-20T06:00:00Z',
  },
  { id: 's11', slug: 'pilates-house-canggu', title: 'Pilates House Canggu', hostId: 'u9', vibe: 'wellness', language: 'en',
    city: 'Canggu', region: 'Bali, Indonesia', lat: -8.65, lng: 115.14, mapPreviewUrl: map('canggu3'),
    startDate: '2027-01-15', endDate: '2027-02-05', spotsTotal: 4, spotsFilled: 1,
    budgetPerPerson: { min: 450, max: 600 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'Three weeks: class every morning, beach afternoons, early nights.',
    whyText: 'I teach all day and come home to an empty villa. I\'d rather share it with people who like the same rhythm.',
    dayText: '06:30 pilates at the studio (free for the house) · smoothie bowls · work or beach · dinner at 19:00.',
    lookingForText: 'Women or mixed, 24–35, active, no party crowd.',
    houseRules: ['Quiet after 22:00', 'No shoes inside'],
    interests: ['pilates', 'beach', 'healthy food'], hostNote: 'Free studio classes for the whole house', acceptingRequests: true, status: 'published', featured: true, createdAt: '2026-10-19T07:00:00Z' },
  { id: 's12', slug: 'kitchen-house-mexico-city', title: 'Kitchen House Mexico City', hostId: 'u10', vibe: 'holiday', language: 'en',
    city: 'Roma Norte', region: 'Mexico City, Mexico', lat: 19.42, lng: -99.16, mapPreviewUrl: map('cdmx'),
    startDate: '2026-12-05', endDate: '2026-12-19', spotsTotal: 5, spotsFilled: 2,
    pricePerPerson: 520, currency: 'EUR', accommodationStatus: 'locked', accommodationLink: 'https://www.airbnb.com/rooms/example-roma-norte',
    description: 'Two weeks eating our way through CDMX. Big kitchen, market every morning, one taco crawl.',
    whyText: 'Cooking for people is my favourite thing, and this city has the best ingredients I know.',
    dayText: 'Market at 9 · work or explore · we cook together at 19:00 · mezcal optional.',
    lookingForText: 'People who eat everything and help with dishes.',
    houseRules: ['Dishes same night', 'Tell the group if you skip dinner'],
    interests: ['food', 'markets', 'city walks'], hostNote: 'I cook, you do the dishes. Deal?', acceptingRequests: true, status: 'published', featured: true, createdAt: '2026-10-14T10:00:00Z' },
  { id: 's13', slug: 'quiet-house-kyoto', title: 'Quiet House Kyoto', hostId: 'u11', vibe: 'remote-work', language: 'en',
    city: 'Kyoto', region: 'Japan', lat: 35.01, lng: 135.77, mapPreviewUrl: map('kyoto'),
    startDate: '2027-03-20', endDate: '2027-04-10', spotsTotal: 3, spotsFilled: 0,
    budgetPerPerson: { min: 800, max: 1100 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'Cherry-blossom weeks in a machiya. Work in the mornings, temples in the afternoons.',
    whyText: 'I want to show two or three people my country the slow way, and not do it alone.',
    dayText: 'Early walk · work until 14:00 · one neighbourhood per afternoon · onsen on Sundays.',
    lookingForText: 'Tidy, quiet people who respect house etiquette. No late nights.',
    houseRules: ['Shoes off', 'Quiet after 21:00', 'Separate the trash properly'],
    interests: ['temples', 'coffee', 'design', 'walking'], acceptingRequests: true, status: 'published', featured: true, createdAt: '2026-10-20T05:00:00Z' },
  { id: 's14', slug: 'bjj-house-floripa', title: 'BJJ House Floripa', hostId: 'u12', vibe: 'fitness', language: 'en',
    city: 'Campeche', region: 'Florianópolis, Brazil', lat: -27.67, lng: -48.48, mapPreviewUrl: map('floripa'),
    startDate: '2027-01-08', endDate: '2027-02-08', spotsTotal: 5, spotsFilled: 3,
    pricePerPerson: 560, currency: 'EUR', accommodationStatus: 'locked', accommodationLink: 'https://www.airbnb.com/rooms/example-floripa',
    description: 'A month of mats, surf and açaí. Two academies within 10 minutes.',
    whyText: 'Training camps with strangers from the internet have given me my best friends. Doing it again.',
    dayText: 'Open mat 07:00 · work · surf 16:00 · class 19:00 · dead by 22:00.',
    lookingForText: 'White to purple belts, any gender. Bring a gi.',
    houseRules: ['Mats in the garage are shared', 'Wash your gi daily'],
    interests: ['bjj', 'surfing', 'açaí'], hostNote: 'Bring a gi, I\'ll bring the açaí', acceptingRequests: true, status: 'published', featured: true, createdAt: '2026-10-11T13:00:00Z' },
  { id: 's15', slug: 'slow-house-porto', title: 'Slow House Porto', hostId: 'u13', vibe: 'wellness', language: 'en',
    city: 'Porto', region: 'Portugal', lat: 41.15, lng: -8.61, mapPreviewUrl: map('porto'),
    startDate: '2026-11-14', endDate: '2026-11-21', spotsTotal: 3, spotsFilled: 1,
    budgetPerPerson: { min: 300, max: 400 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'One week, one riverside apartment, no itinerary. Books, walks, port wine.',
    whyText: 'I write about slow travel and want to live it with people instead of alone.',
    dayText: 'Nothing before 10. Long walk, long lunch, reading, one dinner out.',
    lookingForText: 'Readers, writers, people who are fine with silence.',
    houseRules: ['Phones away at dinner'],
    interests: ['reading', 'writing', 'walking', 'wine'], acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-18T16:00:00Z' },
  { id: 's16', slug: 'ecom-house-bangkok', title: 'E-com House Bangkok', hostId: 'u14', vibe: 'founder', language: 'en',
    city: 'Thonglor', region: 'Bangkok, Thailand', lat: 13.73, lng: 100.58, mapPreviewUrl: map('thonglor'),
    startDate: '2026-12-01', endDate: '2026-12-22', spotsTotal: 4, spotsFilled: 2,
    pricePerPerson: 450, currency: 'EUR', accommodationStatus: 'locked', accommodationLink: 'https://www.airbnb.com/rooms/example-thonglor',
    description: 'Three weeks with other store owners. Gym in the building, Q4 push together.',
    whyText: 'Q4 alone in a condo is depressing. Four store owners in one place is a war room.',
    dayText: '06:00 gym · 08:00–15:00 work · afternoon free · 15:00–18:00 calls · street food.',
    lookingForText: 'People running an online store with real revenue. Any niche.',
    houseRules: ['Calls in your room', 'No supplier meetings in the living room'],
    interests: ['ecommerce', 'gym', 'street food'], hostNote: 'Q4 war room – real revenue only', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-13T09:00:00Z' },
  { id: 's17', slug: 'first-asia-house-hoi-an', title: 'First-Asia House Hoi An', hostId: 'u15', vibe: 'holiday', language: 'en',
    city: 'Hoi An', region: 'Vietnam', lat: 15.88, lng: 108.34, mapPreviewUrl: map('hoian'),
    startDate: '2027-01-20', endDate: '2027-02-03', spotsTotal: 4, spotsFilled: 1,
    budgetPerPerson: { min: 250, max: 350 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'Two weeks by the river for people on their first Asia trip. Bikes, beach, cooking class.',
    whyText: 'I\'ve never been to Asia and don\'t want to figure everything out alone.',
    dayText: 'Bike to the beach · lunch in the old town · afternoons free · one cooking class together.',
    lookingForText: 'Beginners welcome. Under 30 preferred.',
    houseRules: ['Share the bikes', 'Be back for the cooking class'],
    interests: ['beach', 'cycling', 'food'], hostNote: 'My first Asia trip too, let\'s figure it out', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-20T08:00:00Z' },
  { id: 's18', slug: 'night-shift-house-canggu', title: 'Night-Shift House Canggu', hostId: 'u16', vibe: 'remote-work', language: 'en',
    city: 'Pererenan', region: 'Bali, Indonesia', lat: -8.64, lng: 115.12, mapPreviewUrl: map('pererenan'),
    startDate: '2027-02-15', endDate: '2027-03-15', spotsTotal: 5, spotsFilled: 2,
    budgetPerPerson: { min: 400, max: 550 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'A house for people on US/EU hours: free days, work at night, nobody complains about the lights.',
    whyText: 'Every house I join is asleep when I work and awake when I sleep. Let\'s fix that.',
    dayText: 'Sleep until 10 · gym/surf/beach · work 16:00–01:00 · late dinners together.',
    lookingForText: 'Remote workers on US or EU time zones. Night owls only.',
    houseRules: ['Daytime is quiet time for sleepers'],
    interests: ['remote work', 'surfing', 'late dinners'], hostNote: 'Night owls, this one\'s for you', acceptingRequests: true, status: 'published', featured: true, createdAt: '2026-10-17T22:00:00Z' },
  { id: 's19', slug: 'ski-house-innsbruck', title: 'Ski House Innsbruck', hostId: 'u8', vibe: 'holiday', language: 'de',
    city: 'Innsbruck', region: 'Austria', lat: 47.27, lng: 11.40, mapPreviewUrl: map('innsbruck'),
    startDate: '2027-01-29', endDate: '2027-02-01', spotsTotal: 5, spotsFilled: 2,
    pricePerPerson: 180, currency: 'EUR', accommodationStatus: 'locked', accommodationLink: 'https://www.booking.com/example-innsbruck',
    description: 'Long weekend, three nights, Nordkette and Axamer Lizum. Chalet with a sauna.',
    whyText: 'Weekend version of Simpulo – quick trips with people who want more than a hostel.',
    dayText: 'Lifts at 9 · back at 16 · sauna · raclette.',
    lookingForText: 'Intermediate skiers/boarders. Gear rental nearby.',
    houseRules: ['Boots in the hallway'],
    interests: ['skiing', 'sauna', 'raclette'], acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-19T12:00:00Z' },
  { id: 's20', slug: 'editing-house-lisbon', title: 'Editing House Lisbon', hostId: 'u2', vibe: 'creator', language: 'en',
    city: 'Alfama', region: 'Lisbon, Portugal', lat: 38.71, lng: -9.13, mapPreviewUrl: map('alfama'),
    startDate: '2027-03-01', endDate: '2027-03-15', spotsTotal: 4, spotsFilled: 0,
    budgetPerPerson: { min: 550, max: 750 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'Two weeks to finish the Bali series with other editors and creators. Big screens, good light.',
    whyText: 'Shooting is done, editing is the lonely part. Let\'s do it in one room.',
    dayText: 'Edit 09:00–15:00 · city afternoons · screening night on the last day.',
    lookingForText: 'Editors and creators with a backlog. Must bring your own machine.',
    houseRules: ['Headphones during edit hours'],
    interests: ['editing', 'content', 'city walks'], acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-20T09:30:00Z' },
  // Streaming houses (all featured, so they join the Spotlight rotation)
  { id: 's21', hostFeePerPerson: 150, slug: 'streaming-villa-lisbon', title: 'Streaming Villa Lisbon', hostId: 'u18', vibe: 'creator', language: 'en',
    city: 'Lisbon', region: 'Portugal', lat: 38.72, lng: -9.15, mapPreviewUrl: map('lisbon-stream'),
    startDate: '2027-02-01', endDate: '2027-02-22', spotsTotal: 5, spotsFilled: 1,
    pricePerPerson: 690, currency: 'EUR', accommodationStatus: 'locked', accommodationLink: 'https://www.airbnb.com/rooms/example-lisbon-stream-villa',
    description: 'Three weeks in a villa built for going live: two soundproofed stream rooms, fiber, a big kitchen for between-stream dinners.',
    whyText: 'Streaming alone in a flat gets quiet fast. In one house we can raid each other, co-stream, share chat and actually hang out when the cameras are off.',
    dayText: 'Slow mornings · 12:00 editing & clips · 16:00–20:00 first stream block · dinner together · 21:00–00:00 late streams and raids.',
    lookingForText: 'Streamers with a live schedule, any size, any platform. Bring your own setup; the rooms and fiber are covered.',
    houseRules: ['Stream rooms are booked in the shared calendar', 'No background noise in the hallway while someone is live', 'Ask before putting anyone on stream'],
    interests: ['streaming', 'gaming', 'editing', 'food'],
    hostNote: 'Fiber + 2 stream rooms, I checked', acceptingRequests: true, status: 'published', featured: true, createdAt: '2026-10-21T08:00:00Z' },
  { id: 's22', slug: 'irl-house-bangkok', title: 'IRL House Bangkok', hostId: 'u19', vibe: 'creator', language: 'en',
    city: 'Ekkamai', region: 'Bangkok, Thailand', lat: 13.72, lng: 100.59, mapPreviewUrl: map('ekkamai'),
    startDate: '2026-12-06', endDate: '2026-12-20', spotsTotal: 4, spotsFilled: 2,
    budgetPerPerson: { min: 400, max: 550 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'Two weeks of IRL streams across Bangkok: night markets, tuk-tuks, rooftop bars – and a house to come back to.',
    whyText: 'IRL streaming is better with company – someone to hold the second camera, someone to talk to chat with, someone to keep the battery bank charged.',
    dayText: 'Sleep in · afternoon planning · 18:00 co-stream out in the city · late street food · back home for highlights.',
    lookingForText: 'IRL and travel streamers who are fine being on each other\'s streams. Energy over follower count.',
    houseRules: ['Everyone films with consent', 'Charging station in the living room is shared'],
    interests: ['irl streaming', 'street food', 'night markets'],
    hostNote: 'Co-streams every evening, chaos guaranteed', acceptingRequests: true, status: 'published', featured: true, createdAt: '2026-10-20T19:00:00Z' },
  { id: 's23', slug: 'cozy-stream-house-canggu', title: 'Cozy Stream House Canggu', hostId: 'u20', vibe: 'creator', language: 'en',
    city: 'Berawa', region: 'Bali, Indonesia', lat: -8.66, lng: 115.15, mapPreviewUrl: map('berawa'),
    startDate: '2027-01-08', endDate: '2027-02-07', spotsTotal: 4, spotsFilled: 0,
    budgetPerPerson: { min: 500, max: 650 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'A month in a quiet villa: surf and naps by day, cozy games and chess streams in the evening (EU prime time).',
    whyText: 'Bali on EU hours means the days are free. I want a calm house of people who stream at night and don\'t need to party.',
    dayText: '07:00 surf · lazy afternoon · 17:00–23:00 streams (EU evening) · midnight snacks · quiet mornings.',
    lookingForText: 'Cozy, chess or chill streamers who keep EU hours. Quiet during the day, live by night.',
    houseRules: ['Quiet before 14:00', 'Headphones on in shared rooms while live'],
    interests: ['chess', 'cozy games', 'surfing'],
    hostNote: 'Quiet by day, live by night – EU hours', acceptingRequests: true, status: 'published', featured: true, createdAt: '2026-10-21T06:30:00Z' },
  // Past Houses (completed) – they give profiles "Past" rows and "Past crews".
  { id: 's24', slug: 'surf-house-ericeira-september', title: 'Surf House Ericeira', hostId: 'u3', vibe: 'surf', language: 'en',
    city: 'Ericeira', region: 'Portugal', lat: 38.96, lng: -9.42, mapPreviewUrl: map('ericeira-september'),
    startDate: '2026-09-07', endDate: '2026-09-21', spotsTotal: 4, spotsFilled: 3,
    pricePerPerson: 520, currency: 'EUR', accommodationStatus: 'locked',
    accommodationLink: 'https://www.airbnb.com/rooms/example-ericeira-september',
    description: 'Two weeks of dawn patrol and remote work above Ribeira d\'Ilhas.',
    whyText: 'Surf before work with people who actually get up for it.',
    dayText: '06:30 surf · 09:00–15:00 work · sunset sessions · dinner at home.',
    lookingForText: 'Intermediate surfers with a remote job.',
    houseRules: ['Wetsuits dry outside', 'Quiet after 22:00'],
    interests: ['surfing', 'remote work'],
    acceptingRequests: false, status: 'completed', featured: false, createdAt: '2026-07-10T09:00:00Z',
    lockedAt: '2026-07-20T10:00:00Z', totalPrice: 2080, payByDate: '2026-08-01', bookingConfirmedAt: '2026-08-02T08:00:00Z' },
  { id: 's25', slug: 'remote-week-canggu-october', title: 'Remote Week Canggu', hostId: 'u2', vibe: 'remote-work', language: 'en',
    city: 'Canggu', region: 'Bali, Indonesia', lat: -8.65, lng: 115.14, mapPreviewUrl: map('canggu-october'),
    startDate: '2026-10-05', endDate: '2026-10-12', spotsTotal: 3, spotsFilled: 3,
    pricePerPerson: 310, currency: 'EUR', accommodationStatus: 'locked',
    accommodationLink: 'https://www.airbnb.com/rooms/example-canggu-october',
    description: 'One week of laptops by the pool and sunsets at Echo Beach.',
    whyText: 'A short reset with people who work remotely too.',
    dayText: 'Work mornings · pool lunch · surf or scooter rides · dinner out.',
    lookingForText: 'Remote workers who like a calm week.',
    houseRules: ['Calls in the bedrooms, not the living room'],
    interests: ['remote work', 'surfing'],
    acceptingRequests: false, status: 'completed', featured: false, createdAt: '2026-08-15T09:00:00Z',
    lockedAt: '2026-08-25T10:00:00Z', totalPrice: 930, payByDate: '2026-09-05', bookingConfirmedAt: '2026-09-06T08:00:00Z' },
  // ── 20 community Houses (s26–s45) ──
  { id: 's26', slug: 'trading-house-bangkok-thonglor', title: 'Trading House Bangkok', hostId: 'u21', vibe: 'remote-work', language: 'en',
    city: 'Thonglor', region: 'Bangkok, Thailand', lat: 13.73, lng: 100.58, mapPreviewUrl: map('thonglor'),
    startDate: '2026-12-01', endDate: '2027-01-12', spotsTotal: 5, spotsFilled: 3,
    budgetPerPerson: { min: 22000, max: 30000 }, currency: 'THB', accommodationStatus: 'open',
    description: 'Six weeks in a Thonglor condo with a proper trading room: four desks, backup power, fibre and a 5G failover.',
    whyText: 'Trading the US session from Asia is lonely – you are awake when everyone else sleeps. I want a house where the night shift is the normal shift and people actually review their trades.',
    dayText: '13:00 wake up and gym · 16:00 prep and levels · 20:30–03:00 US session in the trading room · late street food on Sukhumvit Soi 55 · sleep by 05:00.',
    lookingForText: 'Profitable or seriously working on it – futures, FX or equities day traders with a journal. No signal groups, no course selling, no "DM me for gains".',
    houseRules: ['Trading room is silent during the US open', 'No selling courses or signals to housemates', 'Kitchen closes at 04:00'],
    interests: ['day trading', 'futures', 'gym', 'street food'],
    hostNote: 'US session at night, gym by day', acceptingRequests: true, status: 'published', featured: true, createdAt: '2026-10-14T10:00:00Z' },
  { id: 's27', slug: 'crypto-builders-house-lisbon', title: 'Crypto Builders House Lisbon', hostId: 'u22', vibe: 'founder', language: 'en',
    city: 'Príncipe Real', region: 'Lisbon, Portugal', lat: 38.716, lng: -9.149, mapPreviewUrl: map('principe-real'),
    startDate: '2027-01-15', endDate: '2027-02-26', spotsTotal: 5, spotsFilled: 2,
    budgetPerPerson: { min: 900, max: 1200 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'A townhouse full of people who ship on-chain products – audits on the whiteboard, testnet deploys at breakfast.',
    whyText: 'Lisbon has a huge crypto scene, but most of it is meetups and talk. I want a house of people who write the code, ship weekly and review each other\'s contracts.',
    dayText: 'Morning coffee and standup · deep work until 15:00 · pair-review a PR · surf or run at Carcavelos · Thursday demo night with the local builders.',
    lookingForText: 'Smart-contract, protocol or wallet devs with something on mainnet or testnet. Tokens, airdrops and price talk stay outside the house.',
    houseRules: ['No shilling tokens to housemates', 'Hardware wallets stay in your room', 'Demo night every Thursday'],
    interests: ['web3', 'solidity', 'open source', 'surfing'],
    hostNote: 'Ship weekly, no price talk at dinner', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-09T11:00:00Z' },
  { id: 's28', slug: 'trading-gym-house-dubai-marina', title: 'Trading & Gym House Dubai', hostId: 'u23', vibe: 'fitness', language: 'en',
    city: 'Dubai Marina', region: 'Dubai, United Arab Emirates', lat: 25.08, lng: 55.14, mapPreviewUrl: map('dubai-marina'),
    startDate: '2026-11-15', endDate: '2026-12-13', spotsTotal: 4, spotsFilled: 2,
    pricePerPerson: 1450, currency: 'USD', accommodationStatus: 'locked',
    accommodationLink: 'https://www.airbnb.com/rooms/example-dubai-marina-tower',
    description: 'A four-bedroom Marina apartment with a building gym, a desk per person and the London open at 11:00 local.',
    whyText: 'Trading and training are the same discipline: routine, risk management, no ego. I want a crew that lifts at 6, trades London and New York, and is asleep before the bars open.',
    dayText: '06:00 strength session · 11:00 London open · lunch prep together · 17:30 New York open · mobility and sauna · lights out at 22:30.',
    lookingForText: 'FX, indices or prop-firm traders who train seriously. You track your sleep and your drawdown with the same honesty.',
    houseRules: ['Gym before screens', 'No alcohol in the apartment', 'Quiet after 22:30'],
    interests: ['forex', 'strength training', 'meal prep'],
    hostNote: 'Lift at 6, London open at 11', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-05T09:00:00Z' },
  { id: 's29', slug: 'language-exchange-house-sevilla', title: 'Language Exchange House Sevilla', hostId: 'u24', vibe: 'mixed', language: 'es',
    city: 'Triana', region: 'Andalusia, Spain', lat: 37.385, lng: -6.003, mapPreviewUrl: map('triana'),
    startDate: '2027-02-01', endDate: '2027-03-01', spotsTotal: 6, spotsFilled: 3,
    budgetPerPerson: { min: 600, max: 800 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'Un mes de inmersión total en Triana: clases por la mañana, tapas y conversación por la tarde, español todo el día.',
    whyText: 'La gente aprende más en una cocina compartida que en un aula. Quiero una casa donde el español sea el idioma de la casa, de verdad, desde el desayuno.',
    dayText: '09:30 clase en grupo · 12:00 mercado de Triana · siesta · 18:00 intercambio con sevillanos · cena tarde, como aquí se hace.',
    lookingForText: 'Gente con nivel A2 o más que quiera dar el salto a hablar con soltura. Hay que aceptar la regla: en casa, solo español.',
    houseRules: ['En casa se habla solo español', 'Cocinamos juntos los domingos', 'Silencio de 15:00 a 17:00 (siesta)'],
    interests: ['idiomas', 'flamenco', 'tapas', 'cultura'],
    hostNote: 'Solo español en casa – ¡tú puedes!', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-11T08:30:00Z' },
  { id: 's30', slug: 'yoga-teacher-house-ubud', title: 'Yoga Teacher House Ubud', hostId: 'u25', vibe: 'wellness', language: 'en',
    city: 'Ubud', region: 'Bali, Indonesia', lat: -8.506, lng: 115.262, mapPreviewUrl: map('ubud'),
    startDate: '2027-01-05', endDate: '2027-02-02', spotsTotal: 5, spotsFilled: 2,
    budgetPerPerson: { min: 500, max: 700 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'A rice-field villa for people in a 200-hour yoga teacher training – study space, a small shala and quiet evenings.',
    whyText: 'A 200h training is intense: early mornings, anatomy exams, a lot of feelings. Living with others in the same process makes it so much easier than a hostel dorm.',
    dayText: '05:30 self-practice in the shala · 07:00–17:00 training at your school · dinner together · study group for anatomy and sequencing · asleep by 21:30.',
    lookingForText: 'Anyone enrolled in a 200h (or 300h) YTT in Ubud around these dates, any school. Supportive, early-to-bed, happy to practise teaching on housemates.',
    houseRules: ['Shala is phone-free', 'Quiet hours from 21:30', 'Shoes off inside'],
    interests: ['yoga', 'anatomy', 'meditation', 'plant-based food'],
    hostNote: 'For 200h trainees – study buddies welcome', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-16T07:00:00Z' },
  { id: 's31', slug: 'surf-coach-house-ericeira', title: 'Surf Coach House Ericeira', hostId: 'u26', vibe: 'surf', language: 'en',
    city: 'Ericeira', region: 'Portugal', lat: 38.963, lng: -9.417, mapPreviewUrl: map('ericeira-coach'),
    startDate: '2026-11-08', endDate: '2026-11-29', spotsTotal: 4, spotsFilled: 1,
    currency: 'EUR', accommodationStatus: 'open',
    description: 'Three weeks of coached sessions on Ericeira\'s reef and beach breaks, with video review every evening.',
    whyText: 'Most people plateau because nobody ever shows them their own surfing. I coach four people for three weeks, film every session and we fix one thing at a time.',
    dayText: 'Dawn session with coaching · breakfast and video review · land training or yoga · second session if the tide works · dinner and a surf film.',
    lookingForText: 'Intermediates who can paddle into green waves and want to turn properly. You\'re fine being filmed and hearing honest feedback.',
    houseRules: ['Boards and wetsuits rinse outside', 'Video review is mandatory', 'Lights out by 22:30 before dawn sessions'],
    interests: ['surfing', 'coaching', 'video analysis'],
    acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-19T14:00:00Z' },
  { id: 's32', slug: 'dive-house-gili-air', title: 'Dive House Gili Air', hostId: 'u27', vibe: 'holiday', language: 'en',
    city: 'Gili Air', region: 'Lombok, Indonesia', lat: -8.358, lng: 116.081, mapPreviewUrl: map('gili-air'),
    startDate: '2027-03-01', endDate: '2027-04-12', spotsTotal: 6, spotsFilled: 4,
    pricePerPerson: 690, currency: 'EUR', accommodationStatus: 'locked',
    accommodationLink: 'https://www.booking.com/example-gili-air-bungalows',
    description: 'Six weeks on a car-free island: from Open Water to Divemaster, all certifications done with one crew.',
    whyText: 'The fastest way through the PADI ladder is diving every day with the same people. I want a crew that goes Open Water to Divemaster together and keeps each other honest on dive logs.',
    dayText: '07:30 first dive · theory and knowledge reviews · second dive or skills in the pool · sunset at the west side · log book and early night.',
    lookingForText: 'Complete beginners up to Rescue divers who want to go pro or just go deep. Comfortable in water, fine with early boats and zero nightlife.',
    houseRules: ['No drinking within 12 hours of a dive', 'Rinse gear before the house', 'Log every dive the same day'],
    interests: ['scuba', 'freediving', 'marine life', 'island life'],
    hostNote: 'Open Water to Divemaster in one season', acceptingRequests: true, status: 'published', featured: true, createdAt: '2026-10-02T09:00:00Z' },
  { id: 's33', slug: 'climbing-house-railay', title: 'Climbing House Railay', hostId: 'u28', vibe: 'fitness', language: 'en',
    city: 'Railay', region: 'Krabi, Thailand', lat: 8.011, lng: 98.837, mapPreviewUrl: map('railay'),
    startDate: '2026-12-10', endDate: '2027-01-14', spotsTotal: 4, spotsFilled: 2,
    budgetPerPerson: { min: 450, max: 600 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'A jungle bungalow between Railay and Tonsai, five minutes from the limestone. Dry season, prime conditions.',
    whyText: 'Railay in dry season is the best sport climbing I know, but you need partners you trust on belay. I want a small, safe crew projecting together for a month.',
    dayText: '07:00 climb in the shade · long lunch and rest · fingerboard or yoga · evening session at the beach walls · Thai food and beta talk.',
    lookingForText: 'Lead climbers from 6a who can belay well and clean anchors. Bring your own rope and quickdraws, or rent locally.',
    houseRules: ['Partner check before every climb', 'Gear dries on the porch, not inside', 'Rest days are respected'],
    interests: ['sport climbing', 'yoga', 'snorkeling'],
    hostNote: 'Dry season, 6a and up', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-12T06:00:00Z' },
  { id: 's34', slug: 'hyrox-training-house-barcelona', title: 'Hyrox Training House Barcelona', hostId: 'u29', vibe: 'fitness', language: 'en',
    city: 'Poblenou', region: 'Catalonia, Spain', lat: 41.403, lng: 2.2, mapPreviewUrl: map('poblenou'),
    startDate: '2027-02-15', endDate: '2027-03-21', spotsTotal: 4, spotsFilled: 4,
    currency: 'EUR', accommodationStatus: 'open',
    description: 'Five weeks of race prep for Hyrox Barcelona: programmed sessions at my box, sleds on the beach, recovery done right.',
    whyText: 'Training camps work because everyone does the same plan and nobody skips the boring parts. I want a house that eats, sleeps and trains for race day together.',
    dayText: '07:00 run intervals on the beach · 10:00 stations at the box (sleds, wall balls, burpee broad jumps) · lunch and nap · mobility · early dinner.',
    lookingForText: 'Athletes registered for Hyrox Barcelona (Open or Pro). You can run a 10k under 50 and want structure, not a party.',
    houseRules: ['Follow the program – no ego lifting', 'Meal prep is shared', 'Sleep before 23:00'],
    interests: ['hyrox', 'running', 'functional fitness'],
    hostNote: 'Race prep, five weeks, full crew', acceptingRequests: false, status: 'published', featured: false, createdAt: '2026-10-03T07:30:00Z' },
  { id: 's35', hostFeePerPerson: 150, slug: 'marathon-prep-house-cape-town', title: 'Marathon Prep House Cape Town', hostId: 'u30', vibe: 'fitness', language: 'en',
    city: 'Sea Point', region: 'Western Cape, South Africa', lat: -33.915, lng: 18.389, mapPreviewUrl: map('sea-point'),
    startDate: '2027-02-01', endDate: '2027-03-14', spotsTotal: 5, spotsFilled: 2,
    budgetPerPerson: { min: 700, max: 900 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'Six weeks of warm-weather marathon build-up on the Sea Point promenade, with long runs around the peninsula.',
    whyText: 'A European winter is the worst place to build for a spring marathon. Here you get sun, a flat promenade for tempo runs and hills for strength – and a crew for the long Sundays.',
    dayText: '06:00 easy run or intervals on the promenade · breakfast together · work · strength and mobility · Sunday long run to Camps Bay and back.',
    lookingForText: 'Runners targeting a spring marathon (Tokyo, Boston, London, Paris) with a plan or open to mine. Any pace, but you show up at 6.',
    houseRules: ['Long run Sundays are a group thing', 'Carb-loading meals are shared', 'Quiet after 21:30'],
    interests: ['running', 'marathon', 'trail running'],
    hostNote: 'Spring marathon block in the sun', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-17T05:30:00Z' },
  { id: 's36', slug: 'writers-house-tbilisi', title: 'Writers\' House Tbilisi', hostId: 'u31', vibe: 'creator', language: 'en',
    city: 'Sololaki', region: 'Georgia', lat: 41.69, lng: 44.802, mapPreviewUrl: map('sololaki'),
    startDate: '2026-11-02', endDate: '2026-12-14', spotsTotal: 4, spotsFilled: 2,
    budgetPerPerson: { min: 400, max: 550 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'An old Sololaki apartment with tall windows and a long table. Six weeks to finish the thing you\'ve been writing.',
    whyText: 'Drafts get finished when there\'s structure and gentle peer pressure. I run this like a small residency: word counts on the fridge, readings on Fridays, wine afterwards.',
    dayText: 'Writing from 08:00 to 13:00, no talking · long lunch in the old town · admin or reading · Friday evening readings of work in progress.',
    lookingForText: 'Novelists, memoirists, screenwriters or poets with a project at least half drafted. Quiet mornings are sacred.',
    houseRules: ['Silence until 13:00', 'Friday readings – everyone shares something', 'No feedback unless asked'],
    interests: ['writing', 'books', 'wine', 'old towns'],
    hostNote: 'Finish the draft – silent mornings', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-07T12:00:00Z' },
  { id: 's37', slug: 'music-producer-house-berlin', title: 'Music Producer House Berlin', hostId: 'u32', vibe: 'creator', language: 'de',
    city: 'Kreuzberg', region: 'Berlin, Germany', lat: 52.499, lng: 13.403, mapPreviewUrl: map('kreuzberg'),
    startDate: '2027-01-08', endDate: '2027-02-19', spotsTotal: 3, spotsFilled: 2,
    currency: 'EUR', accommodationStatus: 'open',
    description: 'Ein Altbau in Kreuzberg mit gedämmtem Studio, zwei Arbeitsplätzen und Monitoren, die nicht lügen.',
    whyText: 'Allein im Schlafzimmer produzieren heißt: nichts wird fertig. Ich will drei Leute, die jeden Tag Tracks abschließen und sich gegenseitig ehrliches Feedback geben.',
    dayText: 'Vormittags Produktion im Studio im Schichtplan · Mittagessen zusammen · Feedback-Runde zu den Tracks des Tages · abends Clubs oder Plattenläden.',
    lookingForText: 'Produzent:innen elektronischer Musik mit eigenem Laptop und Kopfhörern, die ein EP-Projekt fertig machen wollen. Deutsch als Hausprache, Englisch geht auch.',
    houseRules: ['Studio-Schichten werden eingehalten', 'Kopfhörer nach 22 Uhr', 'Jeder spielt freitags einen fertigen Track'],
    interests: ['techno', 'music production', 'mixing', 'vinyl'],
    hostNote: 'Jeden Freitag ein fertiger Track', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-18T16:00:00Z' },
  { id: 's38', slug: 'photographers-house-lofoten', title: 'Photographers\' House Lofoten', hostId: 'u33', vibe: 'creator', language: 'en',
    city: 'Reine', region: 'Lofoten, Norway', lat: 67.932, lng: 13.088, mapPreviewUrl: map('reine'),
    startDate: '2027-02-06', endDate: '2027-02-27', spotsTotal: 4, spotsFilled: 3,
    pricePerPerson: 1200, currency: 'EUR', accommodationStatus: 'locked',
    accommodationLink: 'https://www.booking.com/example-reine-rorbu',
    description: 'Three weeks in a red fisherman\'s rorbu at the height of northern lights season. Aurora alerts, rental car, tripods everywhere.',
    whyText: 'Aurora photography is about waiting in the cold at 2am – much better with people who are just as obsessed. I know the spots and the forecasts; you bring the patience.',
    dayText: 'Late breakfast · scouting compositions in the blue hour · editing session · dinner early · aurora watch from 21:00, out the door when the KP rises.',
    lookingForText: 'Photographers with a full-frame or good APS-C body, a sturdy tripod and real winter gear. All levels, as long as you can stand still in −10 °C.',
    houseRules: ['Aurora alerts wake everyone up', 'Shared car, shared fuel', 'Leave no trace at the spots'],
    interests: ['photography', 'aurora', 'landscapes', 'winter'],
    hostNote: 'Peak aurora weeks, rorbu booked', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-01T10:00:00Z' },
  { id: 's39', slug: 'med-students-elective-house-cape-town', title: 'Med Students Elective House Cape Town', hostId: 'u34', vibe: 'mixed', language: 'en',
    city: 'Observatory', region: 'Western Cape, South Africa', lat: -33.938, lng: 18.47, mapPreviewUrl: map('observatory'),
    startDate: '2027-01-11', endDate: '2027-03-05', spotsTotal: 6, spotsFilled: 2,
    budgetPerPerson: { min: 500, max: 650 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'A house in Observatory, ten minutes from Groote Schuur, for medical and nursing students on their clinical electives.',
    whyText: 'Electives abroad are amazing and exhausting – long shifts, hard cases, a new city. Coming home to people who get it makes a huge difference.',
    dayText: 'Ward rounds from 07:00 · shifts vary · debrief over dinner · weekends: Table Mountain, Cape Point, Muizenberg surf.',
    lookingForText: 'Medical, nursing or physio students with a confirmed elective at a Cape Town hospital. Shift workers welcome – we keep the house calm.',
    houseRules: ['Sleeping night-shifters are sacred', 'Patient details never leave the hospital', 'Weekend trips are open to all'],
    interests: ['medicine', 'hiking', 'surfing'],
    acceptingRequests: false, status: 'published', featured: false, createdAt: '2026-10-08T18:00:00Z' },
  { id: 's40', slug: 'exchange-semester-house-seoul', title: 'Exchange Semester House Seoul', hostId: 'u35', vibe: 'mixed', language: 'en',
    city: 'Sinchon', region: 'South Korea', lat: 37.559, lng: 126.942, mapPreviewUrl: map('sinchon'),
    startDate: '2027-02-25', endDate: '2027-04-30', spotsTotal: 5, spotsFilled: 1,
    budgetPerPerson: { min: 450, max: 600 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'A shared house in Sinchon between Yonsei, Ewha and Sogang for exchange students who don\'t want a dorm.',
    whyText: 'Dorms are fine, but a real house with other exchange students means cooking, study nights and someone to explore Seoul with on day one.',
    dayText: 'Classes on campus · lunch at the student cafeteria · study at a 24h café · Korean language exchange twice a week · weekends in Busan or Jeonju.',
    lookingForText: 'Exchange students at Yonsei, Ewha, Sogang or Hongik for the spring semester. Up for Korean class and the occasional noraebang.',
    houseRules: ['Shoes off at the door', 'Recycling is sorted properly (it\'s the law)', 'Quiet hours during exams'],
    interests: ['studying', 'k-food', 'language exchange', 'nightlife'],
    hostNote: 'Spring semester, no dorm', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-20T13:00:00Z' },
  { id: 's41', slug: 'women-only-remote-house-mexico-city', title: 'Women-only Remote House Mexico City', hostId: 'u36', vibe: 'remote-work', language: 'en',
    city: 'Roma Norte', region: 'Mexico City, Mexico', lat: 19.418, lng: -99.162, mapPreviewUrl: map('roma-norte-women'),
    startDate: '2026-11-16', endDate: '2026-12-21', spotsTotal: 5, spotsFilled: 3,
    budgetPerPerson: { min: 700, max: 950 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'A sunny Roma Norte house with fast wifi, a rooftop for calls and a crew of women working remotely.',
    whyText: 'My first solo trips would have been so different with a house like this. Safe, social and productive – women supporting each other\'s work and adventures.',
    dayText: 'Morning walk to the café · focused work until 15:00 · lunch at the market · rooftop sunset · tacos, galleries or a mezcal tasting.',
    lookingForText: 'Women only – this is a women-only house. Remote workers or freelancers with a stable workload; first solo trip very welcome.',
    houseRules: ['This is a women-only house', 'Guests only with the whole house\'s okay', 'Rooftop is for calls until 15:00'],
    interests: ['remote work', 'design', 'food', 'art'],
    hostNote: 'Women only – first solo trips welcome', acceptingRequests: true, status: 'published', featured: true, createdAt: '2026-10-13T15:00:00Z' },
  { id: 's42', slug: 'over-35-founders-house-madeira', title: 'Over-35 Founders House Madeira', hostId: 'u37', vibe: 'founder', language: 'en',
    city: 'Funchal', region: 'Madeira, Portugal', lat: 32.65, lng: -16.908, mapPreviewUrl: map('funchal'),
    startDate: '2027-03-01', endDate: '2027-03-28', spotsTotal: 5, spotsFilled: 2,
    currency: 'EUR', accommodationStatus: 'open',
    description: 'A month in a quinta above Funchal for founders past their first company – strategy days, levada hikes, honest conversations.',
    whyText: 'Most founder houses are 25-year-olds pulling all-nighters. I want peers who\'ve already built and maybe sold something, have families and still want to build big.',
    dayText: 'Deep work 08:00–13:00 · lunch on the terrace · weekly strategy session where we pressure-test each other\'s plans · levada hikes · dinner by 19:30.',
    lookingForText: 'Founders 35+ who\'ve built at least one company before (exit, failure or still running). Families visiting for a week are welcome.',
    houseRules: ['No pitching to housemates', 'Weekly strategy session is mandatory', 'Phones away at dinner'],
    interests: ['startups', 'climate tech', 'hiking', 'wine'],
    hostNote: 'Second-time founders, 35+', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-15T09:00:00Z' },
  { id: 's43', slug: 'sober-wellness-house-koh-phangan', title: 'Sober Wellness House Koh Phangan', hostId: 'u38', vibe: 'wellness', language: 'en',
    city: 'Srithanu', region: 'Surat Thani, Thailand', lat: 9.733, lng: 100.006, mapPreviewUrl: map('srithanu'),
    startDate: '2027-01-10', endDate: '2027-02-07', spotsTotal: 6, spotsFilled: 2,
    budgetPerPerson: { min: 550, max: 750 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'An alcohol-free house in quiet Srithanu: breathwork, ice baths, sunset swims and the other side of Koh Phangan.',
    whyText: 'Getting sober doesn\'t mean giving up travel or fun. I want a house where nobody has to explain why they\'re not drinking, and mornings are the best part of the day.',
    dayText: '06:30 breathwork and ice bath · yoga or Muay Thai · work or rest · sunset swim at Zen Beach · ecstatic dance or a cacao circle twice a week.',
    lookingForText: 'Sober, sober-curious or just done with hangovers. The house is alcohol- and drug-free for everyone, the whole stay.',
    houseRules: ['Alcohol- and drug-free house', 'Morning practice is optional but encouraged', 'Kindness first'],
    interests: ['breathwork', 'ice baths', 'yoga', 'sobriety'],
    hostNote: 'Alcohol-free, sunrise-first', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-10T06:00:00Z' },
  { id: 's44', slug: 'festival-house-antwerp-tomorrowland', title: 'Festival House Antwerp', hostId: 'u39', vibe: 'holiday', language: 'en',
    city: 'Antwerp', region: 'Belgium', lat: 51.219, lng: 4.402, mapPreviewUrl: map('antwerp'),
    startDate: '2027-07-20', endDate: '2027-07-27', spotsTotal: 6, spotsFilled: 3,
    currency: 'EUR', accommodationStatus: 'open',
    description: 'A townhouse in Antwerp for Tomorrowland weekend one – shuttles to Boom, real beds, a hot shower after the mainstage.',
    whyText: 'DreamVille is great once. After that you want a real bed and a crew that has the timetable down. Antwerp is 20 minutes from the gates.',
    dayText: 'Late breakfast and timetable planning · shuttle to Boom at 13:00 · festival until close · shuttle back · pancakes at 3am · sleep till noon.',
    lookingForText: 'People with Tomorrowland weekend 1 tickets (or a solid plan to get them). Techno, trance or house – everyone picks one set for the group.',
    houseRules: ['Nobody leaves the festival alone', 'Water before every set', 'Quiet street – no afterparties at home'],
    interests: ['festivals', 'techno', 'house music', 'travel'],
    hostNote: 'Weekend 1 – real beds, 20 min to Boom', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-21T19:00:00Z' },
  { id: 's45', slug: 'ski-season-house-chamonix', title: 'Ski Season House Chamonix', hostId: 'u40', vibe: 'holiday', language: 'en',
    city: 'Chamonix', region: 'Haute-Savoie, France', lat: 45.924, lng: 6.869, mapPreviewUrl: map('chamonix'),
    startDate: '2027-01-04', endDate: '2027-03-29', spotsTotal: 5, spotsFilled: 2,
    pricePerPerson: 2100, currency: 'EUR', accommodationStatus: 'locked',
    accommodationLink: 'https://www.airbnb.com/rooms/example-chamonix-chalet',
    description: 'Three months in a chalet in Les Praz for a full season – Grands Montets, Brévent and some proper backcountry days.',
    whyText: 'A full season changes how you ski. I want a crew that rides every powder day, does an avalanche course together and still works enough to pay for it.',
    dayText: 'First lift on powder days · remote work or season job afternoons · après at the chalet · avalanche course in January · weekly ski-touring day.',
    lookingForText: 'Confident red-run skiers or riders who want to improve off-piste. Remote workers or seasonal workers – both fine. Avalanche gear required for touring days.',
    houseRules: ['Avalanche transceiver check before every tour', 'Boots dry in the boot room', 'Powder days beat meetings'],
    interests: ['skiing', 'snowboarding', 'ski touring', 'remote work'],
    hostNote: 'Full season, chalet locked', acceptingRequests: true, status: 'published', featured: true, createdAt: '2026-10-04T08:00:00Z' },
  { id: 's46', slug: 'remote-work-house-las-palmas', title: 'Remote Work House Las Palmas', hostId: 'u41', vibe: 'remote-work', language: 'en',
    city: 'Las Palmas', region: 'Gran Canaria, Spain', lat: 28.124, lng: -15.436, mapPreviewUrl: map('las-palmas'),
    startDate: '2027-01-10', endDate: '2027-01-31', spotsTotal: 5, spotsFilled: 3,
    budgetPerPerson: { min: 750, max: 950 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'Three winter weeks by Las Canteras – 22 degrees, fibre internet, a coworking around the corner and the beach for lunch breaks.',
    whyText: 'Everyone comes to Las Palmas in winter, but most people end up alone in an Airbnb. I want a house where work gets done in the morning and the afternoons are shared.',
    dayText: '08:00 swim at Las Canteras · 09:00–14:00 focused work · lunch at the market · afternoon calls or a hike in the north · tapas in Vegueta on Fridays.',
    lookingForText: 'Remote workers with a real workload and EU hours. Tidy, social in the evenings, quiet in the mornings.',
    houseRules: ['Mornings are for focus – calls in your room', 'Shared fridge, shared shopping list', 'Beach towels stay outside'],
    interests: ['remote work', 'swimming', 'hiking', 'tapas'],
    hostNote: 'Coworking pass for the whole crew', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-20T10:00:00Z' },
  { id: 's47', slug: 'surf-and-work-house-el-medano', title: 'Surf & Work House El Médano', hostId: 'u42', vibe: 'surf', language: 'en',
    city: 'El Médano', region: 'Tenerife, Spain', lat: 28.046, lng: -16.537, mapPreviewUrl: map('el-medano'),
    startDate: '2027-02-07', endDate: '2027-02-21', spotsTotal: 4, spotsFilled: 2,
    budgetPerPerson: { min: 600, max: 800 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'Two weeks in windy, sunny El Médano – surf at La Tejita or Las Américas, work from the terrace, Montaña Roja at sunset.',
    whyText: 'Surf trips are fun until you have to work. I want a crew that plans sessions around the forecast and still ships – one surf, one work block, every day.',
    dayText: 'Forecast check at 07:00 · first session · breakfast · work 10:00–15:00 · second session or Montaña Roja hike · cooking together.',
    lookingForText: 'Surfers from beginner to intermediate who work remotely. Happy to share boards and car rides to the south breaks.',
    houseRules: ['Rinse wetsuits outside', 'Forecast decides – meetings move', 'Quiet hours 22:00–07:00'],
    interests: ['surfing', 'remote work', 'hiking', 'windsurfing'],
    hostNote: 'Car + two spare boards in the house', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-19T08:00:00Z' },
  { id: 's48', slug: 'nomad-village-house-ponta-do-sol', title: 'Nomad Village House Ponta do Sol', hostId: 'u43', vibe: 'remote-work', language: 'en',
    city: 'Ponta do Sol', region: 'Madeira, Portugal', lat: 32.681, lng: -17.104, mapPreviewUrl: map('ponta-do-sol'),
    startDate: '2027-01-17', endDate: '2027-02-14', spotsTotal: 6, spotsFilled: 4,
    currency: 'EUR', accommodationStatus: 'open',
    description: 'Four weeks in the original nomad village – a house above the pier, the community coworking downstairs and Madeira\'s levadas on the weekends.',
    whyText: 'I\'ve watched hundreds of remote workers arrive here alone. The ones who stayed happy had a house and a few people to hike with. That\'s what I want to build for this month.',
    dayText: 'Coffee at the pier · coworking 09:00–13:00 · lunch at the bar on the beach · afternoon work or a swim · sunset drinks with the community · levada hike on Sundays.',
    lookingForText: 'Remote workers who want community without the party – people who show up to the Sunday hike and the Wednesday dinner.',
    houseRules: ['Sunday hike is a standing invitation', 'Leave the house tidier than you found it', 'Respect the neighbours – it\'s a small village'],
    interests: ['remote work', 'hiking', 'community', 'ocean swims'],
    hostNote: 'Community dinners every Wednesday', acceptingRequests: true, status: 'published', featured: true, createdAt: '2026-10-17T12:00:00Z' },
  { id: 's49', slug: 'ski-weekend-house-zillertal', title: 'Ski Weekend House Zillertal', hostId: 'u44', vibe: 'holiday', language: 'de',
    city: 'Mayrhofen', region: 'Tyrol, Austria', lat: 47.167, lng: 11.865, mapPreviewUrl: map('mayrhofen'),
    startDate: '2027-02-18', endDate: '2027-02-22', spotsTotal: 5, spotsFilled: 3,
    pricePerPerson: 390, currency: 'EUR', accommodationStatus: 'locked',
    accommodationLink: 'https://www.booking.com/example-mayrhofen-chalet',
    description: 'Vier Nächte im Zillertal: Penken, Ahorn und Hintertuxer Gletscher, eine Hütte mit Sauna und ein Frühstück, das bis zur ersten Gondel reicht.',
    whyText: 'Skiwochenenden scheitern meistens an der Planung. Ich übernehme Hütte, Skipässe und Einkauf – ihr müsst nur Lust auf Piste und gute Abende haben.',
    dayText: 'Frühstück um 07:30 · erste Gondel · Mittag auf der Hütte · Après-Ski in Mayrhofen · Sauna · Kaspressknödel und Kartenspiele.',
    lookingForText: 'Sichere Fahrerinnen und Fahrer auf roten Pisten, Ski oder Board. Wer Après-Ski mag, aber am nächsten Morgen trotzdem früh in der Gondel steht.',
    houseRules: ['Skischuhe bleiben im Skikeller', 'Wer kocht, spült nicht', 'Erste Gondel ist Pflicht am Samstag'],
    interests: ['skiing', 'snowboarding', 'sauna', 'après-ski'],
    hostNote: 'Hütte gebucht, Skipass-Rabatt für alle', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-14T18:00:00Z' },
  { id: 's50', slug: 'first-month-in-berlin', title: 'First Month in Berlin', hostId: 'u45', vibe: 'mixed', language: 'de',
    city: 'Friedrichshain', region: 'Berlin, Germany', lat: 52.515, lng: 13.454, mapPreviewUrl: map('friedrichshain'),
    startDate: '2027-03-01', endDate: '2027-03-29', spotsTotal: 5, spotsFilled: 1,
    budgetPerPerson: { min: 850, max: 1100 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'Ein Altbau in Friedrichshain für den ersten Monat in Berlin – für alle, die neu in der Stadt sind: Praktikum, neuer Job oder einfach ein Neustart.',
    whyText: 'Mein erster Monat in Berlin war einsam: Wohnungssuche, Anmeldung, niemand zum Reden. Mit einer WG auf Zeit findet man Leute, eine Routine und am Ende vielleicht eine richtige Wohnung.',
    dayText: 'Arbeit oder Praktikum unter der Woche · gemeinsames Abendessen zweimal pro Woche · Bürgeramt-Termine teilen · am Wochenende Flohmarkt am Boxhagener Platz, Tempelhofer Feld und Spätiabende.',
    lookingForText: 'Neu in Berlin – mit Job, Praktikum oder Studienstart im März. Offen, ordentlich und bereit, die Stadt gemeinsam zu entdecken.',
    houseRules: ['Putzplan hängt am Kühlschrank', 'Ruhe ab 22 Uhr unter der Woche', 'Gäste nur nach Absprache'],
    interests: ['city life', 'new jobs', 'cooking', 'flea markets'],
    hostNote: 'Hilfe bei Anmeldung und Wohnungssuche', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-22T09:00:00Z' },
  { id: 's51', slug: 'gaming-bootcamp-house-seoul', title: 'Gaming Bootcamp House Seoul', hostId: 'u46', vibe: 'streaming', language: 'en',
    city: 'Hongdae', region: 'Seoul, South Korea', lat: 37.556, lng: 126.923, mapPreviewUrl: map('hongdae'),
    startDate: '2027-04-05', endDate: '2027-04-26', spotsTotal: 5, spotsFilled: 3,
    currency: 'USD', accommodationStatus: 'open',
    description: 'Three weeks of scrims, VOD reviews and streams from Hongdae – gigabit internet, one room for setups, PC bangs on every corner.',
    whyText: 'Seoul is the best place in the world to grind games, but it\'s hard to break in alone. I want a house that trains like a team and streams like friends.',
    dayText: 'Late breakfast · VOD review at 13:00 · scrims 14:00–18:00 · dinner in Hongdae · streams 20:00–01:00 · Sunday off for the city.',
    lookingForText: 'Competitive players and streamers (Valorant, LoL, CS2 – Diamond and up, or a channel you\'re serious about). Fine with late nights, respectful on comms.',
    houseRules: ['Headsets on after midnight', 'No toxicity – in game or at home', 'Shared setup room stays clean'],
    interests: ['esports', 'streaming', 'korean food', 'night life'],
    hostNote: 'Gigabit fibre, setup room for 5', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-21T15:00:00Z' },
  { id: 's52', hostFeePerPerson: 120, slug: 'kitesurf-house-tarifa', title: 'Kitesurf House Tarifa', hostId: 'u47', vibe: 'surf', language: 'en',
    city: 'Tarifa', region: 'Andalusia, Spain', lat: 36.013, lng: -5.606, mapPreviewUrl: map('tarifa'),
    startDate: '2027-05-08', endDate: '2027-05-22', spotsTotal: 4, spotsFilled: 2,
    pricePerPerson: 690, currency: 'EUR', accommodationStatus: 'locked',
    accommodationLink: 'https://www.airbnb.com/rooms/example-tarifa-house',
    description: 'Two weeks of Levante and Poniente in Tarifa – a house near Los Lances, kites drying in the garden, Morocco on the horizon.',
    whyText: 'Kiting is a social sport – you need someone to launch and land your kite. I want a crew that chases the wind together and celebrates every first jump.',
    dayText: 'Wind check at breakfast · sessions at Los Lances or Valdevaqueros · siesta · second session or yoga · dinner in the old town.',
    lookingForText: 'Kiters who can ride upwind, or beginners booked into lessons (I can sort a discount). Patient with wind days and no-wind days alike.',
    houseRules: ['Kites dry in the garden, not the living room', 'Help each other launch and land', 'Sand stays at the door'],
    interests: ['kitesurfing', 'wing foiling', 'yoga', 'tapas'],
    hostNote: 'Lesson discount for beginners', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-16T11:00:00Z' },
  { id: 's53', hostFeePerPerson: 200, slug: 'padel-and-sun-house-marbella', title: 'Padel & Sun House Marbella', hostId: 'u48', vibe: 'fitness', language: 'en',
    city: 'Marbella', region: 'Andalusia, Spain', lat: 36.51, lng: -4.886, mapPreviewUrl: map('marbella'),
    startDate: '2027-04-15', endDate: '2027-04-25', spotsTotal: 5, spotsFilled: 3,
    budgetPerPerson: { min: 900, max: 1200 }, currency: 'EUR', accommodationStatus: 'open',
    description: 'Ten spring days of padel and sun – daily drills at my club, games against locals in the evening and long lunches on the beach.',
    whyText: 'Padel is the most social sport there is, but you need four. I want a house full of players who want to get better and have fun doing it.',
    dayText: 'Drills 09:00–10:30 · gym or beach · long lunch · siesta · open matches 18:00 · dinner in the old town.',
    lookingForText: 'Padel players from beginner-plus to intermediate (or tennis players switching over). Competitive on court, easygoing off it.',
    houseRules: ['Rackets and balls in the hallway', 'Early night before tournament day', 'Losers buy the coffee'],
    interests: ['padel', 'tennis', 'beach', 'spanish food'],
    hostNote: 'Daily coaching at my club included', acceptingRequests: true, status: 'published', featured: false, createdAt: '2026-10-18T17:00:00Z' },
];

// Extra Houses (x1–x50) and their hosts (p1–p37) from ./mock-houses-extra, mapped onto the app's types.

/** Language names in the extra data → the codes Stay.language uses. */
const LANGUAGE_CODES: Record<string, string> = { English: 'en', German: 'de', Spanish: 'es', Portuguese: 'pt', French: 'fr', Italian: 'it', Dutch: 'nl', Japanese: 'ja' };

function hostToUser(host: ExtraHost): User {
  const { socials, imageQueries, ...rest } = host;
  const handle = socials.instagram ?? socials.tiktok ?? host.name.toLowerCase();
  return {
    ...rest,
    ...socials,
    imageQueries,
    facePhotoQuery: FACE_QUERIES[host.id] ?? imageQueries[0],
    // portrait + two lifestyle photos (paths only – the photo pass below doesn't add House photos for these hosts)
    photos: [userFace(host.id), userPhotoPath(host.id, 2), userPhotoPath(host.id, 3)],
    privateContacts: { telegram: handle.replace(/[^a-z0-9_]/gi, '_') },
  };
}

function houseToStay(house: ExtraHouse): Stay {
  const { vibe, language, status, imageQueries, ...rest } = house;
  // 'full' is how the extra data spells it; in the app a full House is a published one with every spot taken.
  const full = status === 'full';
  return {
    ...rest,
    vibe,
    language: LANGUAGE_CODES[language] ?? 'en',
    status: full ? 'published' : status,
    ...(full && { acceptingRequests: false, spotsFilled: house.spotsTotal }),
    mapPreviewUrl: map(house.city.toLowerCase().replace(/\s+/g, '-')),
    imageQueries,
    // A locked House has its place: the same kind of placeholder listing as the original ones.
    ...(house.accommodationStatus === 'locked' && { accommodationLink: `https://www.airbnb.com/rooms/example-${house.slug}` }),
    // Past and done: everyone paid and the booking was confirmed.
    ...(status === 'completed' && { bookingConfirmedAt: new Date(new Date(house.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() }),
  };
}

/** Everyone: the original people (host fee allowed for verified hosts, as before; nobody is "Pro") plus the extra hosts. */
export const users: User[] = [
  ...coreUsers.map((user) => ({ ...user, isPro: false, canChargeHostFee: user.verified })),
  ...extraHosts.map(hostToUser),
];

export const stays: Stay[] = [...coreStays, ...extraHouses.map(houseToStay)];

export const joinRequests: JoinRequest[] = [
  { id: 'r1', stayId: 's1', userId: 'u4', message: 'Physio, train 6×/week, can cook for five. In if you\'ll have me.', status: 'accepted', createdAt: '2026-10-18T12:00:00Z' },
  { id: 'r2', stayId: 's1', userId: 'u8', message: 'Just started lifting, would love a crew that keeps me honest. Also I bake.', status: 'accepted', createdAt: '2026-10-18T14:10:00Z' },
  { id: 'r3', stayId: 's1', userId: 'u5', message: 'Hey Lukas! Motion designer, morning training is my thing. Fine with early nights.', status: 'pending', createdAt: '2026-10-19T20:30:00Z' },
  { id: 'r4', stayId: 's1', userId: 'u7', message: 'Can I stream one session from the gym? Otherwise totally your rules.', status: 'pending', createdAt: '2026-10-20T03:15:00Z' },
  { id: 'r5', stayId: 's2', userId: 'u1', message: 'Not a creator but I can hold a camera and I train. Any chance?', status: 'pending', createdAt: '2026-10-19T10:00:00Z' },
  { id: 'r6', stayId: 's3', userId: 'u1', message: 'Building a co-living app, 3 weeks in. Would love the Friday demos.', status: 'accepted', createdAt: '2026-10-16T09:00:00Z' },
  { id: 'r7', stayId: 's7', userId: 'u5', message: 'Design + motion, happy to be on stream.', status: 'accepted', createdAt: '2026-10-18T08:00:00Z' },
  { id: 'r8', stayId: 's6', userId: 'u8', message: 'I\'m 24, is that okay? I promise I\'m calm.', status: 'declined', createdAt: '2026-10-17T19:00:00Z' },
  { id: 'r9', stayId: 's11', userId: 'u15', message: 'Beginner at pilates but very consistent. Would love this.', status: 'pending', createdAt: '2026-10-20T07:30:00Z' },
  { id: 'r10', stayId: 's14', userId: 'u4', message: 'Blue belt, Muay Thai background, can share recovery tips.', status: 'accepted', createdAt: '2026-10-12T09:00:00Z' },
  { id: 'r11', stayId: 's16', userId: 'u3', message: 'Not e-com but fintech. Fine with gym at 6.', status: 'declined', createdAt: '2026-10-14T11:00:00Z' },
  { id: 'r12', stayId: 's18', userId: 'u7', message: 'US streaming hours, this is literally my schedule.', status: 'accepted', createdAt: '2026-10-18T02:00:00Z' },
  { id: 'r13', stayId: 's13', userId: 'u1', message: 'I\'m in Osaka right now – happy to help with logistics.', status: 'pending', createdAt: '2026-10-20T06:00:00Z' },
  { id: 'r14', stayId: 's1', userId: 'u17', message: 'First trip like this – I train 4×/week and I\'m an early riser.', status: 'pending', createdAt: '2026-10-21T07:00:00Z' },
  { id: 'r15', stayId: 's21', userId: 'u16', message: 'I stream backend coding on Twitch at night – would love a proper stream room and raids with the house.', status: 'accepted', createdAt: '2026-10-21T09:30:00Z' },
  { id: 'r16', stayId: 's22', userId: 'u7', message: 'Game-dev streamer, happy to carry the second camera and do a co-stream night market tour.', status: 'accepted', createdAt: '2026-10-20T20:15:00Z' },
  { id: 'r17', stayId: 's22', userId: 'u2', message: 'Filming my Asia series in December anyway – let\'s do some IRL collabs!', status: 'accepted', createdAt: '2026-10-20T21:40:00Z' },
  { id: 'r19', stayId: 's24', userId: 'u1', message: 'Dawn patrol every day before work – count me in.', status: 'accepted', createdAt: '2026-07-11T10:00:00Z' },
  { id: 'r20', stayId: 's24', userId: 'u13', message: 'Slow mornings, then surf. Happy to cook.', status: 'accepted', createdAt: '2026-07-12T10:00:00Z' },
  { id: 'r21', stayId: 's25', userId: 'u4', message: 'Need a calm work week before my next fight camp.', status: 'accepted', createdAt: '2026-08-16T10:00:00Z' },
  { id: 'r22', stayId: 's25', userId: 'u5', message: 'Motion designer, quiet worker, loud at karaoke.', status: 'accepted', createdAt: '2026-08-17T10:00:00Z' },
  { id: 'r25', stayId: 's1', userId: 'u13', message: 'Run club regular, cook on Sundays. Would love a training crew.', status: 'accepted', createdAt: '2026-10-19T15:00:00Z' },
  { id: 'r26', stayId: 's9', userId: 'u1', message: 'Long weekend of surf before the Lisbon month – in!', status: 'accepted', createdAt: '2026-10-08T12:00:00Z' },
  { id: 'r27', stayId: 's9', userId: 'u13', message: 'Can bring a spare board.', status: 'accepted', createdAt: '2026-10-08T15:00:00Z' },
  { id: 'r24', stayId: 's1', userId: 'u2', message: 'I film workouts anyway – would love a crew that trains together.', status: 'accepted', createdAt: '2026-10-19T09:00:00Z' },
  { id: 'r18', stayId: 's23', userId: 'u11', message: 'Quiet, tidy, I stream cozy design sessions. EU evenings are perfect for me.', status: 'pending', createdAt: '2026-10-21T07:45:00Z' },
  // Crews of the community Houses (s26–s45)
  { id: 'r28', stayId: 's26', userId: 'u14', message: 'Ship e-com by day, trade NQ at night – this is exactly my schedule.', status: 'accepted', createdAt: '2026-10-15T12:00:00Z' },
  { id: 'r29', stayId: 's26', userId: 'u16', message: 'Swing trader moving to intraday. Need people who journal.', status: 'accepted', createdAt: '2026-10-15T13:00:00Z' },
  { id: 'r30', stayId: 's27', userId: 'u10', message: 'Building a payments rail on Base, mainnet in January.', status: 'accepted', createdAt: '2026-10-10T12:00:00Z' },
  { id: 'r31', stayId: 's28', userId: 'u12', message: 'BJJ in the morning, London session after. Count me in.', status: 'accepted', createdAt: '2026-10-06T12:00:00Z' },
  { id: 'r32', stayId: 's29', userId: 'u9', message: 'B1 y quiero llegar a C1 – solo español, prometido.', status: 'accepted', createdAt: '2026-10-12T12:00:00Z' },
  { id: 'r33', stayId: 's29', userId: 'u19', message: 'Quiero hablar en mis streams en español. ¡Ayuda!', status: 'accepted', createdAt: '2026-10-12T13:00:00Z' },
  { id: 'r34', stayId: 's30', userId: 'u6', message: 'Starting my 200h at Radiantly Alive on Jan 6 – perfect timing.', status: 'accepted', createdAt: '2026-10-17T12:00:00Z' },
  { id: 'r35', stayId: 's32', userId: 'u8', message: 'Never dived before, want to go all the way to Divemaster.', status: 'accepted', createdAt: '2026-10-03T12:00:00Z' },
  { id: 'r36', stayId: 's32', userId: 'u15', message: 'Advanced Open Water done, going for Rescue.', status: 'accepted', createdAt: '2026-10-03T13:00:00Z' },
  { id: 'r37', stayId: 's32', userId: 'u17', message: 'Total beginner, comfortable in water, zero nightlife needed.', status: 'accepted', createdAt: '2026-10-03T14:00:00Z' },
  { id: 'r38', stayId: 's33', userId: 'u20', message: 'Leading 6c, belay certified, bringing a 70m rope.', status: 'accepted', createdAt: '2026-10-13T12:00:00Z' },
  { id: 'r39', stayId: 's34', userId: 'u4', message: 'Signed up for Pro Women, sub-75 is the goal.', status: 'accepted', createdAt: '2026-10-04T12:00:00Z' },
  { id: 'r40', stayId: 's34', userId: 'u14', message: 'Open division, my running is the weak part.', status: 'accepted', createdAt: '2026-10-04T13:00:00Z' },
  { id: 'r41', stayId: 's34', userId: 'u13', message: 'Doubles with a friend – need the structure.', status: 'accepted', createdAt: '2026-10-04T14:00:00Z' },
  { id: 'r42', stayId: 's35', userId: 'u16', message: 'Training for Tokyo, aiming for sub-3:15.', status: 'accepted', createdAt: '2026-10-18T12:00:00Z' },
  { id: 'r43', stayId: 's36', userId: 'u13', message: 'Memoir at 60k words, need to get to the end.', status: 'accepted', createdAt: '2026-10-08T12:00:00Z' },
  { id: 'r44', stayId: 's37', userId: 'u18', message: 'Mache Musik für meine Streams und will endlich eine EP rausbringen.', status: 'accepted', createdAt: '2026-10-19T12:00:00Z' },
  { id: 'r45', stayId: 's38', userId: 'u11', message: 'Shooting Fuji GFX, never seen an aurora. Patient and warm.', status: 'accepted', createdAt: '2026-10-02T12:00:00Z' },
  { id: 'r46', stayId: 's38', userId: 'u20', message: 'Night photographer, have a star tracker and a car licence.', status: 'accepted', createdAt: '2026-10-02T13:00:00Z' },
  { id: 'r47', stayId: 's39', userId: 'u15', message: 'Nursing elective in A&E at Groote Schuur, Jan–Feb.', status: 'accepted', createdAt: '2026-10-09T12:00:00Z' },
  { id: 'r48', stayId: 's41', userId: 'u2', message: 'Filming a series on solo female travel – this house is the dream.', status: 'accepted', createdAt: '2026-10-14T12:00:00Z' },
  { id: 'r49', stayId: 's41', userId: 'u9', message: 'Remote yoga studio admin, first time in Mexico.', status: 'accepted', createdAt: '2026-10-14T13:00:00Z' },
  { id: 'r50', stayId: 's42', userId: 'u10', message: 'Second company, food-tech this time. 35 and two kids.', status: 'accepted', createdAt: '2026-10-16T12:00:00Z' },
  { id: 'r51', stayId: 's43', userId: 'u17', message: 'Two years sober, want a calm month somewhere warm.', status: 'accepted', createdAt: '2026-10-11T12:00:00Z' },
  { id: 'r52', stayId: 's44', userId: 'u5', message: 'Weekend 1 full madness pass – I\'ll bring the timetable app.', status: 'accepted', createdAt: '2026-10-21T12:00:00Z' },
  { id: 'r53', stayId: 's44', userId: 'u19', message: 'Streaming IRL from the campsite gates, house is my base.', status: 'accepted', createdAt: '2026-10-21T13:00:00Z' },
  { id: 'r54', stayId: 's45', userId: 'u12', message: 'Snowboarder, want a full season and my first avalanche course.', status: 'accepted', createdAt: '2026-10-05T12:00:00Z' },
  // Crews of the new Houses (s46–s53)
  { id: 'r55', stayId: 's46', userId: 'u16', message: 'US startup hours start at 15:00 here – mornings are all yours for beach and work.', status: 'accepted', createdAt: '2026-10-21T10:00:00Z' },
  { id: 'r56', stayId: 's46', userId: 'u36', message: 'Product designer too – would love a design crit evening.', status: 'accepted', createdAt: '2026-10-21T11:00:00Z' },
  { id: 'r57', stayId: 's47', userId: 'u20', message: 'Surf in the morning, stream EU evenings – this is my exact rhythm.', status: 'accepted', createdAt: '2026-10-20T09:00:00Z' },
  { id: 'r58', stayId: 's48', userId: 'u5', message: 'Freelance motion designer, I\'ll bring the hiking boots.', status: 'accepted', createdAt: '2026-10-18T10:00:00Z' },
  { id: 'r59', stayId: 's48', userId: 'u11', message: 'Quiet worker, happy to help with the Wednesday dinners.', status: 'accepted', createdAt: '2026-10-18T12:00:00Z' },
  { id: 'r60', stayId: 's48', userId: 'u10', message: 'I\'ll cook the first Wednesday dinner – Canadian comfort food.', status: 'accepted', createdAt: '2026-10-18T14:00:00Z' },
  { id: 'r61', stayId: 's49', userId: 'u8', message: 'Fahre seit ich drei bin, bringe das Kartenspiel mit.', status: 'accepted', createdAt: '2026-10-15T09:00:00Z' },
  { id: 'r62', stayId: 's49', userId: 'u1', message: 'Board oder Ski, beides geht. Ich bin für die Sauna zuständig.', status: 'accepted', createdAt: '2026-10-15T10:00:00Z' },
  { id: 'r63', stayId: 's50', userId: 'u17', message: 'Starte im März mein Praktikum in Berlin und kenne noch niemanden.', status: 'pending', createdAt: '2026-10-23T08:00:00Z' },
  { id: 'r64', stayId: 's51', userId: 'u18', message: 'Variety streamer, I\'ll run the collab streams and bring a capture card.', status: 'accepted', createdAt: '2026-10-22T08:00:00Z' },
  { id: 'r65', stayId: 's51', userId: 'u7', message: 'Game dev streamer – would love to playtest with real competitive players.', status: 'accepted', createdAt: '2026-10-22T09:00:00Z' },
  { id: 'r66', stayId: 's52', userId: 'u4', message: 'Riding upwind since last summer, want to land my first jump.', status: 'accepted', createdAt: '2026-10-17T12:00:00Z' },
  { id: 'r67', stayId: 's53', userId: 'u14', message: 'Played tennis for ten years, switching to padel. Gym at 6 as usual.', status: 'accepted', createdAt: '2026-10-19T09:00:00Z' },
  { id: 'r68', stayId: 's53', userId: 'u23', message: 'Padel three times a week in Dubai – London session in the evening.', status: 'accepted', createdAt: '2026-10-19T10:00:00Z' },
];

// The extra Houses come with a filled-spot count but no crew: give each the accepted requests behind it, picked
// deterministically from everyone else with a photo (never Lukas, the default mock user, so his inbox stays as it is).
const EXTRA_CREW_MESSAGES = [
  'Sounds exactly like my kind of week – count me in.',
  'Been looking for a crew for this. Easygoing, tidy, up early.',
  'I can cook for the group one night. Really looking forward to it.',
  'First time doing something like this, but it feels right.',
  'Dates work perfectly for me. Happy to help with planning.',
];
{
  const pool = users.filter((u) => u.id !== CURRENT_USER_ID && u.photos.length > 0);
  let n = 0;
  for (const [index, house] of extraHouses.entries()) {
    const candidates = pool.filter((u) => u.id !== house.hostId);
    const crewSize = Math.max(0, (house.status === 'full' ? house.spotsTotal : house.spotsFilled) - 1);
    for (let i = 0; i < crewSize; i++) {
      const member = candidates[(index * 7 + i * 11) % candidates.length];
      if (joinRequests.some((r) => r.stayId === house.id && r.userId === member.id)) continue;
      n++;
      joinRequests.push({
        id: `rx${n}`,
        stayId: house.id,
        userId: member.id,
        message: EXTRA_CREW_MESSAGES[(index + i) % EXTRA_CREW_MESSAGES.length],
        status: 'accepted',
        createdAt: new Date(new Date(house.createdAt).getTime() + (i + 1) * 5 * 60 * 60 * 1000).toISOString(),
      });
    }
  }
}

export const threads: Thread[] = [
  {
    id: 't-s1', type: 'crew', stayId: 's1', participantIds: ['u1', 'u4', 'u8', 'u2', 'u13'],
    messages: [
      { id: 'm1', userId: 'system', text: 'Aisha joined the crew', createdAt: '2026-10-18T12:05:00Z' },
      { id: 'm2', userId: 'u4', text: 'Hi all! Which gym are we talking – Nirvana or Body Factory?', createdAt: '2026-10-18T12:20:00Z' },
      { id: 'm3', userId: 'u1', text: 'Body Factory, 5 min on the scooter. Villa is locked, link is pinned.', createdAt: '2026-10-18T12:45:00Z' },
      { id: 'm4', userId: 'system', text: 'Lena joined the crew', createdAt: '2026-10-18T14:30:00Z' },
      { id: 'm5', userId: 'u8', text: 'Hello!! So happy. Who\'s arriving when?', createdAt: '2026-10-18T14:32:00Z' },
    ],
  },
  {
    id: 't-s3', type: 'crew', stayId: 's3', participantIds: ['u3', 'u1'],
    messages: [
      { id: 'm6', userId: 'system', text: 'Lukas joined the crew', createdAt: '2026-10-16T09:30:00Z' },
      { id: 'm7', userId: 'u3', text: 'Welcome. Three houses in the chat so far – vote by Sunday?', createdAt: '2026-10-16T10:00:00Z' },
    ],
  },
  {
    id: 't-d1', type: 'direct', stayId: 's1', participantIds: ['u1', 'u5'],
    messages: [
      { id: 'm8', userId: 'u1', text: 'Hey Jonas – what time zone do you work? We\'re all up at 6:30.', createdAt: '2026-10-19T21:00:00Z' },
      { id: 'm9', userId: 'u5', text: 'European clients, so I\'m free mornings. 6:30 is fine if there\'s coffee.', createdAt: '2026-10-19T21:40:00Z' },
    ],
  },
];

export const VIBES: { key: Vibe; label: string }[] = [
  { key: 'fitness', label: 'Fitness' },
  { key: 'surf', label: 'Surf' },
  { key: 'creator', label: 'Creator' },
  { key: 'streaming', label: 'Streaming' },
  { key: 'founder', label: 'Founder' },
  { key: 'remote-work', label: 'Remote work' },
  { key: 'trading', label: 'Trading' },
  { key: 'wellness', label: 'Wellness' },
  { key: 'yoga', label: 'Yoga' },
  { key: 'diving', label: 'Diving' },
  { key: 'climbing', label: 'Climbing' },
  { key: 'language', label: 'Language' },
  { key: 'students', label: 'Students' },
  { key: 'holiday', label: 'Holiday' },
  { key: 'mixed', label: 'Mixed' },
  { key: 'party', label: 'Party' },
  { key: 'singles', label: 'Singles' },
  { key: 'weekend', label: 'Short trip' },
  { key: 'business', label: 'Business' },
  { key: 'social', label: 'Social' },
  { key: 'adventure', label: 'Adventure' },
  { key: 'culture', label: 'Culture' },
  { key: 'food', label: 'Food' },
  { key: 'study', label: 'Study' },
];

export const START_FILTERS = [
  { key: 'any', label: 'Any date' },
  { key: '14d', label: 'Next 2 weeks' },
  { key: '30d', label: 'This month' },
  { key: '90d', label: 'Next 3 months' },
] as const;

// Photo pass: every House gets its theme photos, every person their face plus the theme photos of the House they
// host (or else the first one they're in), so profiles show the world they travel in.
// Extra Houses: imageQueries[0] is the cover, [1..3] the gallery; extra hosts keep their portrait + lifestyle photos.
for (const stay of stays) {
  stay.themeQueries = THEME_QUERIES[stay.id] ?? stay.imageQueries?.map((q, i) => THEME_QUERY_FIXES[`${stay.id}/${i + 1}`] ?? q);
  stay.imageQueries ??= stay.themeQueries;
  stay.photos = (stay.themeQueries ?? []).map((_, i) => houseThemePath(stay.id, i + 1));
}
for (const user of users) {
  if (user.imageQueries) continue;
  user.facePhotoQuery = FACE_QUERIES[user.id];
  const hosted = stays.find((s) => s.hostId === user.id);
  const joined = joinRequests.find((r) => r.userId === user.id && r.status === 'accepted');
  const house = hosted ?? stays.find((s) => s.id === joined?.stayId);
  // Someone without any photo (u17, just signed up) stays that way – it's how the "no photo yet" states are tested.
  if (user.photos.length > 0) user.photos = [userFace(user.id), ...(house?.photos ?? [])];
}
