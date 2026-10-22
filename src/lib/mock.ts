// src/lib/mock.ts – Simpulo mock data (no backend)
// Images: portraits via i.pravatar.cc (up to 1000px), lifestyle shots via picsum.photos (1200×1500, portrait).
// next.config: images.remotePatterns for i.pravatar.cc and picsum.photos

export type Vibe = 'fitness' | 'creator' | 'founder' | 'remote-work' | 'holiday' | 'surf' | 'wellness';
export type AccommodationStatus = 'open' | 'locked';
/** Currencies a host can price a House in. */
export type Currency = 'EUR' | 'USD' | 'IDR' | 'GBP' | 'AUD' | 'THB';

export type StayStatus = 'draft' | 'published' | 'booked' | 'completed' | 'closed'; // booked = paid + booking confirmed; closed = host ended it early
export type RequestStatus = 'pending' | 'accepted' | 'declined';

export interface User {
  id: string;
  name: string;
  age: number;
  country: string;          // plain text, no flag
  city: string;             // current base
  languages: string[];      // ISO-ish labels shown as text: "English", "German"
  bio: string;
  photos: string[];         // [0] = face, then lifestyle; 3 per user
  verified: boolean;
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
  createdAt: string;
  // Set when the host locks the accommodation (payments are created then):
  lockedAt?: string;
  totalPrice?: number;      // whole place, in `currency`
  payByDate?: string;       // YYYY-MM-DD
  // After everyone paid and the host uploaded the booking:
  bookingConfirmedAt?: string;
  bookingProofUrl?: string;
}

export type PaymentRecordStatus = 'pending' | 'paid' | 'refunded';

/** One crew member's share of a locked place. fee = 10% of share, capped at 50 (house currency). */
export interface Payment {
  id: string;
  stayId: string;
  userId: string;
  share: number;
  fee: number;
  total: number;            // share + fee – what the guest pays
  status: PaymentRecordStatus;
  paidAt?: string;
}

export interface JoinRequest {
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

const face = (n: number) => `https://i.pravatar.cc/1000?img=${n}`;
const shot = (seed: string) => `https://picsum.photos/seed/${seed}/1200/1500`;
const map = (seed: string) => `https://picsum.photos/seed/map-${seed}/800/500?grayscale`;

export const CURRENT_USER_ID = 'u1';

export const users: User[] = [
  {
    id: 'u1', name: 'Lukas', age: 30, country: 'Germany', city: 'Osaka',
    languages: ['German', 'English'],
    bio: 'Remote app-dev teacher. Train every morning, work German hours, free before 3 pm.',
    photos: [face(12), shot('lukas-gym'), shot('lukas-cafe')],
    verified: true, instagram: 'lukas.moves', website: 'https://simpulo.app', savedStayIds: ['s2', 's13', 's19'], hostAlerts: ['u18'], privateContacts: { whatsapp: '+4917612345678', telegram: 'lukasmoves', facetime: 'lukas.moves@icloud.com' },
  },
  {
    id: 'u2', name: 'Mara', age: 27, country: 'Netherlands', city: 'Canggu',
    languages: ['Dutch', 'English', 'Spanish'],
    bio: 'Travel creator, 18k on TikTok. Filming a Bali series this winter.',
    photos: [face(47), shot('mara-beach'), shot('mara-scooter'), shot('mara-cafe'), shot('mara-sunset')],
    verified: true, instagram: 'mara.goes', tiktok: 'mara.goes', youtube: '@maragoes', linkedin: 'mara-de-vries', x: 'maragoes', threads: 'mara.goes', website: 'https://maragoes.com', privateContacts: { whatsapp: '+31612345678', telegram: 'mara_goes', signal: '+31612345678', facetime: '+31612345678' },
  },
  {
    id: 'u3', name: 'Tom', age: 33, country: 'United Kingdom', city: 'Lisbon',
    languages: ['English', 'Portuguese'],
    bio: 'Building a fintech side project. Surf before standup.',
    photos: [face(33), shot('tom-surf'), shot('tom-laptop'), shot('tom-market')],
    verified: true, linkedin: 'tom-ellis', x: 'tomellis', website: 'https://tomellis.dev', privateContacts: { phone: '+447700900123' },
  },
  {
    id: 'u4', name: 'Aisha', age: 29, country: 'Australia', city: 'Melbourne',
    languages: ['English'],
    bio: 'Physio & Muay Thai nerd. Looking for people who train seriously and eat well.',
    photos: [face(44), shot('aisha-muaythai'), shot('aisha-food'), shot('aisha-beach'), shot('aisha-run')],
    verified: true, instagram: 'aisha.fights', youtube: '@aishafights', tiktok: 'aisha.fights', privateContacts: { whatsapp: '+61412345678', telegram: 'aishafights' },
  },
  {
    id: 'u5', name: 'Jonas', age: 25, country: 'Sweden', city: 'Chiang Mai',
    languages: ['Swedish', 'English', 'German'],
    bio: 'Freelance motion designer. Night owl, coffee snob, always up for a hike.',
    photos: [face(15), shot('jonas-hike'), shot('jonas-desk'), shot('jonas-coffee')],
    verified: false, instagram: 'jonas.motion', threads: 'jonas.motion', linkedin: 'jonas-lind', privateContacts: { whatsapp: '+46701234567', signal: '+46701234567' },
  },
  {
    id: 'u6', name: 'Priya', age: 31, country: 'India', city: 'Bangkok',
    languages: ['Hindi', 'English'],
    bio: 'Product manager on a 6-month sabbatical. Yoga, markets, slow mornings.',
    photos: [face(49), shot('priya-yoga'), shot('priya-market'), shot('priya-temple'), shot('priya-books')],
    verified: true, linkedin: 'priya-nair', instagram: 'priya.slow', privateContacts: { whatsapp: '+919812345678' },
  },
  {
    id: 'u7', name: 'Diego', age: 28, country: 'Mexico', city: 'Da Nang',
    languages: ['Spanish', 'English'],
    bio: 'Streams indie game dev on Twitch. Need a house with fast wifi and a pool.',
    photos: [face(56), shot('diego-stream'), shot('diego-pool'), shot('diego-street')],
    verified: true, twitch: 'diegobuilds', x: 'diegobuilds', website: 'https://diegobuilds.gg', privateContacts: { whatsapp: '+525512345678', discord: 'diegobuilds#7731' },
  },
  {
    id: 'u8', name: 'Lena', age: 24, country: 'Austria', city: 'Berlin',
    languages: ['German', 'English', 'French'],
    bio: 'Medical student on a gap semester. First solo trip – want a crew, not a hostel.',
    photos: [face(26), shot('lena-run'), shot('lena-city'), shot('lena-coffee'), shot('lena-hike')],
    verified: false, instagram: 'lena.wanders', tiktok: 'lena.wanders', threads: 'lena.wanders', privateContacts: {},
  },
  { id: 'u9', name: 'Sofia', age: 26, country: 'Italy', city: 'Canggu',
    languages: ['Italian', 'English'],
    bio: 'Pilates instructor and sunrise person. Teaching at two studios in Canggu this season.',
    photos: [face(32), shot('sofia-pilates'), shot('sofia-sunrise'), shot('sofia-beach')],
    verified: true, instagram: 'sofia.flows', tiktok: 'sofia.flows', youtube: '@sofiaflows', privateContacts: { whatsapp: '+393471234567', telegram: 'sofiaflows', facetime: 'sofia.flows@icloud.com' },
  },
  { id: 'u10', name: 'Ben', age: 35, country: 'Canada', city: 'Mexico City',
    languages: ['English', 'French', 'Spanish'],
    bio: 'Ex-agency, now solo consultant. Cooking is how I make friends.',
    photos: [face(60), shot('ben-cooking'), shot('ben-market'), shot('ben-bike')],
    verified: true, linkedin: 'ben-carter', website: 'https://bencarter.co', privateContacts: { whatsapp: '+14165550123' },
  },
  { id: 'u11', name: 'Yuki', age: 28, country: 'Japan', city: 'Osaka',
    languages: ['Japanese', 'English'],
    bio: 'UX designer, first long trip outside Japan. Quiet, tidy, loves a good café.',
    photos: [face(41), shot('yuki-cafe'), shot('yuki-design'), shot('yuki-street'), shot('yuki-park')],
    verified: true, instagram: 'yuki.makes', threads: 'yuki.makes', privateContacts: { telegram: 'yukimakes' },
  },
  { id: 'u12', name: 'Marco', age: 32, country: 'Brazil', city: 'Florianópolis',
    languages: ['Portuguese', 'English', 'Spanish'],
    bio: 'Jiu-jitsu brown belt, runs a small SaaS. Looking for mats and a pool.',
    photos: [face(52), shot('marco-bjj'), shot('marco-beach'), shot('marco-surf')],
    verified: true, instagram: 'marco.rolls', youtube: '@marcorolls', x: 'marcorolls', privateContacts: { whatsapp: '+5548991234567' },
  },
  { id: 'u13', name: 'Hannah', age: 29, country: 'Ireland', city: 'Lisbon',
    languages: ['English'],
    bio: 'Writes a newsletter about slow travel (9k subs). Tea, books, long walks.',
    photos: [face(20), shot('hannah-books'), shot('hannah-walk'), shot('hannah-sea'), shot('hannah-cafe')],
    verified: true, instagram: 'hannah.slowly', website: 'https://slowly.substack.com', privateContacts: { whatsapp: '+353851234567', telegram: 'hannahslowly' },
  },
  { id: 'u14', name: 'Karim', age: 27, country: 'France', city: 'Bangkok',
    languages: ['French', 'English', 'Arabic'],
    bio: 'Runs a Shopify store from anywhere with wifi. Gym at 6, calls at 15.',
    photos: [face(58), shot('karim-gym'), shot('karim-laptop'), shot('karim-city')],
    verified: false, instagram: 'karim.ships', tiktok: 'karim.ships', privateContacts: { whatsapp: '+33612345678' },
  },
  { id: 'u15', name: 'Emma', age: 24, country: 'Denmark', city: 'Copenhagen',
    languages: ['Danish', 'English', 'German'],
    bio: 'Nursing degree done, three months off before the first job. First time in Asia.',
    photos: [face(23), shot('emma-bike'), shot('emma-sea'), shot('emma-harbour'), shot('emma-cafe')],
    verified: false, instagram: 'emma.away', tiktok: 'emma.away', threads: 'emma.away', privateContacts: {},
  },
  { id: 'u16', name: 'Raj', age: 31, country: 'Singapore', city: 'Singapore',
    languages: ['English', 'Tamil', 'Mandarin'],
    bio: 'Backend engineer, remote for a US startup. Nights are free, days are mine.',
    photos: [face(63), shot('raj-run'), shot('raj-desk'), shot('raj-city')],
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
    photos: [face(59), shot('nico-setup'), shot('nico-lisbon'), shot('nico-cafe'), shot('nico-night')],
    verified: true, twitch: 'nicoplays', kick: 'nicoplays', youtube: '@nicoplays', instagram: 'nico.plays', privateContacts: { whatsapp: '+4915112345678', telegram: 'nicoplays', discord: 'nico#0421' },
  },
  { id: 'u19', name: 'Sasha', age: 26, country: 'Ukraine', city: 'Bangkok',
    languages: ['Ukrainian', 'English', 'Russian'],
    bio: 'IRL and travel streamer. Street food, night markets and a backpack full of batteries.',
    photos: [face(9), shot('sasha-irl'), shot('sasha-market'), shot('sasha-street')],
    verified: true, kick: 'sashairl', twitch: 'sashairl', tiktok: 'sasha.irl', privateContacts: { telegram: 'sashairl', discord: 'sashairl' },
  },
  { id: 'u20', name: 'Leo', age: 31, country: 'Spain', city: 'Canggu',
    languages: ['Spanish', 'English', 'Catalan'],
    bio: 'Chess and cozy-games streamer. Works EU evenings, surfs in the morning.',
    photos: [face(13), shot('leo-chess'), shot('leo-surf'), shot('leo-beach'), shot('leo-cafe')],
    verified: true, twitch: 'leomoves', kick: 'leomoves', x: 'leomoves', privateContacts: { whatsapp: '+34612345678', discord: 'leomoves#1990' },
  },
];

export const stays: Stay[] = [
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
    id: 's2', slug: 'creator-house-uluwatu', title: 'Creator House Uluwatu', hostId: 'u2', vibe: 'creator', language: 'en',
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
    id: 's4', slug: 'muay-thai-house-phuket', title: 'Muay Thai House Phuket', hostId: 'u4', vibe: 'fitness', language: 'en',
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
  { id: 's21', slug: 'streaming-villa-lisbon', title: 'Streaming Villa Lisbon', hostId: 'u18', vibe: 'creator', language: 'de',
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
];

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
];

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
  { key: 'creator', label: 'Creator' },
  { key: 'founder', label: 'Founder' },
  { key: 'remote-work', label: 'Remote work' },
  { key: 'surf', label: 'Surf' },
  { key: 'wellness', label: 'Wellness' },
  { key: 'holiday', label: 'Holiday' },
];

export const START_FILTERS = [
  { key: 'any', label: 'Any date' },
  { key: '14d', label: 'Next 2 weeks' },
  { key: '30d', label: 'This month' },
  { key: '90d', label: 'Next 3 months' },
] as const;
