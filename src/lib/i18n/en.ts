// Every text of the product (everything outside /admin) – English, the one source (CLAUDE.md "Texte und Sprachen"). Grouped by area
// (explore, house, messages, settings …); placeholders in ICU form ({host}, {count}), plurals as ICU plural ("{count, plural, one {# spot
// left} other {# spots left}}" – next-intl picks the form with Intl.PluralRules). A second language later: a file with the same shape
// (lib/i18n/<code>.ts, typed against ProductMessages), its code in i18n/config.ts and its line in i18n/request.ts – nothing else changes.
// The admin is German and has its own file (lib/i18n/admin.de.ts).
import { AGREEMENT_HOURS } from "@/config/arc";
import { DEADLINE_HOURS as H } from "@/config/policies";
import { PROGRAM_FULL_DAYS_BEFORE } from "@/config/program";

const en = {
  "meta": {
    "siteTitle": "Simpulo – Share a place. Find your people.",
    "titleTemplate": "%s · Simpulo",
    "siteDescription": "Find people to share a house with for a few weeks – hosted by real people, anywhere.",
    "pages": {
      "invite": "Invite friends",
      "house": "House",
      "createHouse": "Open a House",
      "editHouse": "Edit House",
      "houses": "Houses",
      "manageHouse": "Manage House",
      "messages": "Messages",
      "chat": "Chat",
      "profile": "Profile",
      "howItWorks": "How it works",
      "about": "About",
      "contact": "Contact",
      "imprint": "Impressum",
      "privacy": "Privacy Policy",
      "terms": "Terms of Service",
      "editProfile": "Edit profile",
      "settings": "Settings",
      "welcome": "Complete your profile",
      "host": "Host a House",
      "claim": "Claim your House",
      "adminGrowth": "Growth",
      "adminHouses": "Prepared Houses",
      "adminNewHouse": "Prepare a House",
      "notifications": "Notifications",
      "people": "People",
      "saved": "Saved houses"
    }
  },
  "common": {
    "loadMore": {
      "showing": "Showing {shown} of {total} {kind, select, updates {updates} other {houses}}",
      "more": "Show {count} more",
      "loading": "Loading more",
      "all": "That's all {total} {kind, select, updates {updates} other {houses}}",
      "openOwn": "Open your own"
    },
    "datesTbd": "Dates TBD",
    "budgetTbd": "Price set with crew",
    "pricePerPersonShort": "{price} pp",
    "estimated": "est.",
    "pp": "pp",
    "budgetPerPersonShort": "{range} pp",
    "cityOpen": "{region} · city open",
    "ageAndCountry": "{age} · {country}",
    "nights": "{count, plural, one {# night} other {# nights}}",
    "spots": "{count, plural, one {# spot} other {# spots}}",
    "people": "{count, plural, one {# person} other {# people}}",
    "links": "{count, plural, one {# link} other {# links}}",
    "requests": "{count, plural, one {# request} other {# requests}}",
    "houses": "{count, plural, one {# house} other {# houses}}",
    "countries": "{count, plural, one {# country} other {# countries}}",
    "shares": "{count, plural, one {# share} other {# shares}}",
    "vibes": {
      "fitness": "Fitness",
      "creator": "Creator",
      "founder": "Founder",
      "remote-work": "Remote work",
      "wellness": "Wellness",
      "students": "Students",
      "holiday": "Holiday",
      "party": "Party",
      "social": "Social",
      "adventure": "Adventure",
      "culture": "Culture",
      "surf-water": "Surf & Water"
    },
    "subThemes": {
      "running": "Running",
      "martial-arts": "Martial arts",
      "strength": "Strength",
      "yoga": "Yoga",
      "retreat": "Retreat",
      "surf": "Surf",
      "dive-sail": "Dive & sail",
      "nomads": "Nomads",
      "startup": "Startup",
      "music": "Music",
      "film-photo": "Film & photo",
      "writing": "Writing",
      "mountains": "Mountains",
      "language": "Language",
      "food": "Food",
      "festival": "Festival",
      "study": "Study"
    },
    "paymentStatus": {
      "paid": "Paid",
      "pending": "Pending"
    },
    "requestStatus": {
      "pending": "Pending",
      "accepted": "Accepted",
      "declined": "Didn't work out",
      "invited": "Invited",
      "expired": "Didn't work out",
      "waitlist_requested": "Waitlist requested",
      "waitlisted": "On the waitlist"
    },
    "cancel": "Cancel",
    "close": "Close",
    "back": "Back",
    "more": "More",
    "you": "you",
    "linkCopied": "Link copied to clipboard",
    "linkCopyFailed": "Couldn't copy the link",
    "ui": {
      "moreMenu": {
        "moreOptions": "More options",
        "closeMenu": "Close menu"
      },
      "carousel": {
        "defaultItem": "House",
        "previous": "Previous {item}",
        "next": "Next {item}",
        "previousShort": "Previous",
        "nextShort": "Next",
        "goTo": "Go to {item} {index}"
      },
      "cardTab": {
        "profile": "{name}'s profile"
      },
      "crewAvatars": {
        "justOpened": "Just opened"
      },
      "filterChips": {
        "all": "All"
      },
      "languageChips": {
        "label": "Languages"
      },
      "openHouse": {
        "label": "Open a House"
      },
      "pageSkeleton": {
        "loading": "Loading"
      },
      "personPhoto": {
        "noPhoto": "{name} (no photo yet)"
      },
      "photoUploader": {
        "slotFace": "Your face",
        "slotActivity": "What you're up to",
        "replace": "Replace photo {index}",
        "remove": "Remove photo {index}",
        "required": "Required",
        "reorderHint": "Drag to reorder – the first one is your face.",
        "face": "Face",
        "addPhoto": "Add photo"
      },
      "photoSheet": {
        "title": "Add a photo",
        "hint": "Start with a clear photo of your face – hosts decide who joins.",
        "save": "Save",
        "added": "Photo added"
      },
      "priceLine": {
        "perPerson": "{price} per person",
        "budgetPerPerson": "~{range} per person",
        "note": "includes everything – you pay only when the house is locked",
        "approx": "≈ {amount} · approximate, you pay in {currency}",
        "pricedIn": "Priced in {currency} · {amount} pp"
      },
      "currency": {
        "sheetTitle": "Currency",
        "sheetSubtitle": "Prices are shown in it. You always pay in the House's own currency.",
        "shownIn": "Shown in {currency}",
        "change": "Change",
        "hint": "Prices in {current}",
        "hintSwitch": "Switch to {other}"
      },
      "socialRow": {
        "onNetwork": "{name} on {network}",
        "handleOn": "{handle} on {network}",
        "website": "Website"
      },
      "save": {
        "save": "Save {title}",
        "unsave": "Remove {title} from saved",
        "saved": "Saved",
        "saveShort": "Save",
        "loginToSave": "Log in to save this House"
      },
      "hostAlert": {
        "notifyMe": "Notify me",
        "notifying": "Notifying",
        "notifyMeLabel": "Notify me when {name} opens a House",
        "notifyingLabel": "Stop alerts for new Houses from {name}",
        "loginToNotify": "Log in to get alerts from {name}",
        "on": "You'll hear when {name} opens a House",
        "off": "Alerts from {name} turned off"
      },
      "preview": {
        "exit": "Exit preview",
        "noChanges": "Preview only – nothing is changed",
        "profile": "You're seeing your profile as others do",
        "house": "This is how guests see your House",
        "button": "Preview",
        "hostRequestsDisabled": "You're the host – requests are disabled in preview."
      },
      "form": {
        "optional": "Optional",
        "preview": "Preview"
      },
      "dateRange": {
        "placeholder": "Add dates",
        "from": "From {date} – pick the end",
        "dialog": "Choose dates",
        "quick": {
          "week": "1 week",
          "twoWeeks": "2 weeks",
          "month": "1 month"
        },
        "pickStart": "Pick the start",
        "pickEnd": "Now pick the end",
        "previousMonth": "Previous month",
        "nextMonth": "Next month",
        "maxNights": "From tomorrow, up to {max} nights."
      },
      "verified": "ID verified",
      "verifyId": {
        "title": "Verify your ID",
        "intro": "We use Stripe to check your ID and a selfie. Takes 2 minutes.",
        "stepId": "A photo of your passport or ID card",
        "stepSelfie": "A quick selfie to match it",
        "start": "Start verification",
        "checking": "Checking your ID…",
        "successTitle": "You're verified",
        "successText": "Your profile and Houses now show the ID verified badge.",
        "done": "Done",
        "mockNote": "Demo – nothing is uploaded."
      },
      "months": {
        "flexible": "Flexible"
      },
      "crewLine": {
        "justOpened": "Just opened · {count, plural, one {# spot} other {# spots}}",
        "partial": "{filled} of {total} in",
        "left": "{count, plural, one {# spot left} other {# spots left}}",
        "complete": "Crew complete"
      },
      "rows": {
        "seeAll": "See all"
      }
    }
  },
  "nav": {
    "items": {
      "explore": "Explore",
      "howItWorks": "How it works",
      "houses": "Houses",
      "messages": "Messages",
      "profile": "Profile",
      "host": "Host",
      "yourHouses": "Your houses",
      "saved": "Saved"
    },
    "logIn": "Log in",
    "openHouse": "Open a House",
    "yourProfile": "Your profile",
    "home": "Simpulo – home",
    "menu": {
      "profile": "Profile",
      "logIn": "Log in",
      "signUp": "Sign up",
      "viewProfile": "View profile",
      "saved": "Saved",
      "settings": "Settings",
      "getTheApp": "Get the app",
      "logOut": "Log out",
      "close": "Close menu",
      "people": "Your people",
      "label": "Account menu",
      "help": "Help",
      "idea": "Share an idea",
      "app": "Get the app",
      "admin": "Admin",
      "loggedOut": "Logged out",
      "earnings": "Earnings",
      "darkMode": "Dark mode",
      "adminTheme": { "label": "Appearance", "system": "System", "light": "Light", "dark": "Dark" }
    },
    "itemUnread": "{label}, {count, plural, one {# unread chat} other {# unread chats}}",
    "itemUnreadCount": "{label}, {count} unread",
    "compactLabel": "Main",
    "yourSimpulo": "Your Simpulo",
    "notifications": "Notifications",
    "itemNew": "{label} – {count, plural, one {# new request} other {# new requests}}",
    "openFilters": "Show categories",
    "dragFilters": "Drag or click for filters",
    "closeFilters": "Hide categories",
    "whereNext": "Where to next?",
    "profile": "Your profile",
    "itemTasks": "{label}, {count, plural, one {# to do} other {# to do}}"
  },
  "footer": {
    "label": "Footer",
    "currency": "Currency",
    "links": {
      "howItWorks": "How it works",
      "howSimpuloWorks": "Questions",
      "getTheApp": "Get the app",
      "hostWithCommunity": "Host with your community",
      "contact": "Contact",
      "legal": "Legal",
      "imprint": "Impressum",
      "privacy": "Privacy",
      "terms": "Terms",
      "cookies": "Cookies",
      "cancellation": "Cancellation",
      "hostAHouse": "Host a house",
      "safety": "Safety",
      "guidelines": "Community guidelines",
      "reportContent": "Report content",
      "faq": "FAQ",
      "about": "About",
      "impressum": "Impressum",
      "houses": "Houses",
      "openHouse": "Open a House",
      "proHosts": "Pro hosts"
    },
    "pages": {
      "about": {
        "title": "What is Simpulo?",
        "intro": "Simpulo matches people, not accommodation. Share a place – and find your people.",
        "houses": "A House on Simpulo is a shared place – a villa, an apartment, a chalet – opened by one host for two to six people, from a long weekend to a few months. The host says what the House is about: training, building, creating, slowing down. You ask to join, the host says yes, and the House sorts out the rest together.",
        "people": "No hostel dorms, no strangers you never spoke to. Just people who want the same kind of trip as you.",
        "cta": "Questions & answers →"
      },
      "contact": {
        "title": "Contact",
        "text": "Questions, feedback or a problem with a House? Write to <mail>{email}</mail>."
      }
    },
    "columns": {
      "explore": "Explore",
      "hosting": "Hosting",
      "simpulo": "Simpulo",
      "popular": "Popular"
    },
    "copyright": "© {year} Simpulo",
    "social": {
      "label": "Simpulo on social media",
      "instagram": "Simpulo on Instagram",
      "tiktok": "Simpulo on TikTok",
      "youtube": "Simpulo on YouTube"
    },
    "legalLabel": "Legal",
    "coLivingIn": "Co-living in {city}",
    "vibeHouses": "{vibe} houses",
    "large": {
      "tagline": "Share a place. Find your people.",
      "columns": { "places": "Places", "themes": "Themes", "explore": "Explore", "host": "Host", "simpulo": "Simpulo", "help": "Help" },
      "allPlaces": "All places →",
      "allThemes": "All themes →",
      "links": {
        "shortTrips": "Short Trips",
        "startingSoon": "Starting soon",
        "guides": "Guides",
        "becomeHost": "Become a host",
        "howHosting": "How hosting works",
        "hostFromPlace": "Host from your place",
        "hostFaq": "Host FAQ",
        "about": "About",
        "howItWorks": "How it works",
        "safety": "Safety",
        "guidelines": "Community guidelines",
        "reportContent": "Report content",
        "contact": "Contact",
        "helpCenter": "Help center",
        "getHelp": "Get help",
        "shareIdea": "Share an idea",
        "cancellation": "Cancellation policy"
      },
      "discover": "Discover",
      "places": "Places",
      "themes": "Themes",
      "host": "Host",
      "howHosting": "How hosting works",
      "foundingHosts": "Founding Hosts",
      "hostSafety": "Host safety",
      "waitlist": "Join the waitlist",
      "waitlistLine": "Simpulo opens soon. Be the first to know."
    }
  },
  "legal": {
    "lastUpdated": "Last updated {date}",
    "version": "Version {version}",
    "draft": "Draft – not yet reviewed",
    "draftText": "This text hasn't been reviewed by a lawyer yet. It can still change.",
    "addressFollows": "Address will be added before launch (internal note – the public site goes live only with a real business address).",
    "contents": "On this page",
    "gap": "to fill: {field}",
    "language": "Language",
    "langs": { "en": "English", "de": "Deutsch" }
  },
  "states": {
    "loading": "Loading",
    "notFound": {
      "title": "This page doesn't exist",
      "description": "The link may be broken, or the page was removed.",
      "explore": "Explore",
      "howItWorks": "Questions"
    },
    "error": {
      "title": "Something went wrong",
      "description": "This page didn't load. Try again – or go back to Explore.",
      "retry": "Try again",
      "explore": "Explore",
      "getHelp": "Get help",
      "offlineTitle": "You're offline",
      "offlineDescription": "Check your connection – this page loads again once you're back online.",
      "offlineBanner": "You're offline. Some things won't load until you're back."
    },
    "og": {
      "with": "with {name}",
      "hosted": "Houses hosted {count}"
    }
  },
  "auth": {
    "title": "Continue to Simpulo",
    "mockProviderLogin": "Mock {provider} login – pick a user",
    "continueWithApple": "Continue with Apple",
    "continueWithGoogle": "Continue with Google",
    "continueWithEmail": "Continue with email",
    "legal": "By continuing, you agree to the <terms>Terms</terms> and confirm you're 18 or older. See how we handle your data in our <privacy>Privacy Policy</privacy>.",
    "checkInbox": "Check your inbox – we sent a link to <strong>{email}</strong>",
    "emailPlaceholder": "you@email.com",
    "or": "or",
    "continue": "Continue",
    "emailLabel": "Email address",
    "sendLink": "Send link",
    "mockLoginAs": "Mock login as",
    "logIn": "Log in",
    "dev": {
      "yourHouses": "Your houses",
      "personas": {
        "new": "New",
        "guest": "Guest",
        "host": "Host"
      },
      "label": "Dev",
      "labelShort": "D",
      "mockUser": "User",
      "loggedOut": "Logged out",
      "role": {
        "host": "Host of this House",
        "crew": "House member",
        "pending": "Pending request",
        "none": "Not involved"
      },
      "more": "Dev options for this House",
      "closePanel": "Close dev tools",
      "openPanel": "Open dev tools",
      "openAs": "Open as…",
      "openAsHost": "Open in new tab as {name} (host)",
      "openAsMember": "Open in new tab as {name} (House member)",
      "noCrewMember": "No House member yet",
      "noReminders": "No reminders for this user right now.",
      "fireNow": "Fire now",
      "log": "Log",
      "logEmpty": "Nothing sent yet.",
      "logOpen": "Open link",
      "unlockAccommodation": "Unlock accommodation",
      "resetPayments": "Reset payments",
      "lapse48h": `Let the ${H.payment} hours run out`,
      "overdue": "overdue – would send now",
      "channel": {
        "email": "email",
        "emailPush": "email + push"
      },
      "types": {
        "payDue": "Share due soon",
        "payToday": "Share due today",
        "bookingUpload": "Upload booking",
        "pendingRequests": "Unanswered requests",
        "arrival": "Arrival countdown",
        "savedSoon": "Saved House starts soon",
        "hostOpened": "Host alert: new House",
        "doItAgain": "Want to do it again?"
      },
      "resetMock": "Reset mock data",
      "complete": "Mark as completed (writes the House)",
      "devLabel": "DEV",
      "sectionAccount": "Account",
      "sectionScenario": "Scenario",
      "sectionData": "Data & look",
      "hostType": "Host type",
      "hostType_share": "Share",
      "hostType_pro": "Pro",
      "payouts": "Payouts",
      "payouts_ready": "Ready",
      "payouts_missing": "Missing",
      "payouts_action": "Action needed",
      "houseRole": "House role",
      "houseRole_auto": "Auto",
      "houseRole_visitor": "Visitor",
      "houseRole_member": "Member",
      "houseRole_host": "Host",
      "paymentFails": "Payment fails",
      "installedApp": "Simulate installed app",
      "houseDay": "House day",
      "clock": "Clock",
      "errorPage": "Error page",
      "errorPageOpen": "Trigger an error",
      "simOffline": "Simulate offline",
      "consent": "Agreements",
      "consentVersions": { "current": "Current", "terms": "New Terms", "code": "New guidelines" },
      "consentMine": "My agreements",
      "consentForget": "Forget mine",
      "clockNow": "Now",
      "clockYear": "+1 year",
      "clockValue": "+{hours} h",
      "clockEarlier": "12 hours earlier",
      "clockLater": "12 hours later",
      "houseDayToday": "Today",
      "houseDayValue": "Day {day}",
      "houseDayEarlier": "One day earlier",
      "houseDayLater": "One day later",
      "resetConfirm": "Reset all mock data?",
      "resetYes": "Reset",
      "cancel": "Cancel",
      "remindersCount": "Reminders · {count}",
      "thisHouse": "This House",
      "phase": "Phase",
      "phases": {
        "prelaunch": "Pre-launch",
        "beta": "Beta",
        "live": "Live"
      },
      "adminRole": "Admin role",
      "depthChoice": "Depth choice"
    },
    "welcome": {
      "title": "Welcome back.",
      "subtitle": "Sign in to continue.",
      "passkey": "Use a passkey",
      "notNow": "Not now"
    },
    "reasons": {
      "join": {
        "title": "Your spot is waiting.",
        "subline": "Sign in to ask {hostName} if you can join."
      },
      "open": {
        "title": "Let's open your House.",
        "subline": "Sign in and you're one step from your crew."
      },
      "save": {
        "title": "Keep this one.",
        "subline": "Sign in to save Houses you like."
      },
      "message": {
        "title": "Say hi.",
        "subline": "Sign in to message {hostName}."
      },
      "login": {
        "title": "Find your people.",
        "subline": "Welcome back – or welcome in."
      },
      "signup": {
        "title": "Join Simpulo.",
        "subline": "Share a place. Find your people."
      },
      "yourHouses": {
        "title": "Your Houses live here.",
        "subline": "Sign in to see the Houses you host and join."
      },
      "messages": {
        "title": "Your crew chats live here.",
        "subline": "Sign in to message hosts and your crew."
      },
      "theHost": "the host"
    }
  },
  "onboarding": {
    "title": "Complete your profile",
    "subtitle": "Hosts and their Houses see this first – it takes a minute.",
    "loginTitle": "Log in to set up your profile",
    "photo": "Face photo",
    "photoHint": "A clear photo of your face. It shows on your profile and your Houses.",
    "name": "First name",
    "age": "Age",
    "country": "Country",
    "languages": "Languages",
    "optional": "(optional)",
    "continue": "Continue",
    "errors": {
      "photo": "Add a photo of your face.",
      "name": "Add your first name.",
      "age": "Add your age (18–99).",
      "country": "Add the country you're from.",
      "adult": "Confirm that you're 18 or older."
    },
    "adult": "I'm 18 or older",
    "terms": "By continuing, you agree to the <terms>Terms</terms>. See how we handle your data in our <privacy>Privacy Policy</privacy>.",
    "done": {
      "metaTitle": "You're set",
      "eyebrow": "You're set",
      "title": "Welcome, {name}",
      "progress": "Your profile is {done} of {total}.",
      "complete": "Your profile is complete – hosts see it first.",
      "finish": "Finish it any time in Edit profile →",
      "housesTitle": "Three Houses to start with",
      "explore": "Explore Houses",
      "profile": "See your profile"
    },
    "finishCard": {
      "title": "Finish your profile",
      "text": "{done} of {total} – hosts look at your profile first.",
      "action": "Continue",
      "dismiss": "Dismiss"
    },
    "hostCard": {
      "title": "You're a Founding Host",
      "titleHost": "Ready to host?",
      "text": "Three short steps and your first House is open.",
      "action": "Get started",
      "dismiss": "Dismiss"
    },
    "host": {
      "metaTitle": "Start hosting",
      "eyebrow": "Start hosting",
      "titleFounding": "Welcome, Founding Host",
      "title": "Welcome to hosting",
      "intro": "A few steps, in any order. Only the first House is a must – the rest you can do later.",
      "progress": "{done} of {total} done",
      "checklistTitle": "Your hosting checklist",
      "steps": {
        "welcome": { "title": "You're in", "text": "You're one of the hosts on Simpulo – your profile shows it." },
        "welcomeFounding": { "title": "You're in", "text": "You're one of the first hosts on Simpulo – your profile carries the Founding Host badge." },
        "place": { "title": "Save your place", "text": "Hosting where you live? Save it once and open windows from it. Optional.", "action": "Do it in Open a House", "skip": "Skip" },
        "payouts": { "title": "Set up payouts", "text": "Needed before your first payout – not to open a House. Stripe checks your details.", "action": "Set up payouts", "later": "You can do this later" },
        "house": { "title": "Open your first House", "text": "A theme, a place, a month, your crew size – then share it.", "action": "Open a House" }
      },
      "done": "Done",
      "skipped": "Skipped",
      "allDone": "All set – your checklist is done."
    },
    "pushAsk": {
      "title": "Want to know when {host} replies?",
      "text": "We'll send a notification the moment {host} answers. Email gets there too, either way.",
      "yes": "Turn on notifications",
      "no": "Not now"
    }
  },
  "houseHelp": {
    "hostIntro": "Hi {name}, {title} still has {missing, plural, one {# spot} other {# spots}} open and starts in {days, plural, one {# day} other {# days}}.",
    "hostCompare": "Similar Houses that filled up have:",
    "hostLines": {
      "price": "a price per person around {median} (yours: {value})",
      "photos": "{median} photos (yours: {value})",
      "text": "a fuller description – around {median} characters (yours: {value})",
      "answers": "answers within {median} h (yours: {value} h)"
    },
    "hostNone": "Your House looks a lot like the ones that filled – sometimes it just takes a little longer.",
    "hostOutro": "You'll find these as a short checklist in your Manage tab. Reply here if we can help.",
    "hostOutroNone": "Reply here if we can help.",
    "alternative": "Hi {name}, {title} starts in {days, plural, one {# day} other {# days}} with {in} of {total} in. Two options, only if they suit you: move the dates to {later}{join}. Nothing changes on its own – your guests would have to agree, or they get a full refund. Reply here and we'll help.",
    "alternativeJoin": ", or join {title} ({date}) with your crew",
    "checklist": {
      "title": "Tips from Simpulo",
      "intro": "From Houses like yours that filled up. Tick them off as you go.",
      "items": {
        "price": "Check your price per person against similar Houses",
        "photos": "Add more photos – lead with your brightest one",
        "text": "Say more in your description: the place, a typical day, who you're looking for",
        "answers": "Answer requests within a day"
      }
    }
  },
  "reportContent": {
    "title": "Report content",
    "intro": "Seen something on Simpulo you believe is illegal or breaks our rules? Tell us – you don't need an account.",
    "emergency": "In danger right now? Call the local emergency number first.",
    "what": "What are you reporting?",
    "whatHint": "A link to a House, a profile or anything else on Simpulo.",
    "why": "Why?",
    "whyMissing": "Pick a reason.",
    "reasons": {
      "illegal": "Illegal content",
      "scam": "Scam or fraud",
      "harassment": "Harassment or hate",
      "privacy": "My privacy – my data or photos",
      "ip": "Copyright or trademark",
      "other": "Something else"
    },
    "explain": "Tell us more",
    "explainHint": "What's wrong, and where exactly? Why do you think it's illegal or against the rules?",
    "email": "Your email",
    "emailHint": "We confirm your report and tell you what we decided.",
    "send": "Send report",
    "sentTitle": "Thanks – we got your report",
    "sentText": "We'll look at it and write to {email} once we've decided."
  },
  "notices": {
    "title": "Decisions about you",
    "back": "Back",
    "intro": "When Simpulo acts after a report, you see it here – what we did, why, and which rule. If you disagree, appeal: a person looks at it again.",
    "login": "Log in to see them",
    "none": "Nothing here – Simpulo hasn't made any decision about you.",
    "action": {
      "warned": "A warning",
      "removed": "Removed from {title}",
      "suspended": "Your account is suspended",
      "houseRemoved": "{title} was taken down",
      "photoRemoved": "A photo was removed from {title}"
    },
    "when": "When",
    "why": "Why",
    "rule": "The rule",
    "house": "House",
    "reason": {
      "harassment": "A report of harassment",
      "safety": "A report about safety",
      "scam": "A report of a scam",
      "inappropriate": "A report of inappropriate content",
      "other": "A report",
      "illegal": "A report of illegal content",
      "privacy": "A report about someone's privacy",
      "ip": "A report about copyright or a trademark"
    },
    "rules": {
      "respect": "Respect everyone",
      "safety": "Stay safe",
      "money": "Keep money in Simpulo",
      "privacy": "Respect privacy",
      "conduct": "Terms – Living together",
      "guidelines": "Community guidelines"
    },
    "appealLabel": "Disagree? Appeal",
    "appealHint": "Tell us why you think we got it wrong. A person looks at it again.",
    "appealSend": "Send appeal",
    "appealSent": "Appeal sent on {date} – we'll look at it again and tell you.",
    "upheld": "We looked at your appeal again on {date}. Our decision stays.",
    "reversed": "We looked at your appeal again on {date} and reversed our decision."
  },
  "hostDuties": {
    "title": "Hosting",
    "hostingAs": "Hosting as",
    "private": "Private person",
    "business": "Business",
    "footer": "Do you host as a business? Then your Houses say “Hosted by a business”, and guests see who they book with.",
    "name": "Business name",
    "address": "Business address",
    "register": "Register number",
    "optional": "if you have one",
    "missing": "Add the business name and address.",
    "save": "Save",
    "hostedByBusiness": "Hosted by a business",
    "tax": {
      "title": "Tax details",
      "footer": "Platforms like Simpulo may have to report hosts above a certain amount to tax authorities. Only Simpulo's team sees these details.",
      "why": "You've had {count, plural, one {# paid booking} other {# paid bookings}} this year – please add your tax details.",
      "taxId": "Tax ID",
      "address": "Your address",
      "send": "Send",
      "sent": "Sent on {date}",
      "onlyTeam": "Only Simpulo's team sees them.",
      "update": "Update"
    }
  },
  "program": {
    "title": "Programme",
    "intro": `Your plan for each day – your crew sees it in full ${PROGRAM_FULL_DAYS_BEFORE} days before the House, a preview on the House page until then.`,
    "day": "Day {day}",
    "dayDate": "Day {day} · {date}",
    "daysLabel": "Days",
    "empty": "Nothing planned for this day yet.",
    "add": "Add to this day",
    "time": "Time",
    "itemTitle": "What",
    "place": "Where",
    "text": "A few words",
    "optional": "optional",
    "save": "Add",
    "remove": "Remove",
    "moveUp": "Move up",
    "moveDown": "Move down",
    "drag": "Drag to sort",
    "template": "Use the {theme} template",
    "templateGeneric": "Use a template",
    "copyAll": "Copy this day to every day",
    "copied": "Copied to every day",
    "moment": "Arc moment",
    "momentNone": "—",
    "moments": { "kickoff": "Kick-off", "peak": "High point", "closing": "Closing" },
    "momentsHint": "Mark your own kick-off, high point and closing – Simpulo then sends no card of its own for them.",
    "momentBadge": "{moment}",
    "proOnly": "The programme is for hosts who lead their House (with a host fee).",
    "planTitle": "Programme",
    "planPreview": `The full programme with times and places shows ${PROGRAM_FULL_DAYS_BEFORE} days before the House.`,
    "planEmpty": "{host} hasn't shared a programme yet.",
    "whatsPlanned": "What's planned",
    "whatsPlannedMore": `The full programme comes ${PROGRAM_FULL_DAYS_BEFORE} days before the House.`,
    "crewProgress": "Crew progress",
    "feedbackTitle": "Your programme, from the crew",
    "feedbackAverage": "Programme · {average} of 5 · {count, plural, one {# rating} other {# ratings}}",
    "feedbackWait": "The average shows from {min} ratings – so nobody's own answer can be told.",
    "feedbackNotes": "What they said about it",
    "feedbackNone": "No sentences yet.",
    "rateQ": "How was the programme?",
    "rateNote": "One thing about the programme for {host}",
    "rateHint": "Only {host} sees it, without your name.",
    "templates": {
      "morningTraining": { "title": "Morning training", "text": "Strength or conditioning, all levels." },
      "lunch": { "title": "Lunch together", "text": "" },
      "mobility": { "title": "Mobility & stretch", "text": "" },
      "focus": { "title": "Focus block", "text": "Phones away, deep work." },
      "standup": { "title": "Lunch & stand-up", "text": "What you did, what's next, where you're stuck." },
      "focus2": { "title": "Focus block", "text": "" },
      "demo": { "title": "Demo evening", "text": "Show what you built today." },
      "surf": { "title": "Surf session", "text": "" },
      "breakfast": { "title": "Breakfast together", "text": "" },
      "surf2": { "title": "Second session", "text": "" },
      "deepWork": { "title": "Deep work", "text": "" },
      "walk": { "title": "Walk", "text": "" },
      "shoot": { "title": "Shoot", "text": "" },
      "edit": { "title": "Edit", "text": "" },
      "screening": { "title": "Screening", "text": "Watch what everyone made." },
      "yoga": { "title": "Yoga", "text": "" },
      "breathwork": { "title": "Breathwork", "text": "" },
      "together": { "title": "Something together", "text": "" },
      "dinner": { "title": "Dinner together", "text": "" }
    }
  },
  "hostKit": {
    "title": "Host kit",
    "intro": "Ready to post: words and pictures for your House, filled in for you. Every link counts who it brought.",
    "pick": "House",
    "copied": "Copied",
    "downloaded": "Saved",
    "downloadFailed": "Couldn't save it – try again.",
    "story": {
      "title": "Story",
      "hint": "The story image with a QR code, and a caption to go with it.",
      "copy": "Copy caption",
      "download": "Download image",
      "caption": "I'm hosting {title} – {place}, {dates}. {spots, plural, =0 {The crew is complete} one {# spot left} other {# spots left}}. Come along: {url}"
    },
    "bio": {
      "title": "Bio link",
      "hint": "For your bio or link page – and its QR code for print.",
      "copy": "Copy link",
      "download": "Download QR code"
    },
    "post": {
      "title": "Community post",
      "hint": "For a group, a newsletter or a forum – with the House's card as the picture.",
      "copy": "Copy text",
      "download": "Download picture",
      "text": "{title}\n{place} · {dates}\n\n{note}\n\n{spots, plural, =0 {The crew is complete – follow along for the next one.} one {# spot left. Request to join:} other {# spots left. Request to join:}} {url}"
    }
  },
  "hostReferral": {
    "title": "Hosts you brought",
    "terms": "Bring another host with your link. Once their first guest has paid, you get {percent} % of Simpulo's fees on their Houses for {months} months – for the hosts you bring yourself, not the ones they bring.",
    "termsOpen": "Bring another host with your link. What you get is being decided – it starts only once their first guest has paid, and counts only for the hosts you bring yourself.",
    "copy": "Copy your link",
    "copied": "Copied",
    "none": "Nobody yet – share your link with someone who'd host well.",
    "status": {
      "accepted": "Accepted – no House yet",
      "hosting": "Hosting – no paid stay yet",
      "paidStay": "First paid stay {date}"
    }
  },
  "founding": {
    "label": "Founding Host",
    "tooltip": "One of the first {count} hosts on Simpulo"
  },
  "video": {
    "play": "Play video: {title}",
    "loadsFrom": "Plays from {host} – loads only when you tap"
  },
  "consent": {
    "terms": {
      "firstTitle": "Agree to the Terms",
      "firstText": "Before you go on: the Terms say how Simpulo works – requests, paying, cancelling, living together.",
      "updatedTitle": "We've updated our Terms",
      "updatedText": "Version {version} – what changed:",
      "read": "Read the Terms",
      "privacy": "See how we handle your data in our <privacy>Privacy Policy</privacy>.",
      "adult": "I'm 18 or older",
      "agree": "I agree",
      "later": "Not now",
      "summary": {
        "requests": "Requests run out after {hours} hours without an answer.",
        "money": "Paying, the service fee and the host fee are explained in one place.",
        "guidelines": "Everyone follows the Community guidelines.",
        "account": "You can pause your account instead of deleting it."
      }
    },
    "code": {
      "guestTitle": "Before your first request",
      "hostTitle": "Before you open your first House",
      "updatedTitle": "We've updated our Community guidelines",
      "guestText": "A House works when everyone feels at home. In short:",
      "hostText": "As a host you set the tone. Everything guests agree to, and a little more:",
      "updatedText": "Version {version} – please read them once more:",
      "hostsToo": "As a host, also:",
      "read": "Read the full guidelines",
      "agree": "I agree",
      "points": {
        "respect": "Respect everyone – in the House and in chats.",
        "noMeansNo": "No means no.",
        "harassment": "Harassment means you leave the House.",
        "place": "Look after the place like it's your own.",
        "report": "Something wrong? Report it in one tap.",
        "honest": "Describe your House honestly.",
        "book": "Book the place once everyone paid – and confirm it within {hours} hours.",
        "answer": "Answer every request, yes or no.",
        "allowed": "Hosting where you live: make sure you're allowed to have guests."
      }
    },
    "settings": {
      "title": "Agreements",
      "terms": "Terms",
      "age": "18 or older",
      "guestCode": "Community guidelines",
      "hostCode": "Community guidelines for hosts",
      "agreed": "Version {version} · {date}",
      "confirmed": "Confirmed {date}",
      "never": "Not yet",
      "history": "Earlier",
      "historyRow": "{doc} · version {version} · {date}"
    }
  },
  "explore": {
    "title": "Open Houses",
    "allEyebrow": "All houses",
    "summary": "{houses} · {countries}",
    "startDate": "Start date",
    "sort": "Sort",
    "startFilters": {
      "any": "Any date",
      "14d": "Next 2 weeks",
      "30d": "This month",
      "90d": "Next 3 months"
    },
    "sortOptions": {
      "soonest": "Soonest first",
      "price": "Lowest price",
      "newest": "Just opened"
    },
    "anywhere": "Anywhere",
    "anyLanguage": "Any language",
    "country": "Country",
    "language": "Language",
    "searchCountries": "Search countries",
    "searchLanguages": "Search languages",
    "noMatches": "No matches",
    "filterByVibe": "Filter by vibe",
    "filters": "Filters",
    "filtersActive": "Filters (active)",
    "apply": "Apply",
    "featuredHouses": "Featured Houses",
    "featuredHousesKeyboard": "Featured Houses – use the arrow keys to browse",
    "next": "Next",
    "slideLabel": "{index} of {count}: {title}",
    "houseWithHost": "{title} with {host}",
    "viewHouseWithHost": "View House: {title} with {host}",
    "showHostPhoto": "Show photo {index} of {name}",
    "withHost": "with {name}",
    "viewHouse": "View House",
    "untitledHouse": "Untitled House",
    "howItWorksLink": "Questions",
    "cards": {
      "hostedBy": "Hosted by {name}",
      "photoAlt": "{title} – photo {number}",
      "prevPhoto": "Previous",
      "nextPhoto": "Next",
      "showPhoto": "Photo {number} of {count}",
      "invited": "You're invited",
      "highlight": {
        "lastSpot": "Last spot",
        "startsIn": "{days, plural, =0 {Starts today} =1 {Starts tomorrow} other {Starts in # days}}",
        "justOpened": "Just opened"
      }
    },
    "collections": {
      "scrollBack": "Previous",
      "scrollOn": "Next",
      "startingSoon": {
        "title": "Starting soon",
        "subline": "Within 30 days, with a spot still open.",
        "eyebrow": "Soon"
      },
      "lastSpot": {
        "title": "Last spot",
        "subline": "One place left in each of these.",
        "eyebrow": "Almost full"
      },
      "justOpened": {
        "title": "Just opened",
        "subline": "New this week. Be the first one in.",
        "eyebrow": "New"
      },
      "shortTrips": {
        "title": "Short Trips",
        "subline": "Five nights or fewer – easy to fit in.",
        "eyebrow": "Weekends"
      },
      "party": {
        "title": "Party houses",
        "subline": "Big nights, a shared villa and a House to go out with.",
        "eyebrow": "Nightlife"
      },
      "trainTogether": {
        "title": "Train together",
        "subline": "Sessions every morning with people who show up.",
        "eyebrow": "Fitness"
      },
      "buildTogether": {
        "title": "Build with others",
        "subline": "Deep work by day, people who ship.",
        "eyebrow": "Founders"
      },
      "meetSomeone": {
        "title": "Meet someone",
        "subline": "New people, real dinners, no apps.",
        "eyebrow": "Social"
      },
      "seeAll": "See all",
      "seeAllLabel": "See all {title}"
    },
    "noResults": {
      "title": "No Houses match these filters",
      "text": "Try another vibe, place or date – or clear the filters.",
      "clear": "Clear filters"
    },
    "filterByCollection": "Filter by collection",
    "filtersUi": {
      "clearAll": "Clear all",
      "allFilters": "All filters",
      "whereWhen": "Where · When",
      "whereWhenRow": "Where & when",
      "moreRow": "More",
      "moreCount": "+ {count} more",
      "searchPlaceholder": "Search",
      "searchIn": "Search {label}",
      "noMatch": "Nothing found",
      "verifiedChip": "Verified hosts",
      "languagesCount": "{count, plural, one {# language} other {# languages}}",
      "sectionActive": "Filter set",
      "clear": "Clear",
      "clearSection": "Clear {section}",
      "hostExperience": "Host experience",
      "hostExperienceOptions": {
        "included": "Included",
        "none": "Not included"
      },
      "verifiedOnly": "Verified hosts only",
      "shortTrips": "Short Trips",
      "noMatches": "No matches",
      "month": "Month",
      "budget": "Budget",
      "perPerson": "per person, ≈ EUR",
      "budgetMin": "Minimum budget",
      "budgetMax": "Maximum budget",
      "filtersCount": "Filters, {count} active",
      "show": "Show <num>{count}</num> {count, plural, one {house} other {houses}}",
      "noneMatch": "No houses – adjust filters",
      "noBudget": "No prices yet",
      "noOptions": "Nothing to choose yet",
      "when": "When",
      "length": "Length",
      "lengthOptions": {
        "any": "Any",
        "weekend": "≤5 nights",
        "weeks": "1–2 weeks",
        "long": "3+ weeks"
      },
      "price": "Price per person",
      "priceMin": "Lowest price per person",
      "priceMax": "Highest price per person",
      "min": "Min",
      "max": "Max",
      "spots": "Spots left",
      "spotsOptions": {
        "any": "Any",
        "atLeast": "{count}+"
      },
      "category": "Category",
      "where": "Where",
      "any": "Any",
      "remove": "Remove {label}",
      "moreActive": "+{count}",
      "crewSize": "Crew size",
      "who": "Who",
      "whoOptions": {
        "mixed": "Mixed",
        "women": "Women only"
      },
      "age": "Crew age",
      "ageOptions": {
        "18-25": "18–25",
        "25-35": "25–35",
        "35+": "35+"
      },
      "accommodation": "Accommodation",
      "accommodationOptions": {
        "booked": "Booked",
        "together": "Decided together"
      },
      "depth": "Depth",
      "depthOptions": {
        "easy": "Easy",
        "balanced": "Balanced",
        "deep": "Deep"
      }
    },
    "more": "More",
    "all": "All",
    "spotlightShow": "Show {title}",
    "prelaunch": {
      "eyebrow": "Opening May 2027",
      "title": "Share a place. Find your people.",
      "text": "The first Houses open in May. Where do you want to go?"
    },
    "spotlightIntro": {
      "first": "Share a place.",
      "second": "Find your people.",
      "subline": "Open a House or join one – and live with people who get you.",
      "visitorSub": "Live together for a while with people who share your thing.",
      "visitorNote": "Free to ask. Pay only after the host says yes."
    },
    "spotlightGreeting": {
      "findYourPeople": "Find your people",
      "whereNextName": "Where to next, {name}?",
      "hi": "Hi {name}.",
      "whereNext": "Where to next?",
      "open": "{count, plural, one {# house open} other {# houses open}} →",
      "seeHouses": "See houses →"
    },
    "search": {
      "where": "Where?",
      "when": "When?",
      "whereNext": "Where to next?",
      "anyTime": "Any time",
      "pillLabel": "Search: {value}",
      "filtersButton": "Filters",
      "filtersButtonCount": "Filters, {count} active",
      "wherePlaceholder": "City, region or country",
      "anywhere": "Anywhere",
      "anyMonth": "Any month",
      "noPlace": "No place found.",
      "kindCountry": "Country",
      "kindRegion": "Region",
      "titlePlaceMonth": "No House in {place} in {month} yet.",
      "titlePlace": "No House in {place} yet.",
      "titleMonth": "No House in {month} yet.",
      "titleNone": "No House here yet.",
      "openFirst": "Open this House",
      "notifyMe": "Save this search",
      "clearFilters": "Clear filters",
      "openHere": "Open a House here",
      "openHereIn": "Be the first in {place}",
      "openHereText": "Start the one you're looking for",
      "nearbyEyebrow": "Nearby",
      "nearbyTitle": "Nearby",
      "nearbySubline": "A similar place or time",
      "saved": `Done. You'll be the first to know – ${H.searchHeadStart}h before everyone else.`,
      "nearby": "Houses nearby or in other months",
      "notQuite": "Not quite it? Notify me about new Houses in {place} →",
      "notifySheet": {
        "title": "Notify me",
        "text": `We'll email you the moment a House opens – ${H.searchHeadStart}h before everyone else.`,
        "email": "Email",
        "emailPlaceholder": "you@example.com",
        "emailError": "Enter a valid email address.",
        "consent": "Email me when a House opens",
        "consentError": "Tick this so we may email you.",
        "privacy": "Privacy",
        "submit": "Notify me",
        "loginInstead": "Log in instead",
        "login": "Log in to hear first when a House opens."
      },
      "hint": {
        "placeMonth": "{count, plural, one {# person} other {# people}} searched for {place} in {month} – they'll be notified first",
        "place": "{count, plural, one {# person} other {# people}} searched for {place} – they'll be notified first"
      },
      "searchShort": "Search",
      "whereShort": "Where",
      "whenShort": "When"
    },
    "barThemes": {
      "themes": "Themes",
      "moreThemes": "More themes",
      "menuLabel": "All themes"
    },
    "themeLines": {
      "member": {
        "fitness": "Train with people who show up.",
        "surf-water": "Waves before breakfast.",
        "remote-work": "Deep work, good people.",
        "founder": "Build it with people who get it.",
        "creator": "Make things together.",
        "wellness": "Slow mornings, real rest.",
        "adventure": "Out there, together.",
        "culture": "See it with people who care.",
        "party": "Big nights, one villa.",
        "holiday": "Time off, in good company.",
        "social": "Come for the place, stay for the people.",
        "students": "Study less alone."
      },
      "visitor": {
        "fitness": "Train together. Split the villa.",
        "surf-water": "Four strangers, one villa, one swell.",
        "remote-work": "Work mornings. Sunsets with your crew.",
        "founder": "Build all day. Dinner with people who get it.",
        "creator": "Shoot by day. Edit together at night.",
        "wellness": "Slow mornings, one kitchen, real rest.",
        "adventure": "Strangers at the start, friends at the top.",
        "culture": "A new city, seen with new friends.",
        "party": "One villa, one crew, big nights.",
        "holiday": "Time off with people worth meeting.",
        "social": "Come for the place, stay for the people.",
        "students": "Same city, same semester, one House."
      },
      "fallback": "{count, plural, one {# house open right now.} other {# houses open right now.}}"
    }
  },
  "house": {
    "arc": {
      "sender": "Simpulo",
      "label": "Arc",
      "phases": { "before": "Before", "arrival": "Arrival", "together": "Together", "goodbye": "Goodbye", "after": "After" },
      "next": "Next: {title} · {date}",
      "allDone": "Nothing more planned – enjoy the House.",
      "done": "Done · {done} of {of}",
      "doneMine": "Done",
      "skipped": "Skipped",
      "skip": "Skip",
      "markDone": "Mark as done",
      "undo": "Undo",
      "notePlaceholder": "Write a line…",
      "save": "Save",
      "visibility": {
        "spoken": "Spoken – nothing is saved",
        "private": "Only you see this",
        "crew": "Your crew sees this",
        "public": "Public only with your OK"
      },
      "mute": "Mute Simpulo tips",
      "muteHint": "No Simpulo cards in your House chats. The Arc in Plan stays.",
      "steps": {
        "welcome": { "title": "Meet your crew", "text": "You're in. Say hi and see who you'll live with.", "action": "See your crew" },
        "intention": { "title": "Your intention", "text": "One question for the start – and two if you like. Your crew sees it.", "action": "Write your intention" },
        "gettingThere": { "title": "Getting there", "text": "Add how and when you arrive – and see when the others land.", "action": "Add your arrival" },
        "hostCheckIn": { "title": "Check-in info", "text": "Your crew arrives in five days. Share check-in and what to bring.", "action": "Fill it in" },
        "practical": { "title": "Practical", "text": "The exact address, check-in and what to bring are in the plan now.", "action": "See the practical" },
        "arrive": { "title": "You're here?", "text": "Tap when you've arrived – your crew sees who's in.", "action": "I'm here" },
        "firstNight": { "title": "First night", "text": "Tonight: dinner and a few questions to get to know each other. Ask out loud – nothing is saved.", "action": "Open the cards" },
        "agreement": { "title": "Your House agreement", "text": `Three quick votes. One answer is preset – after ${AGREEMENT_HOURS} hours the result stands.`, "action": "Vote" },
        "moment": { "title": "Tomorrow?", "text": "A small idea for tomorrow – are you in?", "action": "Vote" },
        "halftime": { "title": "Halftime", "text": "Half the House is behind you. A private check-in – only you see it.", "action": "Check in" },
        "peakPlan": { "title": "Your highlight", "text": "Set the one thing your crew does together in the second half – or leave it to a vote.", "action": "Set the highlight" },
        "peakVote": { "title": "The highlight", "text": "One thing to do together before the end – are you in?", "action": "Vote" },
        "closing": { "title": "Closing circle", "text": "Last evening: three questions, asked out loud. Nothing is saved.", "action": "Open the cards" },
        "again": { "title": "The day after", "text": "Who you'd live with again, how it went, one tip for the next crew. Only you see your answers.", "action": "Answer" },
        "albumReady": { "title": "Your album is ready", "text": "Everything your crew added – only you and your crew see it.", "action": "See the album" },
        "chosen": { "title": "Chosen each other", "text": "Someone you'd live with again chose you too.", "action": "See who" },
        "doItAgain": { "title": "Do it again?", "text": "You chose each other with someone from your crew. The next House could be yours.", "action": "Open the next one together" },
        "thirtyDays": { "title": "30 days later", "text": "What do you still do since the House – and are you still in touch? Only you see it.", "action": "Answer" },
        "anniversary": { "title": "One year since {title}", "text": "A year ago today you left this House. Look back at the album – or do it again.", "action": "Open the album", "doItAgain": "Do it again" }
      }
    },
    "middle": {
      "proposal": "{activity} tomorrow at {time}?",
      "in": "I'm in",
      "out": "Not this time",
      "count": "{count, plural, =0 {No one in yet} one {# in} other {# in}}",
      "agreed": "Agreed together",
      "agreedNone": "Nothing agreed yet – the daily ideas show up in the chat.",
      "halftimeTitle": "Halftime",
      "halftimeScore": "How close are you to your intention?",
      "halftimeScale": "1 = far · 5 = there",
      "halftimeHelp": "What would help you in the second half?",
      "halftimeOptional": "Optional",
      "halftimePrivate": "Only you see this. Your host sees only the average of everyone's number, never yours.",
      "halftimeSave": "Save",
      "halftimeSaved": "Saved",
      "halftimeEdit": "Change",
      "halftimeYours": "Your halftime: {score} of 5",
      "halftimeAverage": "Halftime: {average} of 5 on average · {count, plural, one {# answer} other {# answers}}",
      "halftimeAverageWait": "The crew's average shows once {min} have answered.",
      "halftimeAnon": "Anonymous – no one's own number is shown.",
      "peakTitle": "Highlight",
      "peakHost": "{host} set the highlight",
      "peakProposal": "{activity}?",
      "peakSetTitle": "Your highlight",
      "peakSetHint": "Set it yourself and the crew won't get a proposal.",
      "peakText": "What",
      "peakDate": "When",
      "peakSave": "Set the highlight",
      "peakSaved": "Highlight set",
      "peakNone": "The highlight comes in the second half."
    },
    "dayMoments": {
      "breakfast": "Breakfast together",
      "cookTogether": "Cook dinner together",
      "sunset": "Sunset at the best spot nearby",
      "market": "The local market",
      "morningSession": "A morning session together",
      "recoveryWalk": "A slow recovery walk",
      "dawnPatrol": "Dawn patrol",
      "sunsetSwim": "A sunset swim",
      "focusBlock": "A shared focus block",
      "demoHour": "Show what you worked on",
      "pitchPractice": "Pitch practice",
      "walkingOneOnOnes": "Walking one-on-ones",
      "shootWalk": "A photo walk",
      "feedbackRound": "A feedback round on your work",
      "morningYoga": "Morning yoga",
      "phoneFreeDinner": "A phone-free dinner",
      "earlyHike": "An early hike",
      "mapNight": "Plan the next trip over a map",
      "museumMorning": "A museum morning",
      "localDinner": "Dinner where the locals eat",
      "lateBrunch": "A late brunch",
      "preDrinks": "Drinks at home before going out",
      "beachDay": "A beach day",
      "boardGames": "Board games",
      "potluck": "A potluck dinner",
      "gameNight": "Game night",
      "studySession": "A study session together",
      "cheapEats": "The best cheap eats in town"
    },
    "peakIdeas": {
      "dayTrip": "A day trip together",
      "bigDinner": "One big dinner out",
      "miniRace": "A mini race – everyone at their own pace",
      "boatTrip": "A boat trip",
      "offlineDay": "A whole day offline together",
      "demoDay": "A demo day for each other",
      "showcase": "A showcase of what you made",
      "retreatDay": "A full retreat day",
      "summit": "A summit together",
      "hostedNight": "A night out to a show",
      "houseParty": "A house party",
      "islandDay": "An island day",
      "longTable": "A long-table dinner with neighbours",
      "cityQuest": "A city quest"
    },
    "arrival": {
      "title": "Arrived",
      "here": "I'm here",
      "youreHere": "You're here",
      "undo": "Not yet",
      "count": "{here} of {total} here",
      "none": "No one has arrived yet.",
      "hereAt": "Here since {time}",
      "notYet": "Not here yet"
    },
    "firstNight": {
      "title": "First night",
      "start": "Start first night",
      "open": "Open the cards",
      "started": "Started {time}",
      "hint": "Ask out loud. Nothing here is saved.",
      "close": "Close",
      "next": "Next question",
      "previous": "Previous question",
      "counter": "{n} of {total}",
      "levels": { "light": "Light", "deeper": "Deeper", "personal": "Personal" },
      "again": "Question cards",
      "againHint": "The first night's questions – for any evening."
    },
    "questions": {
      "light": {
        "realReason": "What brought you here – the real reason?",
        "secretlyGood": "What are you secretly good at?",
        "bestThisYear": "Best thing that happened to you this year?"
      },
      "deeper": {
        "inTheMiddle": "What are you in the middle of right now in your life?",
        "tryHere": "What would you try here if nobody knew your old self?",
        "missNow": "Who do you miss right now?"
      },
      "personal": {
        "proudUnseen": "What are you proud of that nobody sees?",
        "hopeCrew": "What do you hope this crew gives you?",
        "figuringOut": "What's something you're still figuring out?"
      },
      "closing": {
        "fiveYears": "Which moment from this House will you still tell people about in five years?",
        "takingHome": "What are you taking home?",
        "changedSomething": "Who here changed something for you – and what?"
      }
    },
    "afterwards": {
      "againText": "You and {names} chose each other. Open the next House together?",
      "openTogether": "Open the next one together",
      "nextHouses": "Or join one like it",
      "moreLike": "More Houses like this",
      "stillQ": "What's one thing you still do since the House?",
      "inTouchQ": "Are you still in touch with someone from your crew?",
      "yes": "Yes",
      "no": "No",
      "privateHint": "Only you see your answers.",
      "shareStory": "Share as a story",
      "preview": "Preview – how it shows on {host}'s House pages",
      "storyShared": "Shared as a story on {host}'s House pages. Change it any time.",
      "save": "Save",
      "saved": "Saved",
      "edit": "Change",
      "pastTitle": "From past crews",
      "pastSub": "What crews said about {host}'s Houses – averages only, never one person.",
      "ratingsCount": "{count, plural, one {# rating} other {# ratings}}",
      "ratingsWait": "Ratings show once {min} people have rated.",
      "tipsTitle": "Tips from past crews",
      "tipFrom": "{house} · {month}",
      "storiesTitle": "Stories",
      "line": "From past crews",
      "lineRated": "Past crews: {overall} overall · {count, plural, one {# rating} other {# ratings}}",
      "lineInline": "★ {overall} ({count, plural, one {# rating} other {# ratings}} →)",
      "hostTitle": "Your ratings",
      "thirtyTitle": "30 days later",
      "againTitle": "Do it again"
    },
    "album": {
      "title": "Album",
      "empty": "No photos yet",
      "emptyText": "Photos and short clips from your time together. Only your crew sees them.",
      "addFirst": "Add the first photos",
      "add": "Add photos",
      "open": "Open – added by {name}",
      "addedBy": "Added by {name}",
      "close": "Close",
      "next": "Next",
      "previous": "Previous",
      "counter": "{n} of {total}",
      "crewOnly": "Only your crew sees the album.",
      "remove": "Remove",
      "removeMe": "Remove me",
      "report": "Report",
      "removeHint": "In this photo? Remove it – no reason needed.",
      "removedOwn": "Removed from the album",
      "removedMe": "Removed – no one is told why",
      "addTitle": "Add to the album",
      "addSubtitle": "Only your crew sees them.",
      "choose": "Choose photos or clips",
      "chooseHint": "Clips up to {seconds} seconds.",
      "chooseMore": "Choose more",
      "unpick": "Leave this one out",
      "location": "Location data (GPS) is removed before anything is uploaded.",
      "consentCrew": "Everyone in this photo is okay with the crew seeing it",
      "consentSimpulo": "Simpulo may use this for Simpulo's own posts",
      "required": "Required",
      "optional": "Optional",
      "removeInfo": "Anyone in a photo can remove it from the album with one tap.",
      "upload": "{count, plural, =0 {Add} one {Add # photo} other {Add #}}",
      "uploading": "Adding…",
      "added": "{count, plural, one {Added to the album} other {# added to the album}}",
      "failed": "{count, plural, one {One file couldn't be read – try another photo.} other {# files couldn't be read – try other photos.}}",
      "clipTooBig": "Clips up to {mb} MB.",
      "clipTooLong": "Clips up to {seconds} seconds.",
      "ask": "Add {count} photos to the album",
      "readyTitle": "Your album",
      "see": "{count, plural, one {See the album · # photo} other {See the album · # photos}}"
    },
    "goodbye": {
      "closingTitle": "Closing circle",
      "closingHint": "Ask out loud. Nothing here is saved.",
      "closingOpen": "Open the cards",
      "closingLead": "I'll lead it myself",
      "closingLeadHint": "Your crew gets no card for it – you lead the circle.",
      "closingLedBy": "{host} leads the closing circle.",
      "wordsTitle": "Leave a few words for the crew",
      "wordsHint": "Optional. Only your crew sees it, in Moments.",
      "wordsSave": "Save",
      "wordsSaved": "Saved for the crew",
      "wordsEdit": "Change",
      "wordsRemove": "Remove",
      "wordsMoments": "Words for the crew",
      "wordsNone": "No words yet – they come after the closing circle.",
      "afterTitle": "The day after",
      "againQ": "Who would you live with again?",
      "againHint": "Only you see your choice. If someone chose you too, you'll both find out – a one-sided choice is never shown.",
      "intentionQ": "Did you reach your intention?",
      "intention": { "yes": "Yes", "partly": "Partly", "no": "No" },
      "privateHint": "Only you see this.",
      "rateTitle": "Rate the House",
      "ratings": { "overall": "Overall", "mood": "Mood in the crew", "tidiness": "Tidiness", "noise": "Noise" },
      "ratingScale": "1 = poor · 5 = great",
      "noteQ": "One sentence for {host}",
      "noteHint": "Only {host} sees it – never public without your consent.",
      "tipQ": "One tip for the next crew in this House",
      "tipPublic": "Show this tip publicly",
      "tipHint": "Without the tick it stays private.",
      "ideaQ": "One idea for your next House",
      "ideaHint": "Private – it helps us suggest Houses that fit you.",
      "optional": "Optional",
      "save": "Save",
      "saved": "Saved",
      "edit": "Change",
      "savedTitle": "Your answers are saved",
      "savedAgain": "{count, plural, =0 {You didn't choose anyone.} one {You chose # person – only you see this.} other {You chose # people – only you see this.}}",
      "chosenHeading": "Chosen each other",
      "chosenTitle": "You and {names} chose each other",
      "chosenText": "You're each other's people now.",
      "chosenPeople": "See your people",
      "hostTitle": "What your crew said",
      "hostAverage": "{label}: {average} of 5",
      "hostWait": "The averages show once {min} have answered.",
      "hostNotes": "Notes for you",
      "hostNotesNone": "No notes yet.",
      "hostAnon": "Anonymous – no names, never public."
    },
    "agreement": {
      "title": "House agreement",
      "questions": {
        "quiet": "Quiet after …?",
        "cooking": "Cooking: together every day, sometimes, or on our own?",
        "friends": "Friends over: fine, ask first, or no?"
      },
      "options": {
        "quiet": { "22": "22:00", "23": "23:00", "24": "Midnight" },
        "cooking": { "together": "Together every day", "sometimes": "Sometimes", "own": "On our own" },
        "friends": { "fine": "Fine", "ask": "Ask first", "no": "No" }
      },
      "preset": "Preset",
      "votes": "{count, plural, one {# vote} other {# votes}}",
      "closes": "Open until {date}",
      "closed": "Agreed",
      "confirmed": "Confirmed by {host}",
      "visibility": "Your crew sees this. If you don't vote, the preset counts."
    },
    "before": {
      "intention": {
        "title": "Your intention",
        "main": "When you leave this House, what do you want to be true that isn't true today?",
        "teach": "What could you teach someone here in one evening?",
        "askMe": "What do you want people to ask you about?",
        "optional": "Optional",
        "visibility": "Your crew sees this. Never public, never analysed.",
        "save": "Save",
        "edit": "Edit",
        "saved": "Saved",
        "notWritten": "Not written yet",
        "afterPay": "Your intention opens once your share is paid."
      },
      "crew": {
        "intention": "Intention",
        "teach": "Could teach",
        "askMe": "Ask me about",
        "sayHi": "Say hi",
        "hiDraft": "Hi, I'm {name} – "
      },
      "arrival": {
        "title": "Getting there",
        "yours": "Your arrival",
        "date": "Date",
        "time": "Time",
        "mode": "How",
        "place": "Where",
        "placeHint": "Airport, station or “by car”",
        "modes": { "plane": "Plane", "train": "Train", "bus": "Bus", "car": "Car", "ferry": "Ferry", "other": "Other" },
        "save": "Save arrival",
        "edit": "Change",
        "remove": "Remove",
        "who": "Who arrives when",
        "none": "No one has added their arrival yet.",
        "notYet": "Not added yet",
        "noBooking": "Simpulo doesn't book travel – this is just so you can meet up.",
        "ride": "{name} {verb} {minutes} min {when} you – share a ride?",
        "lands": "lands",
        "arrives": "arrives",
        "after": "after",
        "before": "before",
        "same": "{name} {verb} at the same time as you – share a ride?"
      },
      "practical": {
        "title": "Practical",
        "address": "Exact address",
        "addressLater": "Shows here {days, plural, one {# day} other {# days}} before you arrive.",
        "addressAfterPay": "Shows here once you've paid, {days, plural, one {# day} other {# days}} before you arrive.",
        "checkIn": "Check-in",
        "rules": "House rules",
        "bring": "What to bring",
        "programme": "Daily programme",
        "notShared": "Not shared yet – {host} adds it before you arrive.",
        "noRules": "No House rules yet."
      },
      "tasks": {
        "title": "Host tasks",
        "progress": "{done} of {total} done",
        "due": "Due {date}",
        "done": "Done",
        "later": "Later",
        "active": "Now",
        "items": {
          "checkIn": { "title": "Check-in info", "text": "How to get in, when, and what your crew should bring." },
          "programme": { "title": "Daily programme", "text": "What happens each day of your programme." },
          "welcome": { "title": "Welcome message", "text": "A short hello in the crew chat when people arrive." },
          "agreement": { "title": "Confirm the House agreement", "text": "Once the votes are in, confirm what your House agreed on." }
        },
        "optional": "Optional",
        "skip": "Skip",
        "skipped": "Skipped",
        "welcomeTemplate": "Welcome to {title}, everyone! I'm so glad you're here. Make yourselves at home – tonight we have dinner together and play a little question game. Shout if you need anything.",
        "welcomeSend": "Send to the crew chat",
        "welcomeSent": "Sent to the crew chat",
        "agreementOpen": "Votes close {date}.",
        "agreementConfirm": "Confirm the agreement",
        "agreementConfirmed": "Confirmed",
        "checkInField": "Check-in",
        "checkInPlaceholder": "Key box code after 15:00, the door on the left…",
        "bringField": "What to bring",
        "bringPlaceholder": "Towels, a headlamp, your own yoga mat…",
        "programmeField": "Daily programme",
        "programmePlaceholder": "07:00 training, 09:00 breakfast…",
        "save": "Save",
        "saved": "Saved"
      }
    },
    "area": {
      "tabsLabel": "Your House",
      "tabs": { "chat": "Chat", "crew": "Crew", "plan": "Plan", "moments": "Moments", "me": "Me", "manage": "Manage" },
      "phase": {
        "starts": "{days, plural, =0 {Starts today} one {Starts tomorrow} other {Starts in # days}}",
        "running": "Day {day} of {total}",
        "ended": "Ended"
      },
      "inCrew": "{in} of {total} in",
      "settings": "House settings",
      "viewPage": "View page",
      "chat": {
        "open": "Open in Messages",
        "emptyMember": "The crew chat opens once you're in.",
        "emptyHost": "The crew chat starts when the first guest joins.",
        "quiet": "No messages yet – say hi to your crew."
      },
      "crew": {
        "host": "Host",
        "you": "You",
        "paid": "Paid",
        "waitingPayment": "Waiting for payment",
        "in": "In",
        "yourPeople": "Your people",
        "livedWith": "Lived with",
        "noVibe": "No vibe yet",
        "onlyHost": "Just the host so far – the first spots are still open."
      },
      "plan": {
        "dates": "Dates",
        "nights": "{count, plural, one {# night} other {# nights}}",
        "gettingThere": "Getting there",
        "addressAfterPay": "Around {area}. The exact address shows here once you've paid.",
        "directions": "Directions",
        "rhythm": "Rhythm",
        "rhythmEmpty": "The host hasn't shared a rhythm yet.",
        "votes": "Votes",
        "votesEmpty": "Nothing to vote on right now."
      },
      "moments": {
        "title": "Moments",
        "place": "The place"
      },
      "me": {
        "booking": "Your booking",
        "dates": "Dates",
        "share": "Your share",
        "shareOpen": "Set once the place is booked",
        "payment": "Payment",
        "paid": "Paid",
        "due": "Due",
        "notYet": "Not due yet",
        "pay": "Pay your share",
        "cancel": "Cancellation",
        "cancelRules": "Cancellation rules",
        "leave": "Leave this House",
        "withdraw": "Withdraw request",
        "help": "Something went wrong?",
        "removedTitle": "You're no longer in this House",
        "similarTitle": "Similar Houses with a free spot",
        "removedText": "{host} removed you from {title}. Anything you paid is refunded.",
        "moderationText": "Simpulo removed you from {title} after a report. Anything you paid is refunded. Write to us if you think this is a mistake.",
        "lapsedTitle": "Your spot was released",
        "lapsedText": `The ${H.payment} hours to pay for {title} ran out, so your spot is open again. If there's still room, you can ask again.`,
        "similar": "Find a similar House",
        "hostShare": "As the host you pay your share like everyone else."
      }
    },
    "notFound": {
      "title": "House not found",
      "description": "This House doesn't exist or isn't public anymore.",
      "action": "Explore Houses"
    },
    "theHost": "the host",
    "loginToMessage": "Log in to message {name}",
    "photoPrompt": "Add a photo so {name} sees who's asking",
    "loginToAddPhoto": "Log in to add a photo",
    "addPhoto": "Add photo",
    "houseRules": "House rules",
    "datesAndNights": "{dates} · {nights}",
    "loginBeforeSending": "You'll log in before sending",
    "accommodation": "Accommodation",
    "ownHouse": "That's your own House",
    "gallery": {
      "photoAlt": "{name} – photo {number}",
      "share": "Share House",
      "identity": "{ageAndCountry} · speaks {languages}",
      "open": "Open {alt}"
    },
    "lightbox": {
      "label": "{name} – photos",
      "close": "Close photos",
      "previous": "Previous photo",
      "next": "Next photo",
      "counter": "{index} / {total}"
    },
    "facts": {
      "line": "{dates} · {nights} · {place}",
      "language": "This House is in {language}",
      "spotsIn": "{filled} of {total} in",
      "spotsLeft": "{count, plural, one {# spot left} other {# spots left}}",
      "crewComplete": "house complete",
      "invited": "{count} invited",
      "ageRange": "Looking for {min}–{max}",
      "reserved": "{count} reserved"
    },
    "pitch": {
      "why": "Why I'm hosting this",
      "day": "A typical day",
      "lookingFor": "Who I'm looking for"
    },
    "map": {
      "title": "Where you'll be",
      "openInMaps": "Open in Google Maps",
      "mapOf": "Map of {place}",
      "areaOpen": "Exact area decided with the House",
      "hintMac": "⌘ + scroll to zoom",
      "hintCtrl": "Ctrl + scroll to zoom",
      "hintTouch": "Two fingers to move"
    },
    "hostCard": {
      "profile": "{name}'s profile",
      "identity": "{name}, {age} · {country}",
      "speaks": "speaks {languages}",
      "viewProfile": "View profile"
    },
    "accommodationSection": {
      "crewDecides": "House decides together",
      "chatLinks": "{count, plural, =0 {no links in the chat yet} one {# link in the chat} other {# links in the chat}}",
      "openCrewChat": "Open House chat"
    },
    "accommodationChip": {
      "locked": "Locked",
      "lockedPrice": "Locked · {price} pp",
      "open": "Accommodation open"
    },
    "linkPreview": {
      "open": "Open"
    },
    "pay": {
      "bankConverts": "Charged in {currency}. Your bank converts the amount.",
      "title": "Pay your share",
      "nothingToPay": "There's nothing to pay for this House right now.",
      "alreadyPaid": "You've paid your share – thanks!",
      "share": "Share",
      "fee": "Simpulo fee",
      "total": "Total",
      "card": "Card",
      "cardNumber": "Card number",
      "expiry": "Expiry",
      "expiryPlaceholder": "MM/YY",
      "cvc": "CVC",
      "cvcPlaceholder": "CVC",
      "mockNote": "Test mode – no real card is charged. A number starting with 0000 is declined.",
      "declined": "Card declined – try another card",
      "processing": "Processing payment",
      "payButton": "Pay {amount}",
      "paidToast": "Paid {amount} – thanks!",
      "feeIncluded": "Service fee ({percent} %)",
      "feeMinimum": "Service fee (minimum {min})",
      "payBy": "Pay by {date}",
      "applePay": "Apple Pay",
      "googlePay": "Google Pay",
      "orCard": "or pay by card",
      "successTitle": "You're in.",
      "successText": `Booking confirmation follows within ${H.booking}h.`,
      "done": "Done",
      "receipt": "Receipt",
      "receiptPaid": "Paid {date}",
      "receiptMethod": "{brand} ****{last4}",
      "downloadReceipt": "Download receipt",
      "freeCancel": "Free cancellation until the crew is complete",
      "rules": "Rules",
      "orCardShort": "or card",
      "bankConvertsShort": "Charged in {currency}. Your bank converts."
    },
    "banner": {
      "yourShare": "Your share: <b>{amount}</b> · due {date}",
      "payNow": "Pay your share",
      "paid": "You've paid your share",
      "paidOn": "Paid · {date}"
    },
    "invite": {
      "title": "{name} invited you to their new House",
      "text": "You lived together before. Your spot is held until you answer.",
      "acceptedToast": "You're in – {title}",
      "declinedToast": "Invite declined – your spot is free again"
    },
    "openCrewGroup": "Open House group",
    "messageHost": "Message {name}",
    "inviteLink": {
      "banner": "{host} invited you – your spot is reserved until {date}",
      "join": "Join",
      "sheetTitle": "Join {title}",
      "loginToJoin": "Log in to take your spot",
      "payText": "Your spot is reserved. Pay your share to join the House.",
      "joinText": "Your spot is reserved. Join now – you pay your share once the crew is complete and the place is chosen, like everyone in the House.",
      "joinNow": "Join now",
      "joinedToast": "You're in – welcome to {title}",
      "invalid": "This invite link isn't valid any more.",
      "bannerSearch": "You searched for this: it's yours to join until {date}, before anyone else.",
      "joinTextSearch": "Join now – you pay your share once the crew is complete and the place is chosen, like everyone in the House. First come, first in."
    },
    "unlistedHint": "Your House is live via your link. It appears on Explore once Simpulo opens in your city.",
    "page": {
      "space": {
        "title": "The space",
        "bedrooms": "{count, plural, =0 {No separate bedroom} one {# bedroom} other {# bedrooms}}",
        "bathrooms": "{count, plural, =0 {No own bathroom} one {# bathroom} other {# bathrooms}}",
        "rooms": { "private": "Own rooms", "shared": "Shared rooms" },
        "outdoor": { "none": "No outside space", "balcony": "Balcony", "garden": "Garden", "courtyard": "Courtyard" },
        "kitchen": { "open": "Open kitchen", "separate": "Separate kitchen" }
      },
      "back": "Back",
      "share": "Share this House",
      "openGallery": "Open all photos",
      "showAllPhotos": "Show all photos",
      "photoAlt": "{title}, photo {number}",
      "galleryTitle": "Photos of {title}",
      "closeGallery": "Close photos",
      "hostFit": {
        "inCommon": "In common",
        "host": "Host",
        "languages": "You both speak {languages}",
        "interests": "Both into {interests}",
        "livedWith": "Lived with {name}, like you",
        "replies": "Replies in ~{time}",
        "minutes": "{count} min",
        "hours": "{count}h",
        "people": "{count, plural, one {# person} other {# people}} lived with {name}"
      },
      "line": "<date>{dates}</date> · {nights} · {place}",
      "payNote": "No payment until the crew is complete",
      "inviteFriends": "Invite friends",
      "message": "Message",
      "invite": "Invite",
      "spotInvite": "Invite someone to this spot",
      "spotInviteShort": "Invite",
      "spotInviteCopied": `Invite link copied – the spot is held for ${H.invite}h`,
      "audienceWomen": "This House is for women only.",
      "hostedCount": "hosted {count, plural, one {# House} other {# Houses}}",
      "photosCount": "{count, plural, one {# photo} other {# photos}}",
      "payBy": "Pay by {date}, or your spot opens up again",
      "hostedByShort": "Hosted by {name}",
      "aroundArea": "Around {area} · exact place decided with the crew",
      "placeWithCrew": "Place decided with the crew",
      "placeWithCrewHint": "Once the crew is together, you pick it as one",
      "placeVoting": "The crew is voting",
      "placeVoteOptions": "{count, plural, one {# option} other {# options}} · vote",
      "viewListing": "View listing",
      "placeTotal": "{price} total · {nights, plural, one {# night} other {# nights}}",
      "crewVotingOptions": "Crew is voting – {count, plural, one {# option} other {# options}}",
      "morePhotos": "Show all {count} photos",
      "steps": {
        "label": "How joining works",
        "request": "Request",
        "accepts": "Host accepts",
        "pay": "Pay when complete"
      },
      "factDates": "Dates",
      "factCrew": "Crew",
      "factCrewValue": "{total, plural, one {# person} other {# people}}, {open, plural, =0 {no spots left} one {# spot left} other {# spots left}}",
      "factIncluded": "Included",
      "includedStay": "Stay",
      "includedWithHost": "Stay + host experience",
      "factLanguages": "Languages",
      "hostedBy": "Hosted by {name} · {age} · {country}",
      "why": "Why I'm hosting",
      "crew": "The crew",
      "hostBadge": "Host",
      "crewHidden": "{count, plural, one {# more member} other {# more members}}",
      "yourSpot": "Your spot",
      "openSpot": "Open spot",
      "onWaitlist": "{count} on the waitlist",
      "yourWaitlistPlace": "You're #{position} on the waitlist",
      "yourWaitlistRequest": "Waitlist request sent – waiting for {name}",
      "waitlistMoveUp": "You move up automatically if someone drops out.",
      "allSpotsRequested": "All spots have pending requests",
      "offerUntil": "This spot is held for you until {time}.",
      "day": "A typical day",
      "lookingFor": "Who I'm looking for",
      "rules": "House rules",
      "where": "Where you'll be",
      "accommodation": "Accommodation",
      "votes": "{count, plural, one {# vote} other {# votes}}",
      "crewVoting": "Accommodation: crew is voting",
      "crewVotingShort": "Crew is voting",
      "crewVotingDates": "Dates: crew is voting",
      "lineOpen": "<date>{dates}</date> · {place}",
      "voteTitleAccommodation": "Where we'll stay",
      "voteTitleDates": "When we'll go",
      "voteEnds": "Voting ends {date}",
      "voteHint": "One vote each – you can change it.",
      "voteTie": "It's a tie – pick one.",
      "voteTieGuest": "It's a tie – {name} decides.",
      "voteClose": "End the vote",
      "voteOption": "{price} pp",
      "voteFor": "Vote for {option}",
      "voteOpenLink": "Open",
      "accommodationOpen": "House decides together – link follows in the chat",
      "more": "More houses like this",
      "reservedFor": "Reserved for {name}",
      "reserved": "Reserved",
      "notForYou": "This House isn't taking your request.",
      "hero": {
        "placeBooked": "Place booked",
        "pickingTogether": "Picking together",
        "stayIncluded": "Stay included",
        "stayAndHost": "Stay + host experience",
        "womenOnly": "Women only",
        "housesHosted": "{count, plural, one {# House} other {# Houses}} hosted",
        "viewProfile": "View profile",
        "wayIn": "Free to request · Pay only after the host says yes",
        "priceCap": "Final price depends on the crew. You never pay more than {price}.",
        "hostLabel": "Host",
        "fromYourPeople": "From your people",
        "respondsFast": "Responds fast",
        "inCommonLabel": "In common",
        "crewLabel": "Crew",
        "spotsLeftOf": "{open} of {total, plural, one {# spot} other {# spots}} left",
        "crewComplete": "Crew complete",
        "bringFriend": "Bring a friend – request together",
        "quote": "“{text}”",
        "quoteBy": "{name}, host"
      },
      "where2": {
        "around": "Around {area}",
        "exactAfter": "Exact address after booking.",
        "shortlist": "Shortlist",
        "perPerson": "{price} pp",
        "option": "Option {index}",
        "howTitle": "How the place is picked",
        "howSteps": {
          "join": "Crew joins",
          "suggest": "Everyone suggests places",
          "vote": "Vote, host books"
        },
        "exactShared": "Exact place shared after booking",
        "photoAlt": "{area}"
      },
      "messageHostShort": "Message host",
      "hostStatus": "{filled} of {total} in · {requests, plural, =0 {no requests} one {# request} other {# requests}}",
      "requestsToReview": "{count, plural, one {# request to review} other {# requests to review}}",
      "place": {
        "label": "Place",
        "exactAfter": "Exact place after booking",
        "pickedTogether": "Picked together · how it works",
        "viewListing": "View listing",
        "openMaps": "Open in Maps",
        "howTitle": "How the place is picked"
      },
      "tiles": {
        "spotsLeft": "{count, plural, one {# spot left} other {# spots left}}",
        "full": "Crew complete",
        "of": "of {total}",
        "ofWaitlist": "of {total} · {waiting} on the waitlist",
        "bringFriend": "Bring a friend",
        "pickedTogether": "Picked together",
        "viewListing": "View listing",
        "openMaps": "Open in Maps",
        "profile": "{name}'s profile",
        "spotsLeftRich": "<n>{count}</n> {count, plural, one {spot} other {spots}} left",
        "whosIn": "Who's in"
      },
      "phase": {
        "noPaymentUntilLaunch": "No payment until launch",
        "waitlistToast": "You're on the list – we'll let you know when Simpulo opens.",
        "reservedToast": "Spot reserved – no payment until launch."
      },
      "askHost": "Ask {name} a question"
    },
    "headStartHint": "Your House is live. For the first {hours}h only the people who searched for this see it, then it's on Explore.",
    "steps": {
      "label": "Your way in",
      "requested": "Requested",
      "accepted": "Accepted",
      "crew": "Crew {filled}/{total}",
      "pay": "Pay",
      "arrival": "Arrival",
      "crewAndPlace": "Crew & place",
      "bookedCheck": "Booked ✓",
      "openChat": "Open chat",
      "leave": "Leave House",
      "leaveTitle": "Leave this House?",
      "leaveText": "Your spot opens up again. Nothing has been charged unless you paid already.",
      "leftToast": "You left the House",
      "now": {
        "waitingHost": "Waiting for {name}",
        "waitingHostLine": "They answer within {hours}h – you'll hear in Messages.",
        "waitingHostLineNoTime": "You'll hear in Messages.",
        "waitingMore": "Waiting for {count} more",
        "waitingMoreLine": "You pay once the crew is complete – nothing is charged before.",
        "inviteFriend": "Invite friends",
        "pickingPlace": "Picking the place",
        "pickingPlaceLine": "The crew votes on the shortlist.",
        "vote": "Vote",
        "payShare": "Pay your share · {hours}h",
        "payShareNoTime": "Pay your share",
        "payShareLine": "{amount} – your spot is held until then.",
        "payNow": "Pay now",
        "hostBooks": "{name} books the place",
        "hostBooksLine": `Within ${H.booking}h – then the address is yours.`,
        "inDays": "{count, plural, one {In # day} other {In # days}}",
        "today": "Happening now",
        "bookedLine": "Booked ✓ · {dates}",
        "directions": "Get directions",
        "livedIn": "Lived in",
        "livedInLine": "Thanks for being part of it."
      },
      "sections": {
        "crew": "Crew {filled} · {open, plural, =0 {complete} one {# spot open} other {# spots open}}",
        "invite": "Invite",
        "place": "Place",
        "placeLater": "The shortlist comes once the crew suggests places.",
        "practical": "Practical",
        "address": "Address",
        "addressLater": "Shared after booking",
        "checkInOut": "Check-in – check-out",
        "cancellation": "Cancellation",
        "cancellationLine": "Free until the crew is complete · Rules",
        "included": "Included"
      },
      "tabs": {
        "label": "Your House",
        "chat": "Chat",
        "crew": "Crew",
        "plan": "Plan"
      }
    }
  },
  "request": {
    "cta": {
      "manage": "Manage House",
      "accepted": "You're in – open the House chat",
      "closed": "This House is closed",
      "pending": "Request sent · waiting for host",
      "declined": "Didn't work out",
      "crewSet": "House is set – message the host",
      "join": "Request to join",
      "pay": "Pay your share",
      "full": "House is full",
      "waitlist": "Join waitlist",
      "waitlistRequested": "Waitlist request sent",
      "waitlisted": "You're #{position} on the waitlist",
      "takeSpot": "Take your spot",
      "payForSpot": "Pay to take your spot",
      "ended": "This House has ended",
      "again": "Do it again",
      "acceptInvite": "Accept",
      "declineInvite": "Decline",
      "phaseWaitlist": "Join the waitlist",
      "reserve": "Reserve a spot",
      "reserved": "Spot reserved"
    },
    "steps": {
      "message": "Request to join",
      "waitlist": "Join the waitlist",
      "login": "Continue to Simpulo",
      "sent": "Request sent"
    },
    "waitlistNote": "Optional · if {name} says yes, you're on the waitlist and move up automatically if someone drops out",
    "waitlistSentTo": "Waitlist request sent to {name} – you'll hear back in Messages",
    "loginSubtitle": "Log in to send your request to {name}.",
    "optionalNote": "Optional · nothing is charged until the crew is complete",
    "loginNote": "You'll log in before sending – your message is kept.",
    "placeholder": "Hi! I'm a designer from Berlin, love early mornings and cooking for the House…",
    "looksGood": "Looks good",
    "minLength": "At least {count, plural, one {# character} other {# characters}}",
    "messageLabel": "Your message to {name} (optional)",
    "send": "Send request",
    "continue": "Continue",
    "sentTo": "Request sent to {name} – you'll hear back in Messages",
    "noteLabel": "Add a note for {name}",
    "noteCounter": "{count} / {max}",
    "notePlaceholder": "Anything {name} should know, or a question?"
  },
  "create": {
    "title": {
      "create": "Open a House",
      "edit": "Edit House"
    },
    "errors": {
      "region": "Pick a place from the list.",
      "cover": "Pick a cover: your own photo or one of these.",
      "startDate": "Pick your dates.",
      "startPast": "Houses start tomorrow at the earliest.",
      "endDate": "Pick the end date.",
      "dateOrder": "End date must be after the start date.",
      "minNights": "A House needs at least one night together.",
      "tooLong": "A House can run for at most {max} nights.",
      "titleLength": "Titles are {min}–{max} characters.",
      "lookingForUnfinished": "Finish the sentence – say who you're looking for in your own words.",
      "hostFeeTooHigh": "At most the share itself – {max} at your lowest budget.",
      "crewGroupUrl": "Use a WhatsApp or Telegram invite link (wa.me, chat.whatsapp.com or t.me).",
      "vibe": "Pick a vibe – or name your own.",
      "spots": "A House needs at least {min} people.",
      "placeMode": "Pick one to go on.",
      "totalPrice": "Add the total price of the place.",
      "budget": "Add both ends of the budget – or decide together.",
      "budgetOrder": "“To” can't be lower than “From”.",
      "hostFee": "Add the amount per guest – or pick “Split the rent only”.",
      "month": "Pick a month.",
      "dateProposal": "Each proposal needs a start and an end at least one night later, from tomorrow on.",
      "placeProposal": "Each proposal needs a link and a price per person.",
      "accommodationType": "Pick the kind of place – or \"Not sure yet\".",
      "source": "Pick a place – or a new one.",
      "rentPeriod": "Add your rental period – the end after the start.",
      "monthlyRent": "Add your rent per month.",
      "allowedToHost": "Confirm that you're allowed to host guests here.",
      "outsideRental": "These dates are outside your rental period.",
      "spotsRooms": "Your place has room for {max} people, you included."
    },
    "saved": "House saved",
    "published": "Your House is live",
    "loginToPublish": "Log in to open a House",
    "save": "Save",
    "back": "Back",
    "next": "Next",
    "publish": {
      "button": "Open House",
      "inviteCrew": "Invite {count, plural, one {# person} other {# people}} you lived with",
      "saveTemplate": "Save as template",
      "profile": {
        "photo": "a face photo",
        "name": "your name",
        "hint": "Add {items} to publish.",
        "edit": "Edit profile",
        "loggedOut": "You'll log in before it goes live – your answers stay."
      }
    },
    "livePreview": "Live preview",
    "previewButton": "Preview",
    "house": {
      "waitlistMax": "Waitlist",
      "waitlistMaxHint": "People who can wait for a spot once the House is full – they move up automatically.",
      "friendSpotsMax": "Spots for friends",
      "friendSpotsMaxHint": "How many spots one person in the crew can hold for friends, for {hours} hours. Members can do it once they've paid.",
      "crewSizeQuestion": "How many people, including you?",
      "placePhoto": "Add a photo of the place",
      "placePhotoChange": "Change photo of the place",
      "placePhotoRemove": "Remove",
      "custom": "Custom",
      "customLabel": "Your own vibe",
      "customPlaceholder": "e.g. Padel",
      "where": "Where",
      "wherePlaceholder": "City, region or country",
      "when": "When",
      "title": "Title",
      "titlePlaceholder": "Your House's name",
      "titleCount": "{count}/{max}",
      "titleTemplates": {
        "house": "{vibe} House {place}",
        "period": "{place} {vibe} {period}",
        "of": "{duration} of {activity} in {region}",
        "ofNoDates": "{activity} in {region}"
      },
      "periods": {
        "week": "Week",
        "month": "Month",
        "other": "Retreat"
      },
      "durations": {
        "week": "One Week",
        "twoWeeks": "Two Weeks",
        "threeWeeks": "Three Weeks",
        "month": "A Month",
        "twoMonths": "Two Months",
        "nights": "{count} Nights"
      },
      "titleVibes": {
        "fitness": "Fitness",
        "creator": "Creator",
        "founder": "Founder",
        "remote-work": "Remote Work",
        "wellness": "Wellness",
        "students": "Student",
        "holiday": "Holiday",
        "party": "Party",
        "social": "Social",
        "adventure": "Adventure",
        "culture": "Culture",
        "surf-water": "Surf"
      },
      "activities": {
        "fitness": "Training",
        "creator": "Creating",
        "founder": "Building",
        "remote-work": "Remote Work",
        "wellness": "Slow Living",
        "students": "Studying",
        "holiday": "Sun",
        "party": "Partying",
        "social": "Good Company",
        "adventure": "Adventure",
        "culture": "Culture",
        "surf-water": "Surfing"
      },
      "currencyLabel": "Currency",
      "lockedNote": "The place is locked – its price and link are managed on the House's Manage page.",
      "crewGroupUrl": "House group link (WhatsApp or Telegram)",
      "vibe": "Vibe",
      "customRemove": "Remove your own vibe",
      "decideTogether": "Decide together",
      "budgetFrom": "From",
      "budgetTo": "To",
      "titleSuggestions": "Title suggestions",
      "crewSize": "Crew size",
      "budgetLabel": "Budget per person",
      "exactDates": "Add exact dates",
      "justMonth": "Just the month",
      "changePlace": "Change place: {place}",
      "cardNote": "Card note",
      "rulesLabel": "One rule per line",
      "rulesHelper": "Short and clear – they show as a list on your House.",
      "rulesPlaceholder": "Deep-work hours are silent"
    },
    "pitch": {
      "whyPlaceholder": "What made you want to open this House?",
      "dayPlaceholder": "Morning, afternoon, evening – what does it look like?",
      "lookingFor": "Who I'm looking for",
      "lookingForPlaceholder": "Who would be a great fit for the House?",
      "hostNoteCount": "{count}/{max}",
      "hostNotePlaceholder": "Two spots left, flying in Feb 10 – who's in?",
      "lookingForCount": "{count}/{max}",
      "startWith": "Start with",
      "hostNoteExamples": [
        "First-timers welcome",
        "Two spots left",
        "Flying in on the 10th",
        "Quiet house, early nights"
      ]
    },
    "about": {
      "languagesPlaceholder": "Search languages",
      "languagesPlaceholderMore": "Add another",
      "addLanguage": "Add a language",
      "removeLanguage": "Remove {language}",
      "noLanguage": "No language matches."
    },
    "edit": {
      "loginTitle": "Log in to edit your House",
      "notFound": "House not found",
      "backToHouses": "Back to Houses"
    },
    "photoPlaceholder": "Your photo here",
    "starters": {
      "fitness": {
        "lookingFor": [
          "People who actually train – ",
          "Early risers who ",
          "Anyone who wants a routine and "
        ],
        "why": [
          "I train better with people around me, so ",
          "I've wanted a month of proper training since "
        ],
        "day": [
          "Gym at 7, then ",
          "Morning session, long lunch, "
        ]
      },
      "creator": {
        "lookingFor": [
          "Creators who post consistently and ",
          "Photographers and editors who ",
          "People who like making things together – "
        ],
        "why": [
          "I create more when I'm around other creators, so ",
          "I'm filming a series here and "
        ],
        "day": [
          "Shoot in the morning light, edit after lunch, ",
          "Golden hour content, then "
        ]
      },
      "founder": {
        "lookingFor": [
          "Founders who ship every week and ",
          "People building something of their own who ",
          "Anyone who likes talking product over dinner – "
        ],
        "why": [
          "Building alone is lonely, so ",
          "I want a month of deep work with people who "
        ],
        "day": [
          "Deep work until lunch, ",
          "Standup over breakfast, build all day, "
        ]
      },
      "remote-work": {
        "lookingFor": [
          "Remote workers with a real job and ",
          "People who work hard and still ",
          "Anyone who wants a calm base and "
        ],
        "why": [
          "Working from a laptop is better with a full house – ",
          "I want a base with good wifi and good people – "
        ],
        "day": [
          "Coffee, focused work until 3, ",
          "Cowork in the morning, explore in the afternoon, "
        ]
      },
      "wellness": {
        "lookingFor": [
          "People who want a slower month and ",
          "Anyone who cares about sleep, food and ",
          "Calm people who "
        ],
        "why": [
          "I need a reset, and ",
          "I want a month without rushing – "
        ],
        "day": [
          "Slow mornings, a long walk, ",
          "Breathwork, breakfast, then "
        ]
      },
      "students": {
        "lookingFor": [
          "Students on a semester break who ",
          "People studying remotely who ",
          "Anyone on a budget who "
        ],
        "why": [
          "Semester break is the perfect time, and ",
          "Studying is easier with people around – "
        ],
        "day": [
          "Library mornings, ",
          "Lectures online, then "
        ]
      },
      "holiday": {
        "lookingFor": [
          "People who want a proper break and ",
          "First-time travellers who ",
          "Anyone up for day trips and "
        ],
        "why": [
          "I finally have time off, and ",
          "I've wanted to see this place for years – "
        ],
        "day": [
          "Beach in the morning, ",
          "Slow breakfast, a day trip, "
        ]
      },
      "party": {
        "lookingFor": [
          "People who love music more than bottles and ",
          "Night owls who ",
          "Anyone who can go hard and "
        ],
        "why": [
          "Going out is better with a full house, so ",
          "I've wanted to do this party properly since "
        ],
        "day": [
          "Late breakfast, pool, ",
          "Sleep in, sunset, then "
        ]
      },
      "social": {
        "lookingFor": [
          "Easygoing people who ",
          "Anyone who likes a full table and ",
          "People far from home who "
        ],
        "why": [
          "I'd rather spend this week with new people than alone – ",
          "A house full of people beats a hotel, so "
        ],
        "day": [
          "Slow mornings, a walk, ",
          "Cooking together, games at night, "
        ]
      },
      "adventure": {
        "lookingFor": [
          "People who are fit enough to ",
          "Anyone who loves the outdoors and ",
          "Early risers who "
        ],
        "why": [
          "This trip needs a full house, so ",
          "I've wanted to do this route for years – "
        ],
        "day": [
          "Up at 6, out all day, ",
          "Long day outside, early nights, "
        ]
      },
      "culture": {
        "lookingFor": [
          "Curious people who ",
          "Anyone who loves museums, food and ",
          "People who want to really see a place and "
        ],
        "why": [
          "A city opens up with the right people, so ",
          "I've wanted to explore this place properly since "
        ],
        "day": [
          "Museum in the morning, ",
          "A walk through the old town, "
        ]
      },
      "surf-water": {
        "lookingFor": [
          "Surfers of any level who ",
          "People who'd rather be in the water by 6 and ",
          "Anyone learning to surf who "
        ],
        "why": [
          "Surfing alone gets old – ",
          "I want one season of surfing every day, and "
        ],
        "day": [
          "Dawn patrol, breakfast, then ",
          "Surf at sunrise, work midday, "
        ]
      }
    },
    "questions": {
      "vibe": "What's the House about?",
      "source": "Host from your place?",
      "place": "Got a place?",
      "where": "Where and when?",
      "crew": "Crew and price",
      "cover": "Cover and title",
      "extras": "Make it stand out",
      "ready": "Ready to open?",
      "details": "Add details",
      "title": "Give it a title",
      "photos": "Add photos",
      "why": "Tell the story",
      "dates": "Set the dates",
      "accommodation": "Where will you stay?",
      "space": "About the space",
      "host": "Host experience",
      "lookingFor": "Who are you looking for?",
      "rules": "House rules",
      "languages": "Languages in the House",
      "crewGroup": "House group link",
      "invite": "Invite your people",
      "inviteAgain": "Invite your crew",
      "kind": "Where will you live?",
      "depth": "How deep should this House go?"
    },
    "resume": {
      "untitled": "An unfinished House",
      "continue": "Continue",
      "line": "Continuing your draft from {date}",
      "lineNoDate": "Continuing your draft",
      "startOver": "Start over",
      "discardTitle": "Discard this draft?",
      "discard": "Discard",
      "discarded": "Draft discarded",
      "keep": "Keep",
      "conflictLabel": "You have a draft",
      "continueDraft": "Continue draft",
      "startNewWith": "Start new with {place}",
      "startNew": "Start new"
    },
    "focus": {
      "saveExit": "Save & exit"
    },
    "cover": {
      "drop": "Drop your photos here",
      "dropHint": "or click to choose · up to {max}, the first is the cover",
      "suggestions": "Or pick one of these",
      "suggestion": "Suggested photo {number}",
      "yours": "Your photos",
      "cover": "Cover",
      "isCover": "This is the cover",
      "makeCover": "Make this the cover",
      "remove": "Remove this photo",
      "pickPhotos": "Choose photos",
      "pickPhotosHint": "From your photo library · up to {max}, the first is the cover"
    },
    "ready": {
      "theme": "Theme",
      "where": "Where and when",
      "crew": "Crew",
      "budget": "Budget",
      "price": "Price",
      "place": "Place",
      "edit": "Edit",
      "editLabel": "Edit {label}",
      "more": "Add more details first",
      "add": "Add",
      "groups": {
        "about": "About",
        "place": "Place",
        "extras": "Extras"
      },
      "kind": "Kind of place",
      "depth": "Depth"
    },
    "home": {
      "ownTitle": "Use a place you live in",
      "newTitle": "New place",
      "newText": "Bring a place you found – or pick one with your crew.",
      "placeMeta": "{rooms, plural, one {# free room} other {# free rooms}} · {city}",
      "windows": "{count, plural, =0 {no windows yet} one {# window} other {# windows}}",
      "liveHere": "I live here – save it to Your places",
      "liveHereText": "Open more windows from it later: only dates, spots and price to set.",
      "rentPeriod": "Your rental period",
      "monthlyRent": "Your rent per month",
      "allowed": "I'm allowed to host guests here (sublet or guests allowed by my landlord and local rules)",
      "whatThisMeans": "What this means",
      "rental": "Your rental: {range}",
      "fromRent": "From your rent: {rent} a month · {nights, plural, one {# night} other {# nights}}",
      "placeName": "{kind} in {city}",
      "placeFallback": "Place"
    },
    "flow": {
      "placeSetTitle": "I have a place",
      "placeSetText": "You found it, your crew splits it. Guests see an exact price.",
      "placeTogetherTitle": "Let's find it together",
      "placeTogetherText": "Pick a city and budget, choose the place with your crew.",
      "searchLabel": "Where",
      "searchPlaceholder": "City, region or country",
      "useTyped": "Use “{query}”",
      "noMatch": "Not in the list? Use what you typed.",
      "changePlace": "Change {place}",
      "months": "Months",
      "monthsHint": "Pick one month – or several in a row.",
      "exactDates": "Add exact dates",
      "justMonths": "Just months",
      "people": "People, including you",
      "more": "More",
      "moreLabel": "Number of people",
      "bigHouse": "Big House – we'll help you set it up.",
      "totalPrice": "Total price of the place",
      "placeLink": "Link to the place (optional)",
      "placeLinkPlaceholder": "https://",
      "perPerson": "{share} per person",
      "guestFee": "Guests add a {percent} % service fee ({fee}) – you pay just your share.",
      "guestFeeMin": "Guests add the minimum service fee ({fee}) – you pay just your share.",
      "budget": "Budget per person",
      "budgetFrom": "From",
      "budgetTo": "To",
      "budgetSpread": "Tip: keep the top end at most twice the low end – a narrow range helps people decide.",
      "currency": "Currency",
      "description": "Description",
      "descriptionPlaceholder": "What will the days look like? What makes this House yours?",
      "placePhoto": "Photos of the place",
      "languages": "Languages",
      "who": "Who",
      "whoMixed": "Mixed",
      "whoWomen": "Women only",
      "age": "Crew age",
      "ageAny": "Any",
      "rules": "House rules",
      "rulesPlaceholder": "One rule per line",
      "skip": "Skip for now",
      "draftRestored": "Draft restored",
      "startOver": "Start over",
      "placeSet": "Place booked · {total} total",
      "placeTogether": "Finding it together",
      "optionalLine": "Optional details · {count} of {total} added",
      "addDetails": "Add details",
      "cardBooked": "Place booked",
      "cardTogether": "Picking together",
      "cardCrew": "1 of {total} · You",
      "progress": "Step {current} of {total}",
      "hostFee": "Host fee per guest (optional)",
      "hostFeeHint": "For hosts who lead the House – coaching, program, guiding. Shown separately to guests.",
      "hostFeeEarn": "You earn {amount} per guest after Simpulo's {percent} %"
    },
    "opened": {
      "title": "Your House is open.",
      "text": "Share the link – your crew finds you through it.",
      "copy": "Copy link",
      "story": "Story image",
      "notified": `{count, plural, one {# person was notified – they get ${H.searchHeadStart}h first} other {# people were notified – they get ${H.searchHeadStart}h first}}`,
      "saveTemplate": "Save as template",
      "templateSaved": "Saved as a template",
      "yourHouses": "Go to Your houses",
      "copyInvite": "Copy invite link",
      "inviteCopied": `Invite link copied – the spot is held for ${H.invite}h`
    },
    "socialsHint": "<link>Add your socials in your profile</link> – houses with socials get more requests",
    "templates": {
      "title": "Start from a template",
      "untitled": "Untitled",
      "remove": "Remove template {title}"
    },
    "host": {
      "label": "How you host",
      "rent": {
        "title": "Split the rent only",
        "text": "Everyone pays their share of the place – nothing on top."
      },
      "program": {
        "title": "With a program",
        "text": "Sessions, coaching or guestlists – guests pay a little extra."
      },
      "proOnly": "Pro hosts can add a paid program.",
      "amount": "Amount per guest",
      "earn": "You earn ≈ {amount} per guest · {total} with a full House",
      "note": "On top of each guest's share – all of it goes to you."
    },
    "extras": {
      "rows": {
        "why": "Why I'm hosting",
        "day": "A typical day"
      }
    },
    "space": {
      "intro": "Optional – it helps your crew picture the place. Skip anything you don't know.",
      "roomsTitle": "Rooms",
      "bedrooms": "Bedrooms",
      "bathrooms": "Bathrooms",
      "rooms": "Rooms",
      "roomKinds": { "private": "Own rooms", "shared": "Shared rooms" },
      "sharedTitle": "Shared spaces",
      "shared": "What's there to share",
      "sharedSpaces": { "kitchenTable": "Big kitchen table", "living": "Living room", "workspace": "Workspace", "pool": "Pool or garden" },
      "outdoor": "Outside",
      "outdoors": { "none": "None", "balcony": "Balcony", "garden": "Garden", "courtyard": "Courtyard" },
      "kitchen": "Kitchen",
      "kitchens": { "open": "Open", "separate": "Separate" },
      "togetherTitle": "Where people meet",
      "table": "Where's the biggest table?",
      "tables": { "center": "In the middle", "edge": "At the side", "none": "No big table" },
      "seats": "How many fit at it",
      "bathThroughShared": "Does the way to the bathroom go through a shared room?",
      "retreat": "Is there a quiet place to be alone?",
      "answers": { "yes": "Yes", "no": "No" },
      "placeTitle": "The place",
      "area": "Size, roughly",
      "areaUnit": "m²",
      "daylight": "Daylight in the shared room",
      "daylights": { "low": "Little", "medium": "Some", "high": "Lots" },
      "setting": "Setting",
      "settings": { "city": "City", "edge": "Edge of town", "country": "Countryside" },
      "visibility": "Your House page shows bedrooms, bathrooms, own or shared rooms, outside space and the kitchen. The rest helps us suggest better places – it isn't shown.",
      "answered": "{count} of {total}"
    },
    "details": {
      "addDetails": "Add details",
      "progress": "{count} optional",
      "step": "{current} / {total}",
      "done": "Done",
      "fix": "Needs a fix",
      "liveTitle": "Your House is live",
      "share": "Share link",
      "rows": {
        "vibe": "Theme",
        "where": "Where and when",
        "crew": "Crew and budget",
        "title": "Title and card note",
        "photos": "Photos",
        "why": "Description",
        "dates": "Exact dates",
        "accommodation": "Accommodation",
        "space": "About the space",
        "host": "Host experience",
        "lookingFor": "Who I'm looking for",
        "rules": "House rules",
        "languages": "Languages",
        "crewGroup": "House group link",
        "depth": "Depth"
      }
    },
    "vote": {
      "datesLabel": "How the dates are set",
      "monthOnly": "Month only",
      "exact": "Exact dates",
      "decideWithCrew": "Decide with crew",
      "explainDates": "Suggest up to three date ranges. Each member gets one vote; on a tie you decide.",
      "placeLabel": "How the place is chosen",
      "later": "I'll sort it out",
      "explainLater": "Lock a place on your House's Manage page whenever you've found it.",
      "explainPlace": "Suggest up to three places. Each member gets one vote; on a tie you decide. The price stays a range until then.",
      "linkLabel": "Link to place {number}",
      "priceLabel": "Price per person for place {number}",
      "pricePerPerson": "Price per person.",
      "add": "Add a proposal",
      "remove": "Remove proposal {number}",
      "deadline": "Voting ends"
    },
    "invite": {
      "count": `{max, plural, =0 {No spots left to invite to} other {{count} of {max} spots held for ${H.invite}h once it opens}}`,
      "livedIn": "Lived together in {place}",
      "addFrom": "Add from Your people",
      "search": "Search your people",
      "noMatch": "Nobody by that name",
      "add": "Add",
      "byLink": "Invite by link",
      "byLinkHint": `You get a link right after opening – it holds a spot for ${H.invite}h`
    },
    "kind": {
      "popular": "Popular for {topic}",
      "crew": "crew {min}–{max}",
      "more": "More places",
      "less": "Fewer places",
      "whichOne": "Which one?",
      "unsure": "Not sure yet",
      "unsureText": "pick it together with your crew",
      "unsureLine": "Picked with the crew",
      "skipper": "Usually chartered with a skipper",
      "chosen": "Chosen"
    },
    "depth": {
      "title": "How deep should this House go?",
      "easy": {
        "title": "Easy",
        "text": "Live together, no program."
      },
      "balanced": {
        "title": "Balanced",
        "text": "A few good moments to connect."
      },
      "deep": {
        "title": "Deep",
        "text": "Questions, intentions, a real closing night."
      },
      "suggested": "Suggested for {topic}",
      "hint": "Guests see it on your House. Fixed once the first guest has booked.",
      "locked": "Fixed – someone has already booked this House.",
      "fixed": "Fixed after the first booking"
    }
  },
  "houses": {
    "title": "Your houses",
    "view": {
      "crew": "Crew",
      "requests": "Requests",
      "chat": "Chat",
      "payment": "Payment",
      "payments": "Payments",
      "details": "Details",
      "share": "Share",
      "chatEmpty": "No messages yet.",
      "openChat": "Open chat",
      "accommodation": "Place",
      "accommodationOpen": "Decided with the crew",
      "address": "Address",
      "addressAfter": "Shared once the booking is confirmed",
      "rules": "House rules",
      "viewPage": "View page",
      "edit": "Edit",
      "withdraw": "Withdraw request",
      "livedIn": "Lived in · {date}",
      "livedWith": "Lived with",
      "photos": "Photos",
      "doItAgain": "Do it again",
      "housesLike": "Houses like this"
    },
    "home": {
      "unreadNews": "Unread news",
      "dash": {
        "tabs": {
          "label": "Your houses",
          "joining": "Joining",
          "hosting": "Hosting",
          "earnings": "Earnings",
          "joiningEmpty": "Houses you ask to join show up here."
        },
        "upNextIn": "Up next · in {days, plural, one {# day} other {# days}}",
        "upNextToday": "Up next · today",
        "todoTitle": "To do",
        "todoCount": "To do · {count}",
        "allDone": "All done",
        "moreTasks": "+ {count} more",
        "fewer": "Show less",
        "openThisHouse": "Open House",
        "yourHousesCount": "Your houses · {count}",
        "livedInCount": "Lived in · {count}",
        "filterLabel": "Show",
        "filter": {
          "all": "All",
          "hosting": "Hosting",
          "joined": "Joined"
        },
        "group": {
          "pay": "Pay",
          "reply": "Reply",
          "setup": "Set up"
        },
        "groupDone": "{name}: nothing to do",
        "groupOpen": "{name}: {count} open",
        "showHouse": "House {index} of {count}",
        "pageOf": "{index} / {count}",
        "needsTitle": "Needs you",
        "needsCount": "Needs you · {count}",
        "setupWhere": "Your account",
        "need": {
          "pay": "Pay {amount}",
          "offer": "Take spot",
          "requests": "{count, plural, one {Review # request} other {Review # requests}}",
          "book": "Confirm booking",
          "choosePlace": "Choose place",
          "invite": "Invited",
          "payouts": "Set up payouts",
          "overlap": "{count, plural, one {Pick one} other {Sort # overlaps}}",
          "verify": "Verify your ID",
          "profile": "Finish profile",
          "fill": "{count, plural, one {Fill # spot} other {Fill # spots}}"
        },
        "whatsNew": "What's new",
        "what": {
          "joined": "{name} joined",
          "youreIn": "You're in",
          "messages": "{count, plural, one {# message} other {# messages}}",
          "paid": "Paid",
          "payDue": "Pay due",
          "full": "Full",
          "booked": "Booked",
          "newRequest": "New request",
          "requests": "Requests waiting",
          "opened": "Opened",
          "invited": "Invited",
          "again": "Again?",
          "declined": "Didn't work out",
          "update": "Update"
        },
        "plusMore": "+{count}",
        "thisYear": "this year",
        "due": "due {date}",
        "dueNow": "due now",
        "hoursLeft": "{count}h left",
        "daysLeft": "{count, plural, one {# day left} other {# days left}}",
        "profileText": "Photos and a few words – hosts say yes more often.",
        "todo": {
          "pay": "Pay your share",
          "offer": "Take your spot",
          "requests": "{count, plural, one {Review # request} other {Review # requests}}",
          "book": "Confirm the booking",
          "choosePlace": "Choose the place",
          "invite": "Answer the invite",
          "payouts": "Set up payouts",
          "overlap": "{count, plural, one {Pick one} other {Sort # overlaps}}",
          "verify": "Verify your ID",
          "profile": "Complete your profile",
          "fill": "{count, plural, one {Fill # spot} other {Fill # spots}}"
        },
        "payoutsTitle": "Payouts",
        "receivedYear": "received this year",
        "nextPayout": "Next payout: {date}",
        "viewPayouts": "View payouts",
        "setUpPayouts": "Set up payouts",
        "setUpText": "Get the crew's shares paid to your bank.",
        "hostOwnTitle": "Host your own House",
        "hostOwnText": "Open a place and find your crew.",
        "openHouse": "Open a House",
        "activityTitle": "Activity",
        "seeAll": "See all",
        "activityEmpty": "Nothing yet.",
        "livedWith": "Lived with {names}",
        "livedWithMore": "Lived with {names} +{count}",
        "doItAgain": "Do it again",
        "housesLikeThis": "Houses like this",
        "nearSearches": "Near your searches",
        "hostYouFollow": "From a host you follow",
        "nextTripTitle": "For your next trip",
        "nextTripSub": "Open Houses that fit what you like.",
        "livedWithMonth": "Lived with · {month}",
        "newMessages": "{count, plural, one {# new message} other {# new messages}}",
        "moreCount": "+{count} more",
        "nextPayoutChip": "Next payout · {date}",
        "hostOwnAction": "Open a House",
        "strip": {
          "earned": "earned this year",
          "paidOut": "paid out this year",
          "hosting": "{count, plural, one {House} other {Houses}} hosting",
          "full": "full",
          "requests": "{count, plural, one {request} other {requests}}"
        },
        "payoutsSetupSub": "Bank account + ID check, 5 min",
        "optional": "Optional",
        "payoutsNotSetUp": "Payouts not set up",
        "rows": {
          "hosting": "Hosting",
          "going": "Going",
          "waiting": "Waiting",
          "livedIn": "Lived in",
          "nextTrip": "For your next trip",
          "back": "Your houses",
          "saved": "Saved"
        },
        "filterAll": "All",
        "allSet": "You're all set",
        "allSetHint": "We'll tell you when something needs you.",
        "groupEmpty": "Nothing here right now.",
        "openForRequests": "Open for requests",
        "comingUp": "Coming up",
        "timeline": {
          "pay_opens": "Pay opens",
          "pay_due": "Pay due",
          "booking_confirmed": "Booking confirmed",
          "arrival": "Arrival"
        },
        "sheetTitle": "{group} · {count}",
        "nothingPlanned": "Nothing planned yet",
        "livedInLast": "Lived in · {month}",
        "findFirst": "Find your first House →",
        "explore": "Explore",
        "stage": {
          "next": "Next: {house} in {count, plural, one {# day} other {# days}}",
          "now": "Now: {house}",
          "nothingNext": "Nothing planned yet",
          "livedIn": "{count, plural, one {House lived in} other {Houses lived in}}",
          "people": "Your people",
          "fill": "filled",
          "payoutsReady": "Payouts ready",
          "payoutsChecking": "Payouts being checked",
          "payoutsAction": "Payouts need you",
          "payoutsSetUp": "Set up payouts",
          "openHost": "Hosting and payouts",
          "openProfile": "Your profile",
          "thisMonth": "this month",
          "thisYear": "{amount} this year",
          "payoutsLabel": "payouts",
          "countries": "{count, plural, one {country} other {countries}}"
        }
      },
      "tabsLabel": "Show",
      "tabs": {
        "houses": "Houses",
        "earnings": "Payouts"
      },
      "stats": {
        "earnedYear": "Received this year",
        "nextPayout": "Next payout",
        "requests": "Requests waiting",
        "active": "Active Houses"
      },
      "needsYou": "Needs you",
      "allCaughtUp": "All caught up",
      "hostingCount": "Hosting · {count}",
      "joinedCount": "Joined · {count}",
      "draftsCount": "Drafts · {count}",
      "openHouseText": "Your crew chips in for the stay",
      "task": {
        "requests": {
          "chip": "{count, plural, one {# request} other {# requests}}",
          "action": "Review {count, plural, one {# request} other {# requests}}",
          "sheetTitle": "Requests · {house}",
          "slow": `Guests are waiting – answer within ${H.request}h, a quick yes or “Not a fit” helps them plan.`
        },
        "book": {
          "chip": "Confirm booking",
          "action": "Confirm booking",
          "sheetTitle": "Confirm the booking",
          "sheetText": `Everyone paid. Book the place and upload the confirmation within ${H.booking}h – then the money is released to you.`
        },
        "choosePlace": {
          "chip": "Choose the place",
          "action": "Choose place"
        },
        "pay": {
          "chip": "Pay by {date}",
          "action": "Pay · {hours}h"
        },
        "invite": {
          "chip": "Invited",
          "action": "Answer invite",
          "sheetTitle": "{name} invited you",
          "sheetText": "Your spot is held – join the crew or let it go."
        },
        "offer": {
          "chip": "Spot open · {hours}h",
          "action": "Take spot",
          "sheetTitle": "Take your spot in {house}?",
          "sheetText": `A spot opened up and it's held for you for ${H.waitlistOffer} hours.`,
          "toast": "You're in {house} 🎉"
        }
      },
      "new": {
        "title": "Your Houses live here.",
        "text": "Join a crew or open your own House – everything you're part of shows up here.",
        "find": "Find a House",
        "open": "Open a House"
      },
      "earningsCard": {
        "eyebrow": "Payouts",
        "sub": "received for {count, plural, one {# House} other {# Houses}} this year",
        "hostFees": "{amount} host fees earned",
        "link": "View payouts →",
        "received": "{amount} received",
        "setupLink": "Set up payouts →",
        "setupTitle": "Set up payouts",
        "setupText": "Your crew pays you directly – you book the stay.",
        "setupAction": "Set up",
        "hostTitle": "Host your own House",
        "hostText": "Your crew chips in for the stay",
        "hostAction": "Open a House"
      },
      "host": {
        "requests": "{count, plural, one {# request} other {# requests}}",
        "full": "Full",
        "taking": "Taking requests",
        "notTaking": "Not taking requests",
        "cancelled": "Cancelled",
        "complete": "Crew complete"
      },
      "needs": {
        "payouts": {
          "title": "Set up payouts",
          "sub": "Needed to receive your crew's payments",
          "action": "Set up"
        },
        "payoutsAction": {
          "title": "Stripe needs one more thing",
          "sub": "Finish it to receive your crew's payments",
          "action": "Continue"
        },
        "pay": {
          "title": "Pay for {house}",
          "sub": "{hours}h left · due {date}",
          "action": "Pay"
        },
        "offer": {
          "title": "A spot opened in {house}",
          "sub": "Take it within {hours}h",
          "action": "Take spot"
        },
        "book": {
          "title": "Confirm the booking",
          "sub": `{house} · within ${H.request}h`,
          "action": "Mark as booked"
        },
        "paymentsOpen": {
          "title": "{count, plural, one {# payment open} other {# payments open}}",
          "sub": "{house} · due {date}",
          "action": "View"
        },
        "requests": {
          "title": "Review {count, plural, one {# request} other {# requests}}",
          "sub": "{hours, plural, =0 {{house}} other {{house} · the first expires in #h}}",
          "subSlow": `{house} · guests are waiting – answer within ${H.request}h`,
          "action": "Review"
        },
        "responseRate": {
          "title": `Answer requests within ${H.request}h`,
          "sub": "Guests are waiting – a quick yes or “Not a fit” helps them plan"
        },
        "invite": {
          "title": "You're invited",
          "sub": "{house}",
          "action": "Answer"
        },
        "choosePlace": {
          "title": "Choose the place",
          "sub": "{house} · the crew is complete",
          "action": "Choose"
        },
        "voting": {
          "title": "The crew is voting on the place",
          "sub": "{house}",
          "action": "Open"
        },
        "finish": {
          "title": "Finish your draft",
          "sub": "{house}",
          "action": "Finish"
        }
      },
      "needsYouDot": "Something needs you",
      "allSet": "All set.",
      "drafts": "Drafts",
      "hosting": "Hosting",
      "joined": "Joined",
      "past": "Past · {count}",
      "showAll": "Show all ({count})",
      "showAllLink": "Show all ({count}) →",
      "showMore": "Show more",
      "pastBadge": "Over",
      "upNext": "Up next",
      "upNextEyebrow": "Up next · {status}",
      "upNextAllSet": "All set – see you there.",
      "crewStatus": "{filled} of {total} · {status}",
      "continueDraft": "Continue draft",
      "openChat": "Open chat",
      "tabAll": "All",
      "tabHosting": "Hosting",
      "tabJoined": "Joined",
      "tabPast": "Past",
      "tabEmpty": "Nothing here yet.",
      "draftChip": "Draft",
      "draftLive": "Not open yet",
      "livePayWithin": "Pay within {hours}h",
      "liveRequests": "{count, plural, one {# request waiting} other {# requests waiting}}",
      "liveInvitedBy": "Invited by {name}",
      "liveNewMessage": "New message from {name}",
      "liveSpotsLeft": "{count, plural, one {# spot left} other {# spots left}}",
      "liveStartsIn": "{days, plural, one {Starts tomorrow} other {Starts in # days}}",
      "liveStartsToday": "Starts today",
      "liveNow": "Happening now",
      "you": "You",
      "didntWorkOutLine": "This one didn't work out – here are similar Houses",
      "openHouse": "Open a House",
      "continue": "Continue",
      "untitled": "Untitled House",
      "crewOf": "{filled} of {total}",
      "emptyTitle": "No Houses yet",
      "emptyText": "Join a House that fits your vibe – or open your own and find your people.",
      "emptyExplore": "Explore Houses",
      "tasks": {
        "finish": "Finish your draft to open it",
        "requests": "{count, plural, one {# request is waiting} other {# requests are waiting}}",
        "choosePlace": "The crew is complete – choose the place",
        "voting": "The crew is voting on the place",
        "paymentsOpen": "{count, plural, one {# payment open} other {# payments open}} – due {date}",
        "book": `Everyone paid – book the place within ${H.booking}h`,
        "invite": "You're invited – answer the host",
        "pay": "Pay your share – due {date}",
        "offer": "A spot opened for you – take it by {date}",
        "actions": {
          "finish": "Finish",
          "review": "Review",
          "choose": "Choose",
          "markBooked": "Mark as booked",
          "answer": "Answer",
          "pay": "Pay your share",
          "takeSpot": "Take spot"
        }
      },
      "deleteDraft": "Delete draft",
      "deleteDraftTitle": "Delete this draft?",
      "deleteDraftText": "It's gone for good – nobody has seen it.",
      "deleteDraftConfirm": "Delete",
      "keep": "Keep",
      "draftDeleted": "Draft deleted",
      "draftOptions": "Draft options",
      "localDraft": "Your draft",
      "guest": {
        "cancelled": "Cancelled",
        "requested": "Requested",
        "invited": "Invited",
        "waitlistRequested": "Waitlist requested",
        "waitlisted": "Waitlist #{position}",
        "accepted": "Accepted",
        "payBy": "Pay by {date}",
        "paid": "Paid",
        "booked": "Booked",
        "didntWorkOut": "Didn't work out",
        "waitingForHost": "Waiting for host",
        "youreIn": "You're in",
        "reserved": "Reserved"
      },
      "crewChipsIn": "Your crew chips in",
      "tileInDays": "{days, plural, =0 {Today} one {Tomorrow} other {in # days}}",
      "tileCrewIn": "{filled} of {total} in",
      "tileOpen": "Open for requests"
    },
    "earnings": {
      "title": "Payouts",
      "loginTitle": "Log in to see your payouts",
      "allTimeLine": "{amount} all time",
      "free": "Free",
      "freeReason": "Simpulo takes nothing from hosts – guests pay the service fee",
      "accountNone": "Payouts not set up",
      "accountSetUp": "Set up payouts",
      "accountActive": "Payouts to ****{last4}",
      "accountEdit": "Edit",
      "allTime": "Received (all time)",
      "thisYear": "This year",
      "pending": "Pending payouts",
      "next": "Next payout",
      "perMonth": "Payouts per month",
      "perHouse": "Per House",
      "payouts": "Payouts",
      "columns": {
        "house": "House",
        "dates": "Dates",
        "guests": "Guests",
        "hostFee": "Host fee",
        "simpuloFee": "Simpulo fee",
        "yourEarnings": "Your earnings",
        "rentPassed": "Rent passed on",
        "paidOn": "Paid on",
        "status": "Status"
      },
      "status": {
        "paid": "Paid",
        "scheduled": "Scheduled",
        "pending": "Pending"
      },
      "account": "to {account}",
      "export": "Export CSV",
      "taxNote": "Simpulo doesn't give tax advice.",
      "noPayouts": "No payouts yet – the first one comes the day after your first House's check-in.",
      "noMonths": "Nothing paid out in the last 12 months yet.",
      "nextLine": "Next payout {amount} · {date}",
      "bank": "Bank ••{last4}",
      "again": "Do it again",
      "againText": "Open {name} again – with the same crew",
      "pro": {
        "earningsThisYear": "Earnings this year",
        "perGuest": "{amount} per guest · {guests} guests",
        "comingUp": "Coming up",
        "fillRate": "Fill rate",
        "bestHouse": "Best House",
        "repeatGuests": "Repeat guests",
        "rentPassed": "Rent passed on this year: {amount}",
        "rentPassedInfo": "Your crew's share of the place – not income."
      },
      "share": {
        "title": "Your Houses",
        "line": "{houses, plural, one {# House} other {# Houses}} · {people, plural, one {# person} other {# people}} brought together · {full} % full",
        "leadTitle": "Lead your next House?",
        "leadText": "Coaching, a program, a guided trip – add a host fee.",
        "leadAction": "Add a host fee"
      },
      "topHost": {
        "title": "Top Host",
        "dots": "{done} of {goal} full Houses this year",
        "missing": "{count, plural, one {# more full House to Top Host} other {# more full Houses to Top Host}}",
        "answerRate": "Answer {percent} % of requests to become Top Host",
        "reached": "You're a Top Host this year"
      },
      "insights": {
        "daysToFill": "Your Houses fill in {days, plural, one {# day} other {# days}} on average",
        "twice": "{count, plural, one {# person joined you twice} other {# people joined you twice}}"
      },
      "chart": {
        "title": "Per month",
        "series": "Show",
        "earnings": "Earnings",
        "rent": "Rent passed on",
        "range": "Period",
        "year": "12 months",
        "all": "All time"
      },
      "strip": {
        "nextPayout": "Next payout",
        "setUpToGet": "Set up to get {amount}",
        "shareLine": "{earned} earned · {rent} rent passed on",
        "firstPayout": "Your first payout comes the day after check-in",
        "leadQuestion": "Lead your next House?",
        "leadLink": "Add a host fee",
        "verify": "Verify identity",
        "checking": "Stripe is checking your details",
        "best": "Best House: {name} · {amount}"
      }
    },
    "loginTitle": "Log in to see your houses",
    "loginDescription": "Houses you host or joined show up here.",
    "emptyJoined": {
      "title": "Find a House in Explore",
      "description": "Ask to join a House that matches your vibe – it shows up here.",
      "action": "Explore Houses"
    },
    "noHouse": "No House yet",
    "noJoinedHouse": "No joined Houses yet",
    "row": {
      "new": "{count} new",
      "pending": "Pending",
      "closed": "Closed",
      "invited": "You're invited",
      "waitlist": "Waitlist"
    },
    "firstHouse": {
      "title": "Open your first House<accent>.</accent>",
      "description": "Pick a place, dates and a vibe – a rough budget is enough to start."
    },
    "manage": {
      "loginTitle": "Log in to see your House",
      "notFound": "House not found",
      "backToHouses": "Back to Houses"
    },
    "tabs": {
      "label": "This House",
      "overview": "Overview",
      "requests": "Requests",
      "crew": "Crew",
      "payments": "Payments",
      "payment": "Payment",
      "share": "Share",
      "withCount": "{label}, {count} new"
    },
    "overview": {
      "allSet": "All set.",
      "arrival": "{count, plural, one {Arrival tomorrow} other {Arrival in # days}}",
      "finish": "Finish your House to open it",
      "requests": "{count, plural, one {# new request} other {# new requests}}",
      "paymentsOpen": "{open} of {count} payments open · due {date}",
      "yourShareDue": "Your share is open · due {date}",
      "voting": "Accommodation: crew is voting",
      "choosePlace": "The crew is complete – choose the place",
      "bookPlace": `Book the place – you have ${H.booking}h`,
      "groupLink": "Crew complete – share the group chat link",
      "crew": "Crew",
      "crewIn": "{filled} of {total} in",
      "price": "Price per person",
      "payout": "Payout",
      "progress": "Progress",
      "steps": {
        "open": "Open",
        "crew": "Crew complete",
        "paid": "Everyone paid",
        "booked": "Booked",
        "arrival": "Arrival"
      },
      "guestSteps": {
        "requested": "Requested",
        "accepted": "Accepted",
        "paid": "Paid",
        "booked": "Booked",
        "arrival": "Arrival"
      },
      "state": {
        "done": "done",
        "now": "now",
        "later": "to come"
      },
      "next": {
        "finish": "Finish your House to open it",
        "finishAction": "Finish",
        "requests": "{count, plural, one {# request is waiting} other {# requests are waiting}}",
        "seeRequests": "See requests",
        "spotsLeft": "{count, plural, one {# spot left} other {# spots left}}",
        "invite": "Invite friends",
        "voting": "The crew is voting on the place",
        "openChat": "Open chat",
        "choosePlace": "The crew is complete – choose the place",
        "choosePlaceAction": "Choose place",
        "paymentsOpen": "{open, plural, one {# payment open} other {# payments open}} – due {date}",
        "remind": "Remind",
        "reminded": "Reminder sent",
        "book": `Book the place within ${H.booking}h`,
        "markBooked": "Mark as booked",
        "ready": "All set – see you there",
        "waiting": "Waiting for {name} to answer",
        "yourShare": "Your share is open – due {date}",
        "payLabel": "Pay your share · {amount} · {left}",
        "leftHours": "{count}h left",
        "leftDays": "{count, plural, one {# day left} other {# days left}}",
        "invited": "{name} invited you – your spot is held.",
        "acceptInvite": "Accept invite",
        "declineInvite": "Decline",
        "payNow": "Pay your share"
      },
      "requestsTitle": "Requests",
      "noRequests": "No open requests",
      "seeAll": "See all {count}",
      "accept": "Accept",
      "acceptFull": "The crew is full – no spot to accept",
      "decline": "Decline",
      "paymentsTitle": "Payments",
      "paymentsAmount": "{paid} of {total}",
      "due": "due {date}",
      "paymentsLater": "Payments start once the crew is complete and the place is chosen",
      "yourPayment": "Your payment",
      "paid": "Paid",
      "arrivalTitle": "Arrival",
      "days": "{count, plural, one {day} other {days}}",
      "daysCount": "{count, plural, one {# day} other {# days}}",
      "payoutAfter": "Payout {amount} after check‑in",
      "guestFlow": {
        "requested": "Requested",
        "invited": "Accept invite",
        "accepted": "Accepted",
        "pay": "Pay",
        "paid": "Paid",
        "booking": "Booking",
        "booked": "Booked",
        "arrival": "Arrival",
        "arrived": "Arrived"
      },
      "card": {
        "today": "Today",
        "startsIn": "{count, plural, one {Starts tomorrow} other {Starts in # days}}",
        "directions": "Directions",
        "openChat": "Open chat",
        "onWaitlist": "You're on the waitlist",
        "withdraw": "Withdraw request",
        "payLater": "{filled} of {total} in – you pay once the crew is complete and the place is chosen.",
        "waitBooking": `Everyone paid – {name} books the place within ${H.booking}h.`,
        "paidOf": "{paid} of {total} paid",
        "booked": "{name} booked the place",
        "place": "The place",
        "checkIn": "Check-in {date}",
        "addToCalendar": "Add to calendar"
      }
    },
    "detail": {
      "closed": "Closed",
      "editHouse": "Edit house",
      "edit": "Edit",
      "crewComplete": "Crew complete",
      "viewPage": "View page",
      "closedToast": "House closed – everyone in it has been told",
      "takingRequests": "Taking requests",
      "notTakingRequests": "Not taking requests",
      "more": "More for this House",
      "sections": {
        "crew": "In this House",
        "requests": "{count, plural, one {# request} other {# requests}}",
        "interested": "Invites",
        "share": "Share",
        "payments": "Payments",
        "notLocked": "No payments yet – lock the accommodation and everyone pays their share.",
        "payout": "Payout",
        "payoutPending": "{amount} to your payout account once the booking is confirmed",
        "payoutDone": "{amount} paid out to your payout account",
        "yourPayment": "Your payment",
        "notLockedGuest": "Nothing to pay yet. Your share is due once the crew is complete and the place is chosen.",
        "refundNote": `Full refund if the host cancels, the place is unlocked, or the booking isn't confirmed within ${H.booking} hours.`,
        "crewGroup": "House group",
        "crewGroupText": "The House's own group chat, now that everyone's in.",
        "openCrewGroup": "Open House group",
        "host": "Host",
        "messageHost": "Message {name}",
        "openAgain": "Open again with the same House",
        "openAgainText": "A new House with everything from this one – only the dates are new. Everyone from this one is invited when it goes live.",
        "openAgainAction": "Open again",
        "summary": "Summary",
        "summaryDates": "Dates",
        "summaryPlace": "Place",
        "summaryPaid": "You paid",
        "summaryNothing": "Nothing",
        "remove": "Remove",
        "paidOn": "{amount} · paid {date}",
        "due": "{amount} · open",
        "unlock": "Unlock accommodation",
        "payBy": "Pay by {date}"
      },
      "next": {
        "invite": "Invite friends",
        "lockAccommodation": "Lock accommodation",
        "openCrewGroup": "Open House group",
        "openCrewChat": "Open House chat",
        "finish": "Finish your House",
        "payNow": "Pay now"
      },
      "badges": {
        "occupancy": "{filled} of {total}",
        "booked": "Booked",
        "draft": "Draft",
        "closed": "Cancelled",
        "new": "{count} new"
      }
    },
    "requests": {
      "title": "Requests",
      "pendingCount": "{count} pending",
      "noneOpen": "No pending requests – share your House page to find your people.",
      "none": "No pending requests.",
      "earlier": "Earlier ({count})",
      "loginToMessage": "Log in to message {name}",
      "noPhoto": "No photo yet",
      "acceptedToast": "{name} joined the House 🎉",
      "waitlistedToast": "{name} is on the waitlist",
      "declinedToast": "Declined",
      "undo": "Undo",
      "notAFit": "Not a fit",
      "expiresIn": "Expires in {hours}h",
      "joinRequests": "Requests",
      "waitlist": "Waitlist",
      "accept": "Accept",
      "decline": "Decline",
      "reply": "Reply",
      "knownThrough": "{others, plural, =0 {Lived with {name}, who you know} other {Lived with {name} and # more you know}}",
      "message": "Message",
      "note": "Note"
    },
    "crew": {
      "title": "In this House",
      "waitlist": "Waitlist",
      "waitlistAsked": "asked {date}",
      "waitlistOffered": "Spot offered · until {time}",
      "waitlistRemove": "Remove from waitlist",
      "waitlistRemoveLabel": "More for {name}",
      "waitlistRemovedToast": "{name} is off the waitlist",
      "you": "{name} (you)",
      "opened": "opened {date}",
      "joined": "joined {date}",
      "host": "Host",
      "remove": "Remove from House",
      "upTo": "Up to {count, plural, one {# person} other {# people}}",
      "eachPays": "each pays <b>{price}</b>",
      "removeTitle": "Remove {name}?",
      "removeDescription": "Their spot opens up again and they lose access to the House chat. The House sees a short note in the chat.",
      "removeConfirm": "Remove",
      "removeReason": "Why? (optional – {name} sees it)",
      "removeReasonPlaceholder": "A sentence is enough",
      "removedToast": "{name} is no longer in the House",
      "invitedNote": "Invited · holds a spot",
      "removeLabel": "Remove {name} from the House",
      "message": "Message",
      "messageLabel": "Options for {name}"
    },
    "accommodation": {
      "title": "Accommodation",
      "total": "Total",
      "perPersonShares": "Per person · {count, plural, one {# share} other {# shares}}",
      "paid": "Paid",
      "paidOf": "{paid} of {total}",
      "suggested": "Suggested in the House chat – lock the one you all agree on.",
      "lockThis": "Lock this",
      "lockAccommodation": "Lock accommodation",
      "noLinks": "No links in the House chat yet – paste Airbnb or Booking links there.",
      "openChat": "Open House chat"
    },
    "joined": {
      "waiting": "Request sent – waiting for {name}",
      "waitingForHost": "Request sent – waiting for the host"
    },
    "crewMenu": {
      "leftToast": "You left {title}",
      "manage": "Manage House",
      "edit": "Edit House",
      "close": "Cancel this House",
      "view": "View House",
      "leave": "Leave this House",
      "leaveTitle": "Leave this House?",
      "leaveDescription": "Your spot opens up again and you'll lose access to the House chat. You can ask to join again later.",
      "leaveConfirm": "Leave House",
      "leavePaidDescription": "You've paid and nobody is on the waitlist to take your spot – you won't get your share back. You lose access to the House chat.",
      "leaveWaitlistDescription": "Your spot goes to the next person on the waitlist. You get {amount} back – everything but the Simpulo fee ({fee}) – and lose access to the House chat.",
      "closeTitle": "Cancel this House?",
      "closeDescription": "It disappears from Explore and takes no new requests. Every paid share is refunded in full, and everyone in the House, on the waitlist or with an open request is told.",
      "closeConfirm": "Cancel House",
      "stopRequests": "Stop taking requests",
      "takeRequests": "Take requests again"
    },
    "lock": {
      "title": "Lock accommodation",
      "linkLabel": "Accommodation link",
      "linkPlaceholder": "https://airbnb.com/rooms/…",
      "linkInvalid": "Paste the full link, starting with https://",
      "totalLabel": "Total price for the whole place",
      "totalPlaceholder": "2400",
      "currency": "Currency",
      "currencyHint": "Use the currency of the account that pays for the accommodation.",
      "splitBetween": "Split between",
      "occupancy": "{people} in now · {spots} in total",
      "payBy": "Pay by",
      "payByHint": "Everyone pays their share by this date.",
      "preview": "{total} ÷ {spots} = {perPerson} per person · guests pay {withFee} incl. fee",
      "previewEmpty": "Enter the total to see each share.",
      "hint": "Everyone in the House sees this price and gets a payment request in the House chat.",
      "submit": "Lock accommodation",
      "locking": "Locking accommodation",
      "lockedToast": "Accommodation locked – the House can pay now"
    },
    "payments": {
      "title": "Payments",
      "payBy": "Pay by {date}",
      "progress": "{paid} of {count} paid · {paidAmount} of {totalAmount}",
      "colName": "Name",
      "colShare": "Share",
      "colStatus": "Status",
      "colPaid": "Paid on",
      "you": "{name} (you)",
      "remind": "Remind",
      "remindFor": "Remind {name}",
      "remindedToast": "Reminder sent to {name}",
      "payNow": "Pay now",
      "fundsTitle": "Funds released · {amount} ready",
      "fundsText": "Everyone has paid. Book the place, then upload the booking confirmation so the House can see it's booked.",
      "upload": "Upload booking confirmation",
      "uploading": "Uploading booking confirmation",
      "uploadWithin": `Upload within ${H.booking} hours`,
      "timeLeft": "{hours}h {minutes}m left",
      "overdue": `The ${H.booking} hours are up – please upload it now`,
      "confirmedTitle": "Booking confirmed · {date}",
      "confirmedText": "Everyone sees the House as booked.",
      "viewProof": "View booking confirmation",
      "confirmedToast": "Booking confirmed",
      "booked": "Booked",
      "unlock": "Unlock",
      "unlocking": "Unlocking",
      "unlockTitle": "Unlock the accommodation?",
      "unlockDescription": "The link and price are cleared and the House decides together again. Paid shares are refunded in full and open payments are cancelled. Everyone sees a note in the House chat.",
      "unlockConfirm": "Unlock and refund",
      "unlockedToast": "Accommodation unlocked – paid shares are refunded",
      "devReset": "Reset payments (dev)",
      "waitingForCrew": "Paying starts when the crew is complete",
      "dueOn": "due {date}",
      "lock": "Choose the place",
      "resetToast": "Payments reset"
    },
    "openAnother": "Open another House",
    "saved": {
      "title": "Saved houses",
      "description": "Houses you tapped the heart on – only you see this list.",
      "emptyTitle": "No saved Houses yet",
      "emptyDescription": "Tap the heart on any House to keep it here.",
      "explore": "Explore Houses",
      "loginTitle": "Log in to see your saved Houses",
      "loginDescription": "Tap the heart on any House to keep it here."
    },
    "hostAlerts": {
      "title": "Host alerts",
      "description": "You get an email (and a push, if the app is installed) when these hosts open a House.",
      "notifyMe": "Notify me",
      "notifyLabel": "Notify me when {name} opens a House"
    },
    "invite": {
      "title": "{name} invited you",
      "text": "You lived together before. Your spot is held until you answer.",
      "accept": "Accept invite",
      "decline": "Decline",
      "acceptedToast": "You're in – {title}",
      "declinedToast": "Invite declined – your spot is free again"
    },
    "pastEmpty": {
      "title": "No past Houses yet",
      "description": "Houses you lived in show up here once they end – with everyone in them and the chat."
    },
    "past": {
      "badge": "Completed",
      "viewPage": "View House page",
      "you": "You"
    },
    "sections": {
      "drafts": "Drafts",
      "hosting": "Hosting",
      "joined": "Joined",
      "past": "Past",
      "toggle": "{label}, {count} Houses"
    },
    "invites": {
      "description": `Invite someone by name or email. Their link reserves a spot for ${H.invite} hours.`,
      "invite": "Invite friends",
      "full": "Every spot is taken or reserved – free one up to invite someone.",
      "until": "Reserved until {date}",
      "emailed": "Emailed to {email}",
      "linkOnly": "Link",
      "resend": "Resend",
      "cancel": "Cancel",
      "resentEmail": `Sent again to {email} – reserved for another ${H.invite} hours`,
      "resentLink": `Link copied – reserved for another ${H.invite} hours`,
      "cancelled": "Invite cancelled – the spot is free again",
      "cancelLabel": "Cancel the invite for {name}",
      "resendLabel": "Resend the invite for {name}",
      "someone": "Someone",
      "sheet": {
        "title": "Invite to {title}",
        "label": "Name or email",
        "placeholder": "Mara or mara@example.com",
        "helper": "With an email, we send the invite for you. With a name, you get a link to send yourself.",
        "create": "Create invite",
        "invalidEmail": "Check the email address.",
        "empty": "Add a name or an email.",
        "sentTitle": "Invite sent",
        "sentText": "{email} gets an email with the link. Their spot is reserved until {date}.",
        "linkTitle": "Invite link ready",
        "linkText": "Send this link to {name}. Their spot is reserved until {date}.",
        "copy": "Copy link",
        "copied": "Link copied",
        "done": "Done",
        "failed": "No spot left to reserve."
      }
    },
    "rows": {
      "savedPeople": "Saved people"
    },
    "places": {
      "title": "Your places",
      "meta": "{kind} · {rooms, plural, one {# free room} other {# free rooms}} · {rent} a month",
      "rental": "Rented {range}",
      "openWindow": "Open a window",
      "openAgain": "Open again",
      "openAgainLabel": "Open {title} again",
      "calendar": "Windows in {name}",
      "window": "{title}: {dates}",
      "today": "Today",
      "noWindows": "No windows yet – open the first one."
    }
  },
  "messages": {
    "system": {
      "joined": "{name} joined the House",
      "left": "{name} left the House",
      "removed": "{name} is no longer in the House",
      "closed": "{name} cancelled this House – every paid share is refunded",
      "crewComplete": "House complete 🎉",
      "bookingConfirmed": "Host confirmed the booking",
      "addressShared": "The address is on the House page now",
      "paymentLapsed": "{name} didn't pay in time – the spot is open again",
      "refund": "{count, plural, one {A paid share was refunded} other {# paid shares were refunded}}",
      "accommodationDecided": "The place is decided – see the House page",
      "datesDecided": "The dates are set – starts {date}",
      "searchHouseOpened": "A House opened in {place}: {title}. You get {hours}h before everyone else.",
      "youWereRemoved": "{host} removed you from {title}. Anything you paid is refunded.",
      "yourPaymentLapsed": `The ${H.payment} hours to pay for {title} ran out, so your spot is open again.`,
      "youWereRemovedModeration": "Simpulo removed you from {title} after a report. Anything you paid is refunded."
    },
    "notify": {
      "newRequest": "New request from {name} for {title}",
      "accepted": "You're in – {title}",
      "declined": "{title}: this one didn't work out – here are similar Houses",
      "requestExpired": "{title}: this one didn't work out – here are similar Houses",
      "deadlineHostReminder": "{count, plural, one {{name} is waiting for your answer · {title}} other {# requests are waiting for your answer}}",
      "deadlineHostLastDay": "{count, plural, one {Last day to answer {name} · {title}} other {Last day to answer # requests}}",
      "deadlineRequestExpired": "{count, plural, one {{title}: this one didn't work out – here are similar Houses} other {# requests didn't work out – here are similar Houses}}",
      "deadlinePayReminder": "{count, plural, one {{title}: pay your share within {hours} hours to keep your spot} other {Pay # shares within {hours} hours to keep your spots}}",
      "deadlinePayLastHours": "{count, plural, one {{title}: {hours} hours left to pay your share} other {{hours} hours left to pay # shares}}",
      "deadlineYourPaymentLapsed": "{count, plural, one {{title}: the time to pay ran out, so your spot is open again} other {The time to pay ran out for # Houses – your spots are open again}}",
      "guestRemindedHost": "{name} is waiting for your answer · {title}",
      "hostRemindedGuest": "{host} reminds you to pay your share · {title}",
      "reportActioned": "We looked at your report and took action. Thank you for telling us.",
      "reportUnfounded": "We looked at your report and didn't find a breach of the rules. Thank you for telling us.",
      "accountWarning": "A note from Simpulo: we got a report about you. See why – and appeal if you disagree.",
      "removedModeration": "Simpulo removed you from {title} after a report. Anything you paid is refunded. See why – and appeal if you disagree.",
      "accountSuspended": "Your Simpulo account is suspended after a report. See why – and appeal if you disagree.",
      "houseTakenDown": "Simpulo took {title} down after a report. See why – and appeal if you disagree.",
      "photoTakenDown": "Simpulo removed a photo from the album of {title} after a report. See why – and appeal if you disagree.",
      "reportReceived": "We got your report and will look at it. You'll hear from us once we've decided.",
      "appealUpheld": "We looked at your appeal again. Our decision stays – the reasons are on the page.",
      "appealReversed": "We looked at your appeal again and reversed our decision. Sorry for the trouble.",
      "friendSpotsExpired": "{count, plural, one {{title}: the spots you saved for friends are free again} other {The spots you saved for friends in # Houses are free again}}",
      "friendSpotExpiredForYou": "{count, plural, one {{name}'s spot for you in {title} ran out – you can still ask to join} other {# spots saved for you ran out – you can still ask to join}}",
      "requestSent": `Your request for {title} is on its way – {host} has ${H.request} hours to answer.`,
      "termsUpdated": "We've updated our Terms – have a look before you go on.",
      "accountPaused": "Your account is paused – your profile is private and your Houses are off Explore.",
      "waitlistOpen": "Simpulo is open – Houses are waiting where you wanted to go.",
      "removedByHost": "{host} took you out of {title}. Anything you paid comes back – here are similar Houses.",
      "removedByHostReason": "{host} took you out of {title}: “{reason}” Anything you paid comes back – here are similar Houses.",
      "locked": "{title}: accommodation locked – {price} each, you pay once the crew is complete",
      "paymentDue": `{title}: the crew is complete. Your share is due within ${H.payment} hours`,
      "paymentLapsed": "{title}: {name} didn't pay in time, so their spot is open again",
      "bookingRefunded": "{title}: the booking wasn't confirmed in time, so every share was refunded",
      "bookingConfirmed": "{title} is booked – the address is on the House page",
      "emailSentToast": "📧 Email sent: {text}",
      "pushToast": "🔔 Push: {text}",
      "logPush": "Push to {name}: {text}",
      "logEmail": "Email to {name}: {text}",
      "logEmailQueued": "Email to {name} if unread in an hour: {text}",
      "logEmailDigest": "Collected email to {name}: {text}",
      "logEmailDaily": "Into today's bundle for {name}: {text}",
      "logEmailWeekly": "Weekly summary for {name} +1: {text}",
      "paid": "{title}: {name} paid their share",
      "left": "{name} left {title}",
      "waitlistRequest": "{name} asked to join the waitlist for {title}",
      "requestWithdrawn": "{name} withdrew their request for {title}",
      "houseCancelled": "{title} was cancelled by the host – every paid share is refunded",
      "waitlistAccepted": "{title}: you're on the waitlist – you move up automatically if someone drops out",
      "waitlistRemoved": "{title}: you're no longer on the waitlist",
      "waitlistOffer": `{title}: a spot opened for you – take it within ${H.waitlistOffer} hours`,
      "waitlistMovedUp": `{title}: a spot opened – {name} from the waitlist has ${H.waitlistOffer} hours to take it`,
      "waitlistOfferExpired": "{title}: {name} didn't take the spot in time – it goes to the next one on the waitlist",
      "waitlistTookSpot": "{title}: {name} took the free spot from the waitlist",
      "leftRefund": "{title}: your spot goes to the waitlist – {amount} is on its way back (everything but the Simpulo fee)",
      "reminderPayDue": "{title}: your share ({price}) is due by tomorrow",
      "reminderPayToday": "{title}: last hours to pay your share ({price})",
      "reminderBookingUpload": "{title}: everyone paid – upload the booking confirmation within {hours}h",
      "reminderPendingRequests": "{title}: {count, plural, one {# request is} other {# requests are}} waiting for your answer",
      "reminderArrival": "{title}: {days, plural, one {# day} other {# days}} to go – arrival {date}",
      "reminderSavedSoon": "{title} starts {date} – still taking requests",
      "hostOpened": "{name} opened a House: {title}",
      "crewFull": "{title}: the House is complete",
      "newMessage": "{name} in {title}: {preview}",
      "systemWelcome": "Welcome to Simpulo – here's how Houses work",
      "systemVerify": "Verify your ID to get the badge hosts look for",
      "systemPhoto": "Add a face photo – hosts accept people they can see",
      "crewInvite": "{name} is opening a new House – you're invited: {title}",
      "inviteAccepted": "{name} accepted your invite to {title}",
      "doItAgain": "{title} is over – your House and the chat are still there",
      "houseInvite": "{name} invited you to {title}",
      "searchOpened": "A House opened in {place}: {title}. You get {hours}h before everyone else.",
      "supportReply": "Simpulo replied to your message"
    },
    "inbox": {
      "title": "Messages",
      "loginTitle": "Log in to see your messages",
      "loginDescription": "House chats and direct messages show up here.",
      "unknown": "Unknown",
      "emptyTitle": "No chats yet",
      "emptyDescription": "Once you host a House or get accepted, your House chat shows up here.",
      "explore": "Explore Houses",
      "searchPlaceholder": "Search chats",
      "segmentLabel": "Show",
      "segmentChats": "Chats",
      "segmentUpdates": "Updates",
      "searchLabel": "Search chats by House or name",
      "crews": "Houses",
      "direct": "Direct",
      "noMatch": "No chats match “{query}”.",
      "noMessages": "No messages yet",
      "you": "You",
      "preview": "{author}: {text}",
      "unread": "Unread",
      "photos": "📷 {count, plural, one {Photo} other {# photos}}",
      "file": "📎 {name}",
      "attachment": "File",
      "past": "Past",
      "updates": "Simpulo",
      "about": "About {name}",
      "housesEmpty": "No chats yet.",
      "houseLine": "{dates} · {filled} of {total} in",
      "filterLabel": "Show",
      "filterAll": "All",
      "filterUnread": "Unread",
      "unreadEmpty": "All read."
    },
    "thread": {
      "loginTitle": "Log in to see this chat",
      "crewOnly": "This chat is for the House only",
      "crewOnlyDescription": "You'll get access once the host accepts your request.",
      "notFound": "Chat not found",
      "viewHouse": "View House",
      "backToMessages": "Back to messages",
      "sayHiCrew": "Say hi – the House is here.",
      "sayHiDirect": "Say hi – {name}'s here.",
      "sayHiDirectUnknown": "Say hi – they're here.",
      "composerCrew": "Message the House",
      "composerDirect": "Message {name}",
      "attach": "Attach",
      "emoji": "Emoji",
      "removeAttachment": "Remove {name}",
      "removePreview": "Remove link preview",
      "replyingTo": "Replying to {name}",
      "cancelReply": "Cancel reply",
      "messageLabel": "Message",
      "send": "Send",
      "whosIn": "Who's in",
      "closed": "This House is closed – it's no longer listed and takes no new requests.",
      "unknown": "Unknown",
      "about": "{title} · {dates}",
      "today": "Today",
      "yesterday": "Yesterday",
      "newMessages": "New messages",
      "typing": "{name} is typing…",
      "reply": "Reply",
      "react": "React",
      "reactWith": "React with {emoji}",
      "reactionLabel": "{emoji} · {count, plural, one {# reaction} other {# reactions}}",
      "photo": "📷 Photo",
      "file": "File",
      "openPhoto": "Open photo {index} of {count}",
      "photoAlt": "Photo from the chat",
      "whosInLabel": "Who's in – {count, plural, one {# person} other {# people}}",
      "memberCount": "{count, plural, one {# person} other {# people}} in this House",
      "host": "Host",
      "you": "You",
      "crewMeta": "{dates} · {filled} of {total} in",
      "openGroupChat": "Open group chat",
      "contactsHidden": "Contact details are shared once the crew is complete.",
      "youreIn": "You're in – continue in the House chat",
      "theyreIn": "{name} is in – continue in the House chat",
      "openHouseChat": "Open House chat",
      "read": "Read",
      "sent": "Sent",
      "aboutShort": "about {name}",
      "viewRequest": "View request"
    },
    "chatTheme": {
      "menu": "Chat background",
      "title": "Chat background",
      "forThisChat": "For this chat",
      "sameAsAll": "Same as all chats",
      "allChats": "Default for all chats",
      "allChatsHint": "Your choice – only you see it, on every device.",
      "names": {
        "house": "House",
        "cream": "Cream",
        "stone": "Stone",
        "mist": "Mist",
        "sand": "Sand",
        "night": "Night"
      },
      "hint": "New: pick your chat background",
      "hintClose": "Got it"
    }
  },
  "profile": {
    "loginTitle": "Log in to see your profile",
    "notFound": "Profile not found",
    "explore": "Explore Houses",
    "basedIn": "based in {city}",
    "editProfile": "Edit profile",
    "message": "Message",
    "linkCopied": "Profile link copied",
    "photos": "Photos",
    "openPhoto": "Open photo {index}",
    "addPhoto": "Add photo",
    "openAnother": "Open another House",
    "hosting": "Hosting",
    "joined": "Joined",
    "past": "Past",
    "emptyHostingMe": "You're not hosting a House right now.",
    "emptyHosting": "{name} isn't hosting right now.",
    "emptyJoinedMe": "No upcoming Houses joined yet.",
    "emptyJoined": "No upcoming Houses joined.",
    "pastStatus": {
      "completed": "Completed",
      "closed": "Closed",
      "ended": "Ended"
    },
    "share": "Share profile",
    "edit": {
      "loginTitle": "Log in to edit your profile",
      "title": "Edit profile",
      "photos": "Photos",
      "photosHint": "1–{max} photos. The first one is your face photo – drag to reorder, × to remove.",
      "about": "About you",
      "name": "First name",
      "birthDate": "Date of birth",
      "birthDateHelper": "Only your age is shown – never the date.",
      "birthDateAge": "Shown as {age} – only if “Show my age” is on in Settings › Privacy.",
      "day": "Day",
      "month": "Month",
      "year": "Year",
      "country": "Country",
      "basedIn": "Based in",
      "languages": "Languages",
      "bio": "Bio",
      "bioCounter": "{count} / {max}",
      "publicLinks": "Public links",
      "cancel": "Cancel",
      "save": "Save",
      "saved": "Profile saved",
      "errors": {
        "photo": "Add at least one photo – the first one shows your face.",
        "name": "Add your first name.",
        "birthDate": "Add your full date of birth.",
        "underAge": "You need to be 18 or older to use Simpulo.",
        "country": "Add the country you're from.",
        "links": "Check your links.",
        "website": "Enter a full web address, like https://yoursite.com.",
        "handle": "A handle uses letters, numbers, dots, _ or - only."
      },
      "basedInHelper": "The city you live in right now.",
      "languagesHelper": "Type a language and press Enter. × removes it.",
      "bioHelper": "What would your future housemates want to know?",
      "linksHelper": "Up to {max} – type your handle, or the full address for a website. Contact happens in Messages.",
      "addLink": "Add link",
      "removeLink": "Remove {platform}",
      "viewProfile": "View profile",
      "statusSaved": "Saved",
      "statusSaving": "Saving…",
      "statusInvalid": "Not saved – check the marked field",
      "languagesAndBio": "Languages & bio",
      "shownAs": "Shown as {line}",
      "basedInLine": "based in {city}",
      "previewProfile": "Profile",
      "previewHouse": "On a House",
      "howOthersSeeYou": "How others see you",
      "photoOnHouses": "This photo appears on your Houses.",
      "previewButton": "Preview",
      "unsaved": "Unsaved changes",
      "noChanges": "No changes yet",
      "discardTitle": "Discard your changes?",
      "discardDescription": "You have unsaved changes on your profile. If you leave now, they're lost.",
      "discardConfirm": "Discard",
      "handlePlaceholder": "handle",
      "linksFull": "That’s {max} links – remove one to add another.",
      "countryPlaceholder": "Start typing a country",
      "basedInPlaceholder": "Start typing a city",
      "noCountry": "No country matches – check the spelling.",
      "noPlace": "Not in the list – it's kept as you type it.",
      "vibe": "Your vibe",
      "vibeHelper": "How you live in a House – shown on your profile.",
      "sections": {
        "photos": {
          "title": "Photos",
          "summary": "{count, plural, one {# photo} other {# photos}}",
          "empty": "Add a face photo"
        },
        "basics": {
          "title": "Basics",
          "empty": "Name, birthday, country"
        },
        "vibe": {
          "title": "Vibe",
          "summary": "Set",
          "empty": "How you live in a House"
        },
        "about": {
          "title": "About",
          "empty": "A few words and your languages"
        },
        "links": {
          "title": "Links",
          "empty": "No links yet"
        },
        "verify": {
          "title": "Verify ID",
          "done": "Verified",
          "empty": "Not verified"
        },
        "inFor": {
          "title": "I'm in for",
          "empty": "Where you'd go next"
        }
      },
      "progressOf": "{done} of {total}",
      "progressHint": "Hosts see this first",
      "progressComplete": "Profile complete",
      "statusComplete": "Done",
      "statusMissing": "Required",
      "statusOptional": "Optional",
      "done": "Done",
      "next": "Next",
      "seeProfile": "See your profile",
      "setupStep": "Step {step} of {total} – skip anything, finish it later in Edit profile",
      "setupIntro": "A few steps – skip anything, finish it later in Edit profile",
      "setupPhotos": "{min}–{max} photos: your face first, then what you love doing.",
      "skip": "Skip",
      "finish": "Finish",
      "shownAsAge": "Shown as {age}",
      "birthPlaceholder": "DD / MM / YYYY",
      "verifyDone": "Verified",
      "verifyChecking": "Checking your ID …",
      "verifyNot": "Not verified yet",
      "verifyHost": "Required before payouts.",
      "verifyGuest": "Optional – hosts accept verified guests more often.",
      "verifyAction": "Verify",
      "previewInCrew": "In a crew",
      "previewInRequests": "In a host's requests",
      "previewRequestMessage": "Hi! This House sounds great – I'd love to join.",
      "community": {
        "question": "How much community do you need?",
        "options": {
          "1": "A little",
          "2": "Some",
          "3": "A lot"
        },
        "hint": "We show you Houses that fit a little higher up – you still see them all."
      },
      "captionLabel": "Line for photo {number}",
      "captionPlaceholder": "A few words about this photo",
      "vibeQuestions": {
        "hint": "Four quick questions – skip any you like. Hosts see how you'd live together.",
        "rhythm": "When are you at your best?",
        "social": "How social are you at home?",
        "energy": "How do you spend your days?",
        "tidy": "How tidy are you?"
      },
      "previewAsOthers": "Preview as others see it"
    },
    "settings": "Settings",
    "crews": {
      "title": "Houses",
      "counts": "{houses, plural, one {# house} other {# houses}} · {people, plural, one {# person} other {# people}}",
      "inCommon": "Houses you lived in together",
      "peopleIn": "People in {title}",
      "people": "People",
      "livedWith": "Lived with",
      "onlyYou": "Only you see this"
    },
    "openPhotos": "Open photos",
    "hostedCount": "{count} hosted",
    "joinedCount": "{count} joined",
    "more": "more",
    "less": "less",
    "tabs": {
      "label": "Profile sections",
      "houses": "Houses",
      "photos": "Photos",
      "livedWith": "Lived with"
    },
    "profileBadge": "Profile",
    "profilePhotoChanged": "Profile photo updated",
    "dragHint": "Drag to reorder – the first photo is your profile photo.",
    "noPhotos": "{name} hasn't added photos yet.",
    "openWith": "Open a House with {name}",
    "livedWithEmpty": "Once a House is over, the people you lived with show up here.",
    "stats": "<hostedLink><b>{hosted}</b> hosted</hostedLink> · <joinedLink><b>{joined}</b> joined</joinedLink>",
    "view": {
      "private": "This profile is private",
      "previewAsOthers": "Preview as others see it",
      "shareProfile": "Share profile",
      "options": "Profile options",
      "speaks": "Speaks {languages}",
      "moreLinks": "+{count}",
      "photos": "Photos",
      "addPhotos": "Add photos",
      "trustVerifiedLabel": "Identity",
      "trustVerified": "Verified",
      "trustHosted": "{count, plural, one {House hosted} other {Houses hosted}}",
      "trustLivedIn": "{count, plural, one {House lived in} other {Houses lived in}}",
      "trustPeople": "{count, plural, one {Person lived with} other {People lived with}}",
      "hostingNow": "Hosting now",
      "about": "About",
      "aboutAdd": "Add a few words about you",
      "aboutEmpty": "Nothing here yet.",
      "spotsLeft": "{count, plural, one {# spot left} other {# spots left}}",
      "openAnother": "Open another House",
      "noOpenHouse": "No open House right now",
      "openHouse": "Open a House →",
      "livedWith": "Lived with",
      "livedInSummary": "Lived in {count, plural, one {# House} other {# Houses}} · {places}",
      "seePast": "See your past Houses",
      "toConfirm": "Did you live with them? They appear on your profile once you've both confirmed.",
      "confirm": "Confirm",
      "waitingForThem": "{count, plural, one {# person hasn't} other {# people haven't}} confirmed yet",
      "upcoming": "Upcoming",
      "upcomingOwnHint": "Only you and your crews can see this",
      "upcomingCrewHint": "Only people in the same crew can see this",
      "upcomingEmpty": "No upcoming Houses as a guest.",
      "bioMore": "More",
      "memberSince": "Member since",
      "noSharedHouses": "No shared Houses yet",
      "livedInTitle": "Lived in {count, plural, one {# House} other {# Houses}}",
      "openHouseAction": "Open a House",
      "upcomingLine": "Upcoming: {count, plural, one {# House} other {# Houses}} →",
      "confirmCount": "{count, plural, one {# housemate to confirm} other {# housemates to confirm}}",
      "confirmTitle": "Did you live together?",
      "more": "+{count}",
      "livedWithLine": "Lived with {count} · {again} would live again",
      "livedInLine": "Lived in <b>{houses}</b> {houses, plural, one {House} other {Houses}}",
      "places": "Places",
      "confirmLink": "{count, plural, one {# housemate to confirm} other {# housemates to confirm}} →",
      "newHere": "New to Simpulo · joined {date}",
      "newHereLine": "Every host starts somewhere.",
      "prevPhoto": "Previous photo",
      "nextPhoto": "Next photo",
      "showPhoto": "Photo {number} of {count}",
      "prevHouse": "Previous House",
      "nextHouse": "Next House",
      "bringForward": "Show {title}",
      "chipHouses": "{count, plural, one {# House} other {# Houses}}",
      "chipLivedWith": "{count} lived with",
      "chipFast": "Responds fast",
      "chipSince": "Since {year}",
      "inCommon": "In common",
      "mutual": "{name} lived with you both",
      "speaksOne": "Speaks {language}",
      "bothInto": "Both into {interest}",
      "seeHouse": "See {name}",
      "inviteToHouse": "Invite to a House",
      "invitedToast": `{name} is invited to {house} – the spot is held for ${H.invite}h`,
      "rowVibe": "Vibe",
      "rowHostingNow": "Hosting now",
      "rowGoingTo": "Going to",
      "rowLivedWith": "Lived with",
      "rowPlaces": "Places",
      "vibeAdd": "Add your vibe",
      "notVerified": "ID not verified",
      "linksAdd": "Add your links",
      "languagesAdd": "Add your languages",
      "inForChip": "In for {place} · {months}",
      "save": "Save",
      "unsave": "Saved",
      "savedToast": "{name} saved – only you see this",
      "unsavedToast": "{name} removed from saved",
      "going": "Going",
      "rowAbout": "About",
      "vibeLabel": "Vibe",
      "showHouse": "Show House {number} of {count}",
      "bothSpeak": "You both speak {language}",
      "numHouses": "{count, plural, one {House} other {Houses}}",
      "numLivedWith": "lived with",
      "numSince": "since",
      "progress": "{done} of {total}",
      "nowLabel": "Now",
      "dayOf": "Day {day} of {days}",
      "inDays": "{count, plural, =0 {today} one {in # day} other {in # days}}",
      "nextIn": "Next: {name} · {in}",
      "hostingIn": "Hosting · {in}",
      "goingIn": "Going · {in}",
      "openToHouses": "Open to Houses",
      "noVibe": "No vibe yet",
      "findMe": "Find me",
      "inForLabel": "In for",
      "livedWithLabel": "Lived with {count}",
      "peopleEmpty": "No Houses together yet",
      "placesLabel": "Places",
      "readMore": "more",
      "newOnSimpulo": "New on Simpulo",
      "nextShort": "Next · {in}",
      "hostingGoing": "Hosting & going",
      "hostingOn": "Hosting · {date}",
      "goingOn": "Going · {date}",
      "moreHouses": "+{count} more",
      "manageInYourHouses": "Manage in Your houses →",
      "quick": {
        "saved": "Saved",
        "savedCount": "{count, plural, one {# house} other {# houses}}",
        "people": "Your people",
        "peopleCount": "{count, plural, =0 {Nobody yet} one {# person} other {# people}}",
        "settings": "Settings",
        "getApp": "Get the app",
        "getAppSub": "On your phone",
        "notifications": "Notifications",
        "on": "On",
        "off": "Off",
        "peopleEmpty": "After a House, everyone you both confirmed living with shows up here.",
        "peopleAll": "Open Your people",
        "admin": "Admin",
        "adminSub": "Dashboard",
        "help": "Help",
        "helpSub": "Questions & safety",
        "idea": "Share an idea",
        "ideaSub": "Tell us what to build",
        "getAppScan": "Scan with your phone to install Simpulo.",
        "getAppOpen": "Open install page",
        "getAppPrint": "Print cards",
        "getAppPrintText": "Cards with this code to leave in your House."
      },
      "livedWithCount": "{count, plural, one {# housemate} other {# housemates}}",
      "interestsLabel": "Interests",
      "basicNumbers": "{houses, plural, one {# House} other {# Houses}} · lived with {people}",
      "basicNote": "You see the full profile once you're in the same House.",
      "privateTitle": "A Simpulo member",
      "hostsHouses": "Hosts {count, plural, one {# House} other {# Houses}}",
      "nowIn": "now in {city}",
      "editPart": "Edit {part}",
      "partBasics": "name, age and place",
      "partAbout": "short text",
      "partLinks": "links",
      "inviteFriends": "Invite friends",
      "inviteFriendsText": "Come find your people on Simpulo.",
      "inviteFriendsCopied": "Link copied",
      "stripPreview": "How others see your profile",
      "shareHostPage": "Share host page",
      "livedTogether": "You lived together in {house}",
      "moreInYourHouses": "{count} more in Your houses →",
      "yourPeople": "Your people",
      "livedWithHead": "People",
      "seeAllPeople": "See all {count} →",
      "inForMark": "In for · {when}",
      "placesAdd": "Add where you're in for",
      "bothVibe": {
        "rhythm": {
          "1": "You're both early birds",
          "3": "You're both night owls"
        },
        "social": {
          "1": "You both like it quiet",
          "3": "You're both social"
        },
        "energy": {
          "1": "You're both active",
          "3": "You're both chill"
        },
        "tidy": {
          "1": "You're both tidy",
          "3": "You're both relaxed"
        }
      },
      "moreHousesLink": "{count} more →",
      "vibeAddQuick": "Add your vibe – 15 seconds",
      "bothKnowOne": "You both know {name}",
      "bothKnowMore": "You both know {name} and {count, plural, one {# other} other {# others}}",
      "nowInHouse": "Now in {place}",
      "barHouses": "{count, plural, one {House} other {Houses}}",
      "barLivedWith": "Lived with",
      "editWithProgress": "Edit profile · {done} of {total}",
      "numbersLabel": "Numbers",
      "listLabel": "Your account",
      "savedTitle": "Saved",
      "livedWithRow": "Lived with",
      "friendsRow": "Friends",
      "seeAllShort": "See all →",
      "friendsEmpty": "Invite friends to connect →",
      "bothLivedOne": "You both lived with {name}",
      "bothLivedTwo": "You both lived with {a} and {b}",
      "bothLivedMore": "You both lived with {name} and {count, plural, one {# other} other {# others}}",
      "peopleTotal": "{count, plural, one {# person} other {# people}} in their network",
      "confirmButton": "{count, plural, one {# housemate} other {# housemates}} to confirm",
      "message": "Message",
      "addLink": "+ Add link",
      "savedSeeAll": "See all →",
      "savedEmpty": "Houses you heart show up here.",
      "inviteFriendsLink": "+ Invite friends",
      "settingsLink": "Settings",
      "bothKnowTwo": "You both know {a} and {b}",
      "barCountries": "{count, plural, one {Country} other {Countries}}",
      "barHosted": "Hosted"
    },
    "loginToMessage": "Log in to message {name}",
    "vibe": {
      "rhythm": {
        "1": "Early bird",
        "2": "In between",
        "3": "Night owl",
        "scale": "Early bird ↔ Night owl"
      },
      "social": {
        "1": "Quiet",
        "2": "Balanced",
        "3": "Social",
        "scale": "Quiet ↔ Social"
      },
      "energy": {
        "1": "Active",
        "2": "In between",
        "3": "Chill",
        "scale": "Active ↔ Chill"
      },
      "tidy": {
        "1": "Tidy",
        "2": "Fairly tidy",
        "3": "Relaxed",
        "scale": "Tidy ↔ Relaxed"
      }
    }
  },
  "settings": {
    "ui": {
      "sidebarTitle": "Settings",
      "profileSub": "Profile & photos",
      "back": "Settings",
      "saved": "Saved",
      "nav": {
        "account": "Account",
        "payments": "Payments & payouts",
        "notifications": "Notifications",
        "privacy": "Privacy & safety",
        "general": "General",
        "chats": "Chats",
        "appearance": "Appearance",
        "language": "Language"
      },
      "account": {
        "groupSignIn": "Sign-in",
        "groupDevices": "Devices",
        "thisDeviceSub": "You're logged in here",
        "now": "Now",
        "logOutConfirmTitle": "Log out?",
        "logOutConfirmText": "You'll be logged out on this device. Your account and Houses stay as they are.",
        "logOutAllConfirmTitle": "Log out of all devices?",
        "logOutAllConfirmText": "Every phone, tablet and computer you're logged in on will be logged out – this one too.",
        "logOutAllConfirm": "Log out everywhere"
      },
      "data": {
        "title": "Your data",
        "download": "Download your data",
        "downloadSub": "Your profile, Houses, bookings, your messages and agreements – one file, readable and as data.",
        "request": "Request",
        "preparing": "Ready in a few minutes – we'll email you a link too.",
        "preparingShort": "Preparing…",
        "ready": "Ready – a ZIP with data.json and a readable overview.",
        "downloadButton": "Download",
        "pause": "Pause account",
        "pauseButton": "Pause",
        "resume": "Resume",
        "pauseSub": "Your profile and the Houses you host are hidden. Your bookings stay. Nothing is deleted – resume any time.",
        "pausedSub": "Paused since {date} – your profile and the Houses you host are hidden.",
        "pauseConfirmTitle": "Pause your account?",
        "pauseConfirmText": "Others can't see your profile, and the Houses you host disappear from Explore. Houses you're in stay as they are – your crew, the chat, your payments. Nothing is deleted, and you can resume any time.",
        "pauseConfirm": "Pause account",
        "paused": "Account paused",
        "resumed": "Welcome back – your account is visible again",
        "delete": "Delete account",
        "deleteSub": "For good – your profile, Houses and messages."
      },
      "payments": {
        "groupPaying": "Paying",
        "groupGettingPaid": "Getting paid",
        "groupHistory": "History",
        "card": "{brand} •••• {last4}",
        "default": "Default",
        "applePay": "Apple Pay",
        "add": "Add payment method",
        "payoutAccount": "Payout account",
        "payoutSub": "Stripe Connect",
        "bank": "Bank ••{last4}",
        "setUp": "Set up",
        "payoutPending": "Being checked",
        "payoutAction": "Needs one more thing",
        "identity": "Identity",
        "identitySub": "Optional – verified hosts get more requests. Simpulo never sees your ID.",
        "verified": "Verified",
        "verify": "Verify",
        "checking": "Checking…",
        "payoutHistory": "Payout history",
        "paymentHistory": "Payment history",
        "backTo": "Payments & payouts"
      },
      "notifications": {
        "alwaysTitle": "Bookings, payments & your Houses",
        "alwaysSub": "Always on – app, push and email.",
        "alwaysLocked": "Always on",
        "choices": {
          "both": "Push & email",
          "push": "Push only",
          "email": "Email only",
          "off": "Off",
          "emailOnly": "Email"
        },
        "notes": {
          "messages": "Email only if unread after an hour",
          "nearby": "Email as weekly summary",
          "news": "Always in the app"
        }
      },
      "privacy": {
        "nobody": "Nobody blocked",
        "download": "Download your data",
        "seeTitle": "What others see",
        "seeStrangers": "Others on Simpulo",
        "seeStrangersOn": "Your first name and photo in the crews you're in. Logged out, nobody sees them.",
        "seeStrangersOnAge": "Your first name, photo and age in the crews you're in. Logged out, nobody sees them.",
        "seeStrangersOff": "Nothing – you're only counted (“+1”).",
        "seePaused": "Nothing – your account is paused.",
        "seeCrew": "Your crew",
        "seeCrewText": "Your full profile – always, in the Houses you share.",
        "seeHosts": "Hosts you ask",
        "seeHostsText": "Your full profile with your request.",
        "seeHostsHidden": "Your profile without your photo until they accept.",
        "messages": "Who can message me",
        "messagesOptions": { "crew": "Crew only", "people": "Your people", "afterRequest": "Everyone after a request" },
        "messagesNote": {
          "crew": "Only people you share a House with can start a chat. Hosts you asked can still answer.",
          "people": "Your people and people you share a House with. Hosts you asked can still answer.",
          "afterRequest": "Anyone with a question about your House, and the hosts you asked to join."
        }
      },
      "deletePage": {
        "back": "Privacy & safety",
        "title": "Delete your account",
        "downloadFirst": "Want a copy first? <link>Download your data</link> – your profile, Houses, bookings and messages.",
        "blockedTitle": "Not yet – a House still depends on you",
        "blockedText": "Your crews count on you. Once these are over (or settled), you can delete your account.",
        "blocked": {
          "host": "You're hosting it. Cancel the House (everyone gets their money back) or wait until it's over.",
          "hostRunning": "You're hosting it right now. Wait until it's over.",
          "guest": "You've paid for it. Leave the House (the cancellation rules apply) or wait until it's over.",
          "guestRunning": "You're in it right now. Wait until it's over."
        },
        "what": "What happens",
        "points": {
          "profile": "Your profile, photos and links are removed.",
          "houses": "Houses you host are closed; people who paid get their money back under the cancellation rules.",
          "messages": "Your messages are removed from your chats.",
          "final": "This can't be undone – the account can't come back."
        },
        "pauseTitle": "Just need a break?",
        "pauseText": "Pause your account instead: your profile and Houses are hidden, nothing is deleted, and you can come back any time.",
        "pauseButton": "Pause account instead",
        "typeToConfirm": "Type {word} to confirm",
        "confirm": "Delete my account"
      },
      "general": {
        "currency": "Currency",
        "automaticValue": "Automatic · {label}",
        "automatic": "Automatic",
        "automaticSub": "From where you are – now {label}",
        "search": "Search currencies",
        "noMatch": "No currency found.",
        "language": "Language",
        "english": "English",
        "languageSoon": "More languages soon.",
        "backTo": "General",
        "yourPeople": "Your people",
        "getApp": "Get the app",
        "admin": "Admin",
        "help": "Get help",
        "idea": "Share an idea",
        "installHints": "App reminders",
        "installHintsText": "At most once a week – after paying, joining a crew or opening the group chat.",
        "legal": "Legal"
      },
      "appearance": {
        "system": "Match system",
        "light": "Light",
        "dark": "Dark",
        "hint": "Your first visit follows your device. A choice here stays on this device and your account.",
        "toDark": "Dark mode",
        "toLight": "Light mode",
        "label": "Appearance",
        "short": { "system": "System", "light": "Light", "dark": "Dark" }
      }
    },
    "loginTitle": "Log in to see your settings",
    "title": "Settings",
    "account": {
      "title": "Account",
      "email": "Email",
      "noEmail": "No email added",
      "signIn": "Sign-in method",
      "method": {
        "apple": "Apple",
        "google": "Google",
        "email": "Email link"
      },
      "logOut": "Log out",
      "change": "Change",
      "changeSoon": "Changing your email comes with the real login – soon.",
      "session": "This device",
      "passkey": "Passkey",
      "passkeyAdd": "Add",
      "passkeyOn": "On",
      "comesSoon": "This comes with the real login – soon.",
      "logOutAll": "Log out of all devices",
      "logOutAllSub": "Every phone, tablet and computer you're logged in on.",
      "loggedOutAll": "Logged out of all devices"
    },
    "notifications": {
      "title": "Notifications",
      "alwaysOn": "Bookings & payments – always on",
      "alwaysOnText": "Requests, answers, payments, bookings, cancellations and refunds have deadlines – they always reach you in the app, by push and by email.",
      "rows": {
        "messages": "Messages",
        "arc": "House tips",
        "people": "Your people",
        "nearby": "New Houses for your searches",
        "news": "Product news"
      },
      "notes": {
        "messages": "Chats with your crews and hosts. Email only if still unread after an hour – several in one.",
        "arc": "Simpulo's few cards along your House – in the House chat (in-app) and by email.",
        "people": "When your people plan, go or are nearby.",
        "nearby": "Email as a weekly summary.",
        "news": "What's new at Simpulo – off unless you want it."
      },
      "channels": {
        "email": "Email",
        "push": "Push",
        "inApp": "In-app",
        "none": "Not available"
      },
      "lockedTitle": "Requests & bookings",
      "lockedText": "Always on – in the app, by push and by email. Requests, payments, bookings and refunds have deadlines; missing one can cost you your spot or your money.",
      "quietTitle": "Quiet hours",
      "quiet": "Quiet hours",
      "quietText": "Push waits until they end – in your local time. Email and the app aren't held.",
      "quietFrom": "From",
      "quietTo": "To"
    },
    "preferences": {
      "title": "Preferences",
      "currency": "Currency",
      "currencyAuto": "Automatic (this browser's choice)",
      "currencyHelper": "Prices on cards are shown in it (≈); you always pay in the House's own currency.",
      "language": "Language",
      "english": "English",
      "moreSoon": "More languages soon."
    },
    "privacy": {
      "title": "Privacy & safety",
      "visibilityTitle": "Who sees you",
      "showOnHousePages": "Show me on House pages",
      "showOnHousePagesText": "Signed-in members can see your photo and first name in the crew. Your host and crew always see your full profile.",
      "showAge": "Show my age",
      "showAgeText": "Your age next to your name and on your profile. Off: nobody but you sees it.",
      "showPeople": "Show my people on my profile",
      "showPeopleText": "Others see who you lived with and your friends. Off: only the people you both know, and a number.",
      "visibilitySaved": "Saved",
      "description": "Blocked people can't see your Houses or message you.",
      "noneBlocked": "You haven't blocked anyone.",
      "unblock": "Unblock",
      "unblocked": "{name} is unblocked",
      "blockedTitle": "Blocked people",
      "dataTitle": "Your data",
      "dataLabel": "A copy of your profile, Houses, requests, payments and messages",
      "download": "Download your data",
      "downloaded": "Your data is downloading",
      "hidePhoto": "Hide my photo until I'm accepted",
      "hidePhotoText": "Hosts see your first name and what you wrote – your photo once they said yes.",
      "hostPage": "Show my host page in search engines",
      "hostPageText": "Your first name, photo, short profile and Houses can be found on Google. Guests are never shown.",
      "nearby": "Nearby",
      "nearbyText": "Your people see when you're in the same city or going there – from your Houses, only while you both have this on."
    },
    "danger": {
      "delete": "Delete account",
      "sheetTitle": "Delete your account?",
      "sheetDescription": "Your profile, Houses and messages will be removed for good.",
      "typeToConfirm": "Type {word} to confirm",
      "confirm": "Delete my account",
      "deleted": "Account deleted"
    },
    "nav": {
      "account": "Account",
      "profile": "Profile",
      "notifications": "Notifications",
      "payments": "Payments",
      "payouts": "Payouts",
      "verification": "Verification",
      "preferences": "Preferences",
      "privacy": "Privacy & safety"
    },
    "profile": {
      "title": "Profile",
      "edit": "Edit profile",
      "text": "Photos, bio, languages and your links."
    },
    "payments": {
      "methods": "Payment methods",
      "cardEnding": "•••• {last4} · expires {expires}",
      "wallet": "Set up on this device",
      "add": "Add payment method",
      "addSoon": "Coming with real payments – soon.",
      "history": "Payment history",
      "noHistory": "No payments yet.",
      "unknownHouse": "A House",
      "status": {
        "paid": "Paid",
        "refunded": "Refunded",
        "pending": "Pending"
      },
      "payoutAccount": "Payout account",
      "accountEnding": "•••• {last4}",
      "change": "Change",
      "payouts": "Payouts",
      "noPayouts": "No payouts yet – they start once everyone in your House pays their share.",
      "paidOut": "Paid out",
      "scheduled": "Scheduled",
      "onHold": "On hold until the booking is confirmed"
    },
    "save": "Save",
    "saved": "Settings saved",
    "unsaved": "Unsaved changes"
  },
  "dev": {
    "simulation": {
      "band": "Simulation – this page stands in for the payment provider. Nothing is sent, no money moves.",
      "loginTitle": "Log in to continue",
      "onboardingTitle": "Payout details",
      "onboardingIntro": "What the provider's onboarding would ask. Filled with test values.",
      "name": "Full name",
      "birthDate": "Date of birth",
      "country": "Country",
      "iban": "IBAN",
      "ibanHelper": "A test IBAN – nothing is checked.",
      "submit": "Submit",
      "identityTitle": "Verify your ID",
      "identityIntro": "A photo of an ID and a selfie – both simulated here.",
      "uploadId": "Upload your ID",
      "uploadHint": "Passport, ID card or driving licence",
      "uploaded": "Uploaded",
      "sampleId": "sample-id.jpg",
      "useSample": "Use a sample ID",
      "selfie": "Take a selfie",
      "selfieTaken": "Selfie taken"
    }
  },
  "payouts": {
    "byStripe": "Payments by Stripe",
    "setupTitle": "Set up payouts",
    "point1": "Your crew pays through Simpulo",
    "point2": "We send the money to your bank after everyone paid",
    "point3": "Stripe verifies your identity – takes ~5 minutes",
    "continue": "Continue to Stripe",
    "noneTitle": "Payouts not set up",
    "noneText": "Set up where your crew's money goes – you need it before payments start.",
    "setupAction": "Set up payouts",
    "pendingTitle": "Stripe is checking your details",
    "pendingText": "Usually a few minutes. You can close this page.",
    "actionTitle": "Stripe needs one more thing",
    "actionText": "Add the missing detail and payouts are ready.",
    "actionAction": "Continue to Stripe",
    "activeTitle": "Payouts ready · Bank ****{last4}",
    "activeText": "Paid out the day after check-in, once everyone paid.",
    "returnTitle": "Payouts",
    "returnBack": "Back to Settings",
    "openedTitle": "Set up payouts for your host experience",
    "openedText": "Your crew pays you through Simpulo – set up where the money goes before payments start.",
    "task": "Set up payouts to receive your crew's payments",
    "taskAction": "Set up"
  },
  "verification": {
    "noneTitle": "Not verified",
    "noneText": "Verify with an ID and a selfie – it takes about 2 minutes.",
    "action": "Verify with ID",
    "processingTitle": "Stripe Identity is checking your ID",
    "processingText": "Usually under a minute. The check mark appears once it's done.",
    "verifiedTitle": "ID verified",
    "verifiedText": "Your profile shows the check mark.",
    "failedTitle": "The check didn't go through",
    "failedText": "Try again with a clear photo of your ID.",
    "whyTitle": "Why verify",
    "why1": "Hosts accept verified guests more often.",
    "why2": "Verified hosts get more requests.",
    "why3": "Some Houses only take verified guests.",
    "voluntary": "Voluntary. Your ID goes to Stripe Identity, Simpulo never sees it.",
    "tooltip": "ID verified by Stripe Identity",
    "profileHint": "<link>Get verified</link> – hosts accept verified guests more often",
    "createHint": "Verified hosts get more requests – <link>verify now</link>",
    "verifiedOnlyCta": "Verified guests only",
    "verifiedOnlyHint": "This host takes requests from verified guests – <link>verify with ID</link>",
    "verifiedOnly": "Only verified guests can request",
    "verifiedOnlyText": "Guests verify with an ID through Stripe Identity. Fewer requests, more trust."
  },
  "policy": {
    "short": `Cancellation: free until the crew is complete. After paying, only by handing your spot to the waitlist (everything back but the Simpulo fee). Full refund if the host cancels or doesn't confirm the booking in ${H.booking}h.`,
    "link": "Cancellation rules"
  },
  "invitePage": {
    "metaTitle": "You're invited",
    "metaDescription": "Your spot in a House on Simpulo is held for you.",
    "invited": "{name} invited you",
    "searchInvited": "You searched for this – it's yours first",
    "held": "spot held for {hours}h",
    "text": "Your spot is reserved. Accept and you're in the crew – you pay your share once the crew is complete and the place is chosen, like everyone.",
    "accept": "Accept invite",
    "seeHouse": "See the House",
    "explore": "Explore Houses",
    "loginToAccept": "Log in to take your spot",
    "ownHouse": "This is your own House.",
    "joinedToast": "You're in – welcome to {title}",
    "invalid": "This invite isn't valid any more.",
    "expiredTitle": "This invite has expired",
    "expiredText": `Invite links hold a spot for ${H.invite} hours, once. Ask the host for a new one – or have a look at the House.`,
    "savedYou": "{name} saved you a spot",
    "savedYouIn": "{name} saved you a spot in {title}",
    "savedYouMany": "{name} saved {count} spots for friends",
    "left": "{hours}h left",
    "leftMinutes": "{minutes} min left",
    "reserve": "Reserve your spot",
    "waitlist": "Join the waitlist",
    "waitlistToast": "You're on the waitlist – we'll tell you when Simpulo opens.",
    "reservedToast": "Spot reserved in {title} – no payment until launch",
    "textBeta": "Your spot is held. Reserve it now – nothing is paid until Simpulo opens.",
    "textPrelaunch": "Simpulo opens soon. Join the waitlist and we'll hold on to this invite for you."
  },
  "help": {
    "button": "Something went wrong",
    "title": "Something went wrong?",
    "intro": "Tell us what's up with {title} – we answer quickly, usually within an hour.",
    "categoryLabel": "What is it about?",
    "categories": {
      "place": "Place not as described",
      "host": "Host unreachable",
      "safety": "Safety",
      "payment": "Payment",
      "other": "Other"
    },
    "safetyNote": "In danger? Call the local emergency number first (112 in the EU).",
    "textLabel": "What happened",
    "placeholder": "What happened, and since when?",
    "photo": "Add a photo (optional)",
    "photoChange": "Change photo",
    "send": "Send",
    "sentTitle": "We're on it",
    "sentText": "Case {number} – we'll reply in Messages.",
    "done": "Done",
    "adminTitle": "Support",
    "adminIntro": "Help requests from Houses about to start or running (mock, this browser).",
    "adminEmpty": "No cases yet.",
    "feedback": {
      "title": "How can we help?",
      "category": "What's it about?",
      "categories": {
        "question": "Question",
        "bug": "Something's broken",
        "safety": "Safety"
      },
      "message": "Your message",
      "messagePlaceholder": {
        "question": "What would you like to know?",
        "bug": "What happened, and what did you expect?",
        "safety": "What happened? We'll get back to you quickly."
      },
      "screenshot": "Add a screenshot (optional)",
      "remove": "Remove",
      "email": "Your email",
      "emailHint": "We answer here and by email.",
      "context": "We'll include this page: {page} · {device} · {width}px",
      "emergency": "In an emergency, call your local emergency number first.",
      "send": "Send",
      "sending": "Sending…",
      "thanks": "Thanks – we read every message.",
      "close": "Close",
      "invalidEmail": "Please enter your email."
    },
    "getHelp": "Get help",
    "shareIdea": "Share an idea",
    "idea": {
      "title": "Share an idea",
      "idea": "Your idea",
      "ideaPlaceholder": "What would make Simpulo better for you?",
      "why": "Why would it help you?",
      "whyPlaceholder": "A sentence is enough.",
      "whyPrefix": "Why it would help:",
      "send": "Send idea",
      "thanks": "Thanks – we read every idea.",
      "close": "Close"
    },
    "houseHelp": "Need help with this House?",
    "somethingWrong": "Something wrong?",
    "getHelpLink": "Get help",
    "reportOrHelp": "Report or get help",
    "report": "Report",
    "conversation": {
      "title": "Simpulo Support",
      "subtitle": "Your questions and ideas",
      "composer": "Write to Simpulo Support",
      "sentHint": "It's in Messages now – our answer comes there.",
      "open": "Open in Messages",
      "close": "Close",
      "about": {
        "question": "Question",
        "bug": "Something's broken",
        "safety": "Safety",
        "idea": "Idea"
      }
    }
  },
  "calendar": {
    "add": "Add to calendar"
  },
  "withdraw": {
    "action": "Withdraw request",
    "title": "Withdraw your request?",
    "text": "The host is told. You can ask again later.",
    "waitlistAction": "Withdraw waitlist request",
    "waitlistTitle": "Withdraw from the waitlist?",
    "confirm": "Withdraw",
    "keep": "Keep",
    "toast": "Request withdrawn"
  },
  "age": {
    "label": "Your date of birth",
    "close": "Close",
    "helper": "Simpulo is 18+. Only your age is shown, never the date.",
    "tooYoungTitle": "Simpulo is for adults",
    "tooYoungText": "You need to be 18 to join a House. We'd love to see you back then."
  },
  "refund": {
    "line": "Refund of {amount} on its way · 5–10 days",
    "none": "No refund – left after paying",
    "reason": {
      "booking_not_confirmed": `The host didn't confirm the booking within ${H.booking} hours, so every share goes back.`,
      "spot_transferred": "Your spot went to the waitlist – everything but the Simpulo fee goes back.",
      "cancelled": "You left the House – your share goes back.",
      "host_cancelled": "The host cancelled the House – your whole share goes back.",
      "forfeited": "You left after paying and nobody on the waitlist took your spot – no refund (see the cancellation rules)."
    }
  },
  "safety": {
    "moreOptions": "More options",
    "report": "Report",
    "block": "Block {name}",
    "unblock": "Unblock {name}",
    "loginToReport": "Log in to report this.",
    "loginToBlock": "Log in to block {name}.",
    "reportSheet": {
      "titleUser": "Report {name}",
      "titleProfile": "Report this profile",
      "titleStay": "Report this House",
      "titleMessage": "Report this message",
      "titlePhoto": "Report this photo",
      "intro": "What's wrong? The person won't know who reported them.",
      "reasons": {
        "harassment": "Harassment",
        "safety": "Safety",
        "scam": "Scam",
        "inappropriate": "Inappropriate",
        "other": "Something else"
      },
      "emergency": "In danger right now? Call the local emergency number first – Simpulo can't send help.",
      "detailsLabel": "Anything else we should know? (optional)",
      "detailsPlaceholder": "What happened?",
      "alsoBlock": "Also block this person",
      "send": "Send report",
      "sentTitle": "Report sent",
      "sent": `Thanks – we'll look at this within ${H.reportReview} hours.`,
      "blockedToo": "{name} is blocked too – they can't message you or request your Houses.",
      "thisPerson": "This person",
      "done": "Done"
    },
    "blockSheet": {
      "title": "Block {name}?",
      "description": "They won't be able to message you or request your Houses. They won't be notified.",
      "confirm": "Block",
      "blocked": "{name} is blocked"
    },
    "blockedProfile": {
      "title": "You blocked {name}",
      "description": "You won't see their Houses, and they can't message you or request your Houses.",
      "unblock": "Unblock",
      "unblocked": "{name} is unblocked"
    },
    "blockedMessage": "Blocked user – tap to show",
    "unavailable": {
      "notFoundTitle": "This House doesn't exist",
      "notFoundDescription": "The link may be wrong, or the House was never published.",
      "closedTitle": "This House isn't around anymore",
      "closedDescription": "The host closed it – but plenty of other Houses are still looking for people.",
      "blockedTitle": "This House isn't available",
      "blockedDescription": "You blocked the host of this House.",
      "removedTitle": "This House isn't available",
      "removedDescription": "Simpulo took it down after a report.",
      "explore": "Explore other Houses",
      "others": "Other open Houses"
    }
  },
  "growth": {
    "share": {
      "titleProfile": "Share {name}'s profile",
      "titleOwnProfile": "Share your profile",
      "subtitle": "Your link carries your name – so we know who brought whom.",
      "button": "Share",
      "inviteCopied": "Link copied – send it to your friends",
      "buttonFor": "Share {title}",
      "channels": {
        "whatsapp": "WhatsApp",
        "instagram": "Instagram",
        "tiktok": "TikTok",
        "twitch": "Twitch",
        "copy": "Copy link",
        "native": "Share…"
      },
      "pasteHint": "Link copied – paste it into your {channel} story, bio or chat.",
      "whatsappProfile": "{name} on Simpulo",
      "storyButton": "Story image for social media",
      "storyHint": "Photo, title, open spots and a QR code – ready for Instagram or WhatsApp status",
      "storyBusy": "Creating image…",
      "storyDone": "Story image saved",
      "storyFailed": "Couldn't create the image – try again.",
      "hostTitle": "Share your House",
      "hostText": "Your link and a story image – the image carries a QR code to this House.",
      "prefill": "{title} · {place} · {dates} – {spots, plural, one {# spot} other {# spots}} left. Join: {url}",
      "linkCopied": "Link copied",
      "houseTitle": "Share {title}",
      "houseSubtitle": "Your link carries your name – so we know who brought whom.",
      "menu": {
        "copy": "Copy link",
        "whatsapp": "WhatsApp",
        "messages": "Messages",
        "story": "Instagram Story",
        "storyHint": "Saves the story image with a QR code",
        "more": "More…"
      },
      "storyShareText": "{title} on Simpulo",
      "afterRequest": "Request sent – want a friend along?"
    },
    "story": {
      "join": "Join on simpulo.app",
      "scan": "Scan to join",
      "hostedBy": "Hosted by {name}",
      "spotsOpen": "{count, plural, one {# spot left} other {# spots left}}"
    },
    "demand": {
      "title": "No House for these dates yet",
      "titlePlace": "No House in {place} for these dates yet",
      "text": "Open one and the people looking for the same trip find you – or we'll tell you when one opens.",
      "openOne": "Open one",
      "notifyMe": "Notify me",
      "clear": "Clear filters"
    },
    "alert": {
      "title": "Notify me",
      "subtitle": "We'll email you once a House opens that fits.",
      "anywhere": "Anywhere",
      "anyDates": "Any dates",
      "starting": "Starting {range}",
      "email": "Email",
      "emailPlaceholder": "you@example.com",
      "invalid": "Enter a valid email address.",
      "submit": "Notify me",
      "doneTitle": "You're on the list",
      "doneText": "We'll email {email} when a House opens there.",
      "done": "Done"
    },
    "ownHouse": {
      "titleDeclined": "Still want to go?",
      "titleFull": "This House is set",
      "text": "Open your own House for the same dates – {dates} in {place} – and find your own people.",
      "textNoDates": "Open your own House in {place} and find your own people.",
      "action": "Open your own House"
    },
    "again": {
      "title": "Do it again?",
      "hostText": "{title} is over. Do it again – same vibe, place and spots, and your House one tap away.",
      "guestText": "Loved it? Open the next one yourself – and invite the people you lived with.",
      "action": "Do it again"
    },
    "premium": {
      "programme": "Host experience",
      "perPerson": "per person",
      "fieldLabel": "Host experience",
      "optional": "optional",
      "fieldHint": "Guestlists, coaching, hosted dinners – per person, on top of the stay. All of it goes to you.",
      "fieldHintMax": "Guestlists, coaching, hosted dinners – per person, on top of the stay. At most {max} (your lowest share).",
      "verifiedOnly": "Pro hosts can add a paid host experience on top of the stay.",
      "share": "Stay share",
      "fee": "Simpulo fee",
      "total": "Total",
      "lockPreview": "{total} ÷ {spots} = {perPerson} stay + {programme} host experience + {fee} fee = {withFee} per guest",
      "youReceive": "You receive {amount} per guest – the stay share plus the whole host experience.",
      "capped": "Host experience capped at the share: {amount}.",
      "colProgramme": "Host exp.",
      "noProgramme": "–",
      "compactProgramme": "+ {amount} host experience",
      "offerTitle": "Included in the host experience",
      "proHost": "Pro host",
      "proHostTooltip": "Earns a host fee for running the House"
    },
    "draft": {
      "badge": "Draft",
      "bannerTitle": "Draft – only you can see this House",
      "bannerText": "Finish the details and publish it when you're ready.",
      "finish": "Finish & publish",
      "publish": "Publish House",
      "publishedToast": "Your House is live",
      "saveDraft": "Save draft",
      "savedToast": "Draft saved"
    },
    "claim": {
      "eyebrow": "Prepared for {name}",
      "title": "This is yours – claim it",
      "intro": "We turned your post into a House on Simpulo. Claim it, make it yours, then publish it to your people.",
      "preparedFrom": "Prepared from your post",
      "viewPost": "View the original post",
      "claim": "This is yours – claim it",
      "loginContext": "Log in to claim your House",
      "claimedToast": "It's yours – check the details, then publish",
      "steps": [
        {
          "title": "Claim it",
          "text": "Log in or sign up – it takes a minute."
        },
        {
          "title": "Make it yours",
          "text": "Check dates, budget and pitch. Your photo replaces ours."
        },
        {
          "title": "Publish and share",
          "text": "Your House goes live – share your link and your people find you."
        }
      ],
      "notFoundTitle": "This claim link doesn't work",
      "notFoundText": "It may be mistyped – or the House was removed.",
      "claimedTitle": "Already claimed",
      "claimedText": "Someone already made this House theirs.",
      "mineTitle": "You claimed this House",
      "mineText": "It's a draft until you publish it.",
      "openDraft": "Open your draft",
      "explore": "Explore Houses"
    },
    "host": {
      "eyebrow": "Anyone can host",
      "title": "Host a House. Your crew covers the stay.",
      "intro": "Pick a place and dates, share one link – Simpulo handles requests, chat and payments.",
      "seeHow": "See how it works",
      "openHouse": "Open a House",
      "heroCardLabel": "A House people opened",
      "why": [
        {
          "title": "You choose the people",
          "text": "See every request, chat first and accept who fits. Nobody's in without your yes."
        },
        {
          "title": "No hosting fees",
          "text": "Simpulo takes nothing from you – your crew can even cover your spot. Guests pay a {percent} % service fee, shown before they pay."
        },
        {
          "title": "We handle the rest",
          "text": "Requests, chat and payments – held by Simpulo until the House is complete."
        }
      ],
      "housesTitle": "Houses people opened",
      "housesSubline": "Party, founder, surf, study – every kind of House.",
      "housesSeeAll": "See all",
      "housesSeeAllLabel": "See all Houses",
      "proTitle": "Add what only you can bring",
      "faqTitle": "Questions",
      "faq": [
        {
          "question": "Do I pay for the place upfront?",
          "answer": "No. The place is only booked once the House is complete and everyone has paid their share."
        },
        {
          "question": "What if my House doesn't fill up?",
          "answer": "Nothing is booked and nobody pays. You can extend the dates or lower the spots."
        },
        {
          "question": "What does Simpulo charge?",
          "answer": "Hosts pay nothing. Each guest pays their share plus a {percent} % service fee, shown as its own line before they pay – on a {share} share that's {fee}. You receive every guest's full share. The fee covers the requests, the House chat and holding everyone's money until the House is complete and the place is booked."
        }
      ],
      "ctaTitle": "Your people are out there.",
      "ctaText": "Free to open. Takes a few minutes.",
      "formTitle": "Apply",
      "formIntro": "We read every application and reply within a few days.",
      "fields": {
        "name": "Name",
        "email": "Email",
        "links": "Your platforms",
        "linksPlaceholder": "instagram.com/you, twitch.tv/you",
        "audience": "Audience size",
        "audienceChoose": "Choose…",
        "idea": "Your idea",
        "ideaPlaceholder": "A two-week run camp in Lisbon for my club…",
        "place": "Place",
        "placePlaceholder": "Lisbon, Portugal",
        "from": "From",
        "to": "To"
      },
      "audienceSizes": {
        "under1k": "Under 1k",
        "1k": "1k–10k",
        "10k": "10k–100k",
        "100k": "100k+"
      },
      "errors": {
        "required": "Required",
        "email": "Enter a valid email address.",
        "links": "Add at least one link"
      },
      "submit": "Send application",
      "sentTitle": "Thanks – we'll be in touch",
      "sentText": "We'll reply to {email} within a few days.",
      "another": "Send another",
      "howItWorks": "How it works",
      "points": {
        "place": "Pick a place and dates",
        "link": "Share one link",
        "share": "Everyone pays their share"
      },
      "howTitle": "How it works"
    }
  },
  "install": {
    "footerTitle": "Get Simpulo on your phone",
    "footerScan": "Scan with your camera",
    "getTitle": "Simpulo on your phone",
    "getLead": "Get notified the moment your host says yes.",
    "getInstall": "Install Simpulo",
    "getOpenChrome": "Open this page in Chrome to install",
    "getOpenSafari": "Open this page in Safari to add Simpulo",
    "getScan": "Scan with your phone",
    "getInstalled": "Simpulo is on your home screen.",
    "getOpenExplore": "Open Explore",
    "iosShare": "Tap the Share button in Safari.",
    "iosAdd": "Choose “Add to Home Screen”.",
    "iosConfirm": "Tap Add – done.",
    "addToHome": "Add to Home Screen",
    "notNow": "Not now",
    "desktopScan": "Scan to get updates on your phone",
    "mockApp": "Simpulo",
    "mockTime": "now",
    "mockText": "Tom: You're in! 🎉",
    "inAppSafari": "For the best experience, open Simpulo in Safari",
    "inAppChrome": "For the best experience, open Simpulo in Chrome",
    "inAppHow": "Tap ••• → Open in browser",
    "inAppDismiss": "Dismiss",
    "pushTitle": "Turn on notifications?",
    "pushText": "Only for answers to your requests, your crew chat and payments.",
    "pushAllow": "Turn on",
    "qrMenu": "Show QR code",
    "qrHint": "Scan to open this House",
    "qrDownload": "Download PNG",
    "installToNotify": "Install to get notified – on iPhone, Simpulo can only notify you from your home screen.",
    "installHowLink": "How →",
    "joinedTitle": "Your crew chat is live – don't miss a message",
    "joinedBenefit": "With Simpulo on your home screen, your crew reaches you right away.",
    "paidTitle": "Your arrival details land here",
    "paidBenefit": "Add Simpulo to your home screen – booking, address and crew in one tap.",
    "chatTitle": "Keep your crew one tap away",
    "chatBenefit": "With Simpulo on your home screen, new messages arrive like any other chat.",
    "requestedTitle": "Know when your host replies",
    "requestedBenefit": "Get Simpulo on your phone – the answer to your request lands there first.",
    "dontShowAgain": "Don't show again",
    "emailAnyway": "Payments, deadlines and your House's updates always come by email too.",
    "card": {
      "pageTitle": "QR cards for your House",
      "pageLead": "Print them and leave them in the House – your crew installs Simpulo in seconds.",
      "print": "Print",
      "title": "Simpulo on your phone",
      "text": "Your crew chat, payments and arrival details in one place.",
      "scan": "Scan with your camera"
    }
  },
  "supportTemplates": {
    "safety": {
      "harassment": "Thanks for telling us. You can block this person right now from their profile – we've also limited their messages to you while we look into it. If you're in danger, call your local emergency number first. – The Simpulo team",
      "payment": "Thanks for checking with us – please don't pay anything outside Simpulo. All payments go through the app so you're protected. We're contacting the host now. – The Simpulo team",
      "onsite": "Thanks for telling us – your safety comes first. If anyone is hurt or in danger, call your local emergency number now. If the place isn't safe to stay in tonight, tell us right here and we'll help you find somewhere else to stay while we sort this out with the host. – The Simpulo team"
    }
  },
  "faq": {
    "title": "Questions",
    "roleLabel": "Questions about",
    "joining": "Joining",
    "hosting": "Hosting",
    "contact": "Still unsure? Write us →",
    "items": {
      "payment": {
        "question": "Where does my money go?",
        "answer": "You pay Simpulo, not the host. We hold your payment until the crew is complete and the host has booked the place."
      },
      "when-to-pay": {
        "question": "When do I pay?",
        "answer": "Only after the host accepts you. You then have {hours}h to pay your share."
      },
      "refund": {
        "question": "What if the House doesn't fill up or the host doesn't book?",
        "answer": "You get your money back in full."
      },
      "cancellation": {
        "question": "Can I cancel?",
        "answer": "Until the crew is complete, you can withdraw your request or leave your spot any time, for free. After paying, you can hand your spot to the next person on the waitlist and get everything back except the service fee; if nobody takes it, there's no refund. If the host cancels or doesn't confirm the booking within {hours}h after everyone paid, you get everything back.",
        "link": "All cancellation rules →"
      },
      "fees": {
        "question": "What does Simpulo charge?",
        "answer": "A {percent} % service fee on your share, at least €{min} per guest and booking – already in every price you see. Nothing else."
      },
      "people": {
        "question": "Who will I live with?",
        "answer": "You see everyone's profile before you join – who they've lived with, languages, socials. Verified members have a badge."
      },
      "place": {
        "question": "Is the place already booked?",
        "answer": "Some Houses come with a set place and price. Others are planned together – you'll see a price range until the crew picks the place."
      },
      "host-fees": {
        "question": "What does hosting cost?",
        "answer": "Nothing. You pay your share like everyone else. If you lead a programme, you can add a host fee per guest – Simpulo keeps {percent} % of it."
      },
      "host-money": {
        "question": "How does the money work?",
        "answer": "Your crew pays through Simpulo. Once everyone has paid, the money is released to you and you book the place within {hours}h."
      },
      "not-full": {
        "question": "What if my House doesn't fill up?",
        "answer": "Nobody pays until the crew is complete. If it doesn't fill by your deadline, the House closes and nobody is charged."
      },
      "who-joins": {
        "question": "Who decides who joins?",
        "answer": "You. Nobody is in without your yes – answer each request within {hours} hours, or it runs out."
      },
      "place-host": {
        "question": "Do I need a place already?",
        "answer": "No. Bring a place you've found – or just a city, dates and a budget and pick the place together with your crew."
      },
      "host-at-home": {
        "question": "Can I host where I live?",
        "answer": "Yes – save the place you live in and open Houses in it for a few weeks at a time. You live there too and count as one of the crew, so the spots are your free rooms. Only do it if you're allowed to: renting rooms out or having paying guests usually needs your landlord's permission, and some cities have their own rules for short stays. Simpulo doesn't check this for you – when you save the place, you confirm it yourself."
      },
      "verify": {
        "question": "Do I need to verify?",
        "answer": "No, it's voluntary. An ID check with Stripe Identity gives you the Verified badge – verified hosts get more requests, and you can choose to accept only verified guests."
      },
      "how-to-join": {
        "question": "How do I join a House?",
        "answer": "Find a House you like and tap “Request to join” – add a note for the host if you want. Asking is free; the host says yes or not within {hours} hours."
      },
      "request-runs-out": {
        "question": "What if the host doesn't answer?",
        "answer": "After {remind} hours you can remind the host once. If there's still no answer after {hours} hours, the request runs out – nothing is charged, and we show you similar Houses."
      },
      "with-friend": {
        "question": "Can I join with a friend?",
        "answer": "Yes – “Request with a friend” asks for two spots. You get a link for your friend; they confirm with it and send their own request."
      },
      "full-house": {
        "question": "What if a House is full?",
        "answer": "Join its waitlist. If someone drops out, the first person on it gets the spot offered for {hours} hours."
      },
      "currency": {
        "question": "Which currency do I pay in?",
        "answer": "Prices show in your currency, with “≈” when the House uses another one. You pay in the House's currency – your bank converts the amount."
      },
      "report": {
        "question": "How do I report someone?",
        "answer": `Tap “Report” on a profile, a message, a House or a photo. Pick a reason, add a few words if you like, and block the person too if you want. We look at every report within ${H.reportReview} hours.`
      },
      "emergency": {
        "question": "What if I'm in danger?",
        "answer": "Call the local emergency number first – Simpulo can't send help. Then tell us with “Get help” and choose Safety."
      },
      "help-on-site": {
        "question": "Something's wrong during my stay – what now?",
        "answer": "From {before} days before your House until {after} days after it, “Something went wrong” on the House page opens a case with us – for the place, the host, safety or payment."
      },
      "block": {
        "question": "What happens when I block someone?",
        "answer": "Your direct chat with them ends. They can't message you or request your Houses, and they aren't told."
      },
      "harassment": {
        "question": "What happens after a harassment report?",
        "answer": "Harassment isn't tolerated. If a report of harassment in a House holds up, the person leaves the House – anything they paid is refunded."
      },
      "verified-people": {
        "question": "What does the Verified badge mean?",
        "answer": "The person checked their ID with Stripe Identity. It's voluntary – hosts can choose to accept only verified guests."
      },
      "who-sees-me": {
        "question": "Who sees my profile?",
        "answer": "The people in your House see your full profile. Other signed-in members see your first name, photo and interests – only while “Show me on House pages” is on. Logged-out visitors don't see guests at all."
      },
      "last-name": {
        "question": "Is my last name shown?",
        "answer": "Never. Other people only see your first name – your host too."
      },
      "emails": {
        "question": "Which emails will I get?",
        "answer": "Bookings, payments and deadlines always come by email too, so you never miss them. Everything else you choose in Settings › Notifications."
      },
      "your-data": {
        "question": "Can I get a copy of my data?",
        "answer": "Yes – Settings › Privacy & safety › Your data › Download your data gives you everything we keep about you as a file."
      },
      "pause": {
        "question": "Can I take a break?",
        "answer": "Pause your account: your profile turns private for everyone and your Houses leave Explore. Nothing is deleted – come back any time."
      },
      "delete": {
        "question": "How do I delete my account?",
        "answer": "Settings › Privacy & safety › Delete account. We tell you first what happens to your Houses and bookings; you confirm by typing DELETE."
      }
    }
  },
  "seo": {
    "breadcrumbs": {
      "home": "Home",
      "label": "Breadcrumb"
    },
    "count": "{count, plural, =0 {No open Houses right now} one {# open House} other {# open Houses}}",
    "housesLabel": "Houses",
    "house": {
      "title": "{title} in {city}",
      "similar": "Similar Houses",
      "similarText": "This House has ended – these are still taking requests.",
      "imageAlt": "{title} – the host, the dates and the place"
    },
    "city": {
      "h1": "Co-living in {city}",
      "description": "Find people to share a house with in {city}, {country}: {count, plural, =0 {be the first to open a House} one {# open House} other {# open Houses}} with real hosts on Simpulo.",
      "intro": "Share a house in {city} with people who want the same kind of trip – a few weeks, one crew, a host who knows the place. Ask to join an open House below, or open your own. Asking is free; you pay your share only once the host says yes and the crew is complete.",
      "introEmpty": "Share a house in {city} with people who want the same kind of trip – a few weeks, one crew, a host who knows the place. There's no House here yet: open the first one, or hear first when one opens.",
      "startingSoon": "Starting soon in {city}",
      "faqTitle": "Co-living in {city}: questions",
      "emptyTitle": "Opening soon in {city}",
      "emptyText": "No House is open in {city} right now. Join the waitlist and hear first when one opens – or open the first one yourself.",
      "related": "Also popular",
      "link": "{city}",
      "vibes": "Vibes in {city}"
    },
    "emptyTitle": "No House here yet – open the first one.",
    "emptyAction": "Open a House",
    "openFirst": "Open the first one",
    "joinWaitlist": "Join the waitlist",
    "guidesWhileWaiting": "Read while you wait",
    "cityFaq": {
      "how": { "q": "How does co-living in {name} work?", "a": "A host opens a House in {name} – a place, a few weeks, a theme. You ask to join with a short note, the host says yes or not, and once the crew is complete everyone pays an equal share of the place." },
      "length": { "q": "How long do Houses in {name} last?", "a": "Each House sets its own dates – from a long weekend to a few months. The dates and nights are on every House card." },
      "cost": { "q": "What does it cost?", "a": "Every House shows its price per person: an equal share of the place, plus Simpulo's {percent} % service fee on your share. Asking is free; nothing is charged before the host says yes." },
      "open": { "q": "Can I open my own House in {name}?", "a": "Yes. Open a House with a theme and dates, bring a place or find one with your crew, and choose who joins." }
    },
    "collectionFaq": {
      "what": { "q": "What are {name}?", "a": "Houses on Simpulo that fit this theme – shared places for a few weeks, each opened by a host who says what it's about." },
      "who": { "q": "Who joins these Houses?", "a": "People who want the same kind of trip. You see the host and the crew before you ask, and nobody is in without the host's yes." },
      "cost": { "q": "What does it cost?", "a": "Every House shows its price per person: an equal share of the place, plus Simpulo's {percent} % service fee on your share. Asking is free." },
      "open": { "q": "Can I host one myself?", "a": "Yes – open a House with this theme, set the dates and the crew size, and choose who joins." }
    },
    "collectionIntro": "Every House is a shared place for a few weeks, with a host who chooses the crew. Asking to join is free – you pay your share only once the host says yes and the crew is complete.",
    "collectionStartingSoon": "Starting soon",
    "collectionFaqTitle": "Questions",
    "collectionEmptyTitle": "No House in this theme yet",
    "collectionEmptyText": "Open the first one – or join the waitlist and hear first when one opens.",
    "vibe": {
      "h1": "{vibe} Houses",
      "description": "Shared {vibe} Houses for a few weeks: {count, plural, =0 {opening soon} one {# open House} other {# open Houses}} with real hosts on Simpulo.",
      "intro": "Share a place for a few weeks with people who are into {vibe} too – a host who chooses the crew, a place, a theme. Ask to join an open House below, or open your own. Asking is free.",
      "emptyTitle": "Opening soon: {vibe} Houses",
      "emptyText": "No {vibe} House is open right now. Join the waitlist and hear first when one opens – or open the first one yourself.",
      "startingSoon": "{vibe} Houses starting soon",
      "faqTitle": "{vibe} Houses: questions",
      "related": "More themes",
      "cities": "Cities with {vibe} Houses"
    },
    "places": {
      "title": "Places",
      "description": "Every city with Houses on Simpulo – open now or opening soon.",
      "intro": "Cities where Houses are open now, and where they open next.",
      "open": "Open now",
      "soon": "Opening soon",
      "count": "{count, plural, =0 {Opening soon} one {# open House} other {# open Houses}}"
    },
    "themes": {
      "title": "Themes",
      "description": "Every theme on Simpulo – Houses for training, building, creating, slowing down and more.",
      "intro": "Find Houses by what you want to do together.",
      "count": "{count, plural, =0 {Opening soon} one {# open House} other {# open Houses}}"
    },
    "faq": {
      "title": "Help center",
      "description": "Answers about joining, hosting, payments and refunds, safety and your account – and a way to get help."
    },
    "pages": {
      "explore": {
        "title": "Explore Houses",
        "description": "Open Houses around the world – shared places for a few weeks, hosted by real people."
      },
      "howItWorks": {
        "title": "How it works",
        "description": "Open a House, share it, pick who joins and live together for a few weeks – how Simpulo works, step by step."
      },
      "host": {
        "title": "Host a House",
        "description": "Open a House and bring your people: share a place for a few weeks, choose who joins, and add a host fee if you lead the programme."
      },
      "about": {
        "title": "About",
        "description": "No one should have to go through life alone – why Simpulo exists, who's behind it, and what we hold to."
      },
      "contact": {
        "title": "Contact",
        "description": "Questions, feedback or a problem with a House? Get in touch with the Simpulo team."
      }
    }
  },
  "contactForm": {
    "name": "Your name (optional)",
    "email": "Your email",
    "message": "Your message",
    "send": "Send",
    "sent": "Thanks – it's with us. We answer by email."
  },
  "notifications": {
    "yourHouse": "your House",
    "catalog": {
      "signIn": { "subject": "Your sign-in link for Simpulo", "short": "Sign in to Simpulo", "body": "Tap the button to sign in. The link works once, for 15 minutes. Didn't ask for it? Ignore this email.", "action": "Sign in" },
      "welcome": { "subject": "Welcome to Simpulo", "short": "Welcome to Simpulo", "body": "Your account is ready. Add a few photos and a sentence about you – hosts look at your profile first.", "action": "Finish your profile" },
      "requestSent": { "subject": "Your request for {house} is on its way", "short": "Request sent for {house}", "body": `The host answers within ${H.request} hours. Nothing is charged until the crew is complete.`, "action": "See your request" },
      "requestReceived": { "subject": "New request for {house}", "short": "New request for {house}", "body": `Someone wants to join. Answer within ${H.request} hours – after that the request runs out.`, "action": "See the request" },
      "requestAccepted": { "subject": "You're in: {house}", "short": "Good news about {house}", "body": "The host said yes. You pay your share once the crew is complete.", "action": "Open your House" },
      "requestDeclined": { "subject": "About {house}", "short": "News about {house}", "body": "This one didn't work out. There are similar Houses with free spots.", "action": "See similar Houses" },
      "requestExpired": { "subject": "Your request for {house} ran out", "short": "News about {house}", "body": "The time to answer has passed. There are similar Houses with free spots.", "action": "See similar Houses" },
      "invited": { "subject": "A spot for you in {house}", "short": "A spot for you in {house}", "body": `The spot is held for ${H.invite} hours – accept it before it's free again.`, "action": "See the invite" },
      "hostReminder": { "subject": "Requests are waiting: {house}", "short": "Requests are waiting for {house}", "body": "Answer them before they run out – people plan around your answer.", "action": "Answer requests" },
      "friendSpots": { "subject": "Spots for friends are free again: {house}", "short": "Update on {house}", "body": `The ${H.invite} hours have passed – the spots you held are open to everyone again.`, "action": "Open your House" },
      "paymentDue": { "subject": "Pay your share: {house}", "short": "Payment due for {house}", "body": `The crew is complete and the place is picked. You have ${H.payment} hours to pay your share.`, "action": "Pay your share" },
      "paymentReminder": { "subject": "Reminder: pay your share for {house}", "short": "Payment reminder for {house}", "body": "Your spot is held until the payment window closes. After that it's free again.", "action": "Pay your share" },
      "paymentLapsed": { "subject": "Your spot in {house} was released", "short": "Update on {house}", "body": `The ${H.payment} hours to pay have passed, so your spot is free again. Nothing was charged.`, "action": "See similar Houses" },
      "paid": { "subject": "A payment came in: {house}", "short": "Payment in for {house}", "body": "Someone in the crew paid their share. You see the progress in the House.", "action": "Open your House" },
      "bookingConfirmed": { "subject": "Booked: {house}", "short": "{house} is booked", "body": "The host confirmed the booking. The address and check-in details follow before you arrive.", "action": "Open your House" },
      "cancelled": { "subject": "{house} was cancelled", "short": "Update on {house}", "body": "This House won't happen. Any payment comes back to you – the details are in the House.", "action": "See what happens next" },
      "refund": { "subject": "A refund is on its way: {house}", "short": "Refund for {house}", "body": "The money goes back to how you paid. Banks take 5–10 days.", "action": "See your refund" },
      "guestRemoved": { "subject": "You're no longer in {house}", "short": "Update on {house}", "body": "The host took you out of this House. Any payment comes back to you.", "action": "See similar Houses" },
      "houseMilestone": { "subject": "{house}: a step closer", "short": "Update on {house}", "body": "Something changed in your House – the crew, the dates or your arrival.", "action": "Open your House" },
      "arcStep": { "subject": "{house}: a small next step", "short": "A tip for {house}", "body": "One short thing for your House. Skip it if it doesn't fit.", "action": "Open your House" },
      "dayAfter": { "subject": "How was {house}?", "short": "A question about {house}", "body": "A few quick questions about your House – who you'd live with again stays private.", "action": "Answer" },
      "albumReady": { "subject": "Your album from {house} is ready", "short": "Album ready for {house}", "body": "Photos from your crew, only for your crew.", "action": "Open the album" },
      "doItAgain": { "subject": "Do {house} again?", "short": "Do {house} again?", "body": "Open the next one with the people you'd live with again.", "action": "Open a House" },
      "thirtyDays": { "subject": "A month after {house}", "short": "A month after {house}", "body": "One question about what stayed with you. Only you see your answer.", "action": "Answer" },
      "yourPeople": { "subject": "You chose each other", "short": "New in Your people", "body": "Someone from your crew wants to live with you again too. They're in Your people now.", "action": "See Your people" },
      "anniversary": { "subject": "One year since {house}", "short": "One year since {house}", "body": "Open the album – or open the next House with the same crew.", "action": "Open the album" },
      "chatMessage": { "subject": "New message in {house}", "short": "New message in {house}", "body": "Someone wrote in your chat.", "action": "Reply" },
      "houseNudge": { "subject": "{house} has spots for you", "short": "A House you might like: {house}", "body": "It fits what you're looking for – a few spots are still open.", "action": "See the House" },
      "newHouse": { "subject": "A new House for your search", "short": "A new House for your search", "body": "A House opened that fits a search you saved.", "action": "See the House" },
      "profileTips": { "subject": "A tip for your profile", "short": "A tip for your profile", "body": "A small step that helps hosts say yes.", "action": "Open your profile" },
      "applicationReceived": { "subject": "We got your application", "short": "Application received", "body": "Thanks for applying to host on Simpulo. We'll answer within a few days.", "action": "See your application" },
      "applicationAccepted": { "subject": "You're a Founding Host", "short": "You're a Founding Host", "body": "Your application is accepted. A few short steps and your first House is open.", "action": "Get started" },
      "applicationDeclined": { "subject": "About your host application", "short": "About your host application", "body": "Thank you for applying. We can't take every host yet – we'll write when that changes.", "action": "See your application" },
      "applicationQuestion": { "subject": "A question about your application", "short": "A question about your application", "body": "We have one question before we decide.", "action": "Answer" },
      "waitlistConfirm": { "subject": "Confirm your email", "short": "Confirm your email", "body": "One click and you're on the list. Didn't sign up? Ignore this email.", "action": "Confirm" },
      "waitlistOpen": { "subject": "Houses are open", "short": "Houses are open", "body": "Simpulo is open where you wanted to go. You were first on the list.", "action": "See Houses" },
      "reportReceived": { "subject": "We got your report", "short": "We got your report", "body": `Thanks – we look at it within ${H.reportReview} hours and tell you what we decided.`, "action": "Open Simpulo" },
      "reportDecided": { "subject": "About your report", "short": "About your report", "body": "We looked at what you reported. The result is in Simpulo.", "action": "Open Simpulo" },
      "decision": { "subject": "A decision about your account", "short": "A decision about your account", "body": "We made a decision about your account or content. You see why and can appeal.", "action": "See the decision" },
      "teamMessage": { "subject": "A message from Simpulo about {house}", "short": "A message from Simpulo", "body": "We wrote to you in Messages – a few ideas for your House.", "action": "Read the message" },
      "supportReply": { "subject": "Simpulo replied to your message", "short": "Simpulo replied", "body": "Our answer is in Messages.", "action": "Read the answer" },
      "termsUpdate": { "subject": "We've updated our Terms", "short": "We've updated our Terms", "body": "Read what changed – we ask you to agree once, the next time you open Simpulo.", "action": "Read the Terms" },
      "accountPaused": { "subject": "Your account is paused", "short": "Your account is paused", "body": "Your profile is private and your Houses are off Explore. Nothing is deleted – resume any time.", "action": "Resume" },
      "accountDeleted": { "subject": "Your account is deleted", "short": "Your account is deleted", "body": "Your account and profile are gone. What the law asks us to keep stays until it may be deleted.", "action": "Open Simpulo" }
    },
    "digest": {
      "subject": "{count, plural, one {# update from Simpulo} other {# updates from Simpulo today}}",
      "headline": "{count, plural, one {One update} other {# updates}} from today",
      "intro": "Everything from today in one email. Money and deadlines always come on their own, right away.",
      "action": "Open Simpulo"
    },
    "title": "Notifications",
    "markAll": "Mark all as read",
    "seeAll": "See all notifications",
    "empty": "Nothing yet – notifications about your houses and requests show up here.",
    "emptyTab": "Nothing here yet.",
    "loadMore": "Load more",
    "unread": "Unread",
    "similar": "Similar Houses",
    "label": "Notifications",
    "labelUnread": "Notifications, {count} unread",
    "close": "Close notifications",
    "loginTitle": "Log in to see your notifications",
    "tabs": {
      "all": "All",
      "requests": "Requests",
      "houses": "Houses",
      "messages": "Messages",
      "system": "System"
    },
    "groups": {
      "today": "Today",
      "yesterday": "Yesterday",
      "week": "This week",
      "earlier": "Earlier"
    },
    "types": {
      "request_received": "New request",
      "request_accepted": "You're in",
      "request_declined": "Didn't work out",
      "crew_full": "House complete",
      "house_locked": "Accommodation locked",
      "payment_due": "Payment",
      "new_message": "New message",
      "house_opened_in_place": "A House opened",
      "system": "Simpulo",
      "crew_invite": "You're invited",
      "do_it_again": "Want to do it again?"
    }
  },
  "inviteFriends": {
    "title": "Invite friends",
    "text": "Simpulo is better with your people. Send them your link – they land on Simpulo, and you'll see them once you've lived together.",
    "linkLabel": "Your invite link",
    "copy": "Copy link",
    "copied": "Link copied",
    "share": "Share",
    "shareText": "Come find your people on Simpulo.",
    "loginTitle": "Log in to invite friends"
  },
  "people": {
    "page": {
      "title": "Your people",
      "tabsLabel": "People",
      "tabs": {
        "people": "Your people",
        "lived": "Lived with",
        "saved": "Saved",
        "crews": "Crews"
      },
      "search": "Search by name or House",
      "together": "{count, plural, one {# House together} other {# Houses together}} · {name}",
      "message": "Message",
      "inForTitle": "You're in for",
      "inForNone": "Nothing yet – tell your people where you'd go next.",
      "inForAdd": "+ Add what you're in for",
      "inForPrivate": "Only your people see this.",
      "alsoInFor": "{name} is also in for {place} in {month}",
      "alsoInForTheme": "{name} is also in for {theme} in {place} in {month}",
      "planTogether": "Plan it together",
      "nearbyTitle": "Nearby",
      "nearbyOff": "Turn on <link>Nearby</link> to see when your people are in the same city – only those who turned it on too.",
      "nearbyNone": "Nobody of your people is in the same city soon.",
      "nearbyLine": "{name} is in {city} too · {dates}",
      "crewYear": "One year since {title}",
      "crewPeople": "Who was in it",
      "crewChat": "Chat",
      "crewAlbum": "Album",
      "crewAgain": "Do it again",
      "empty": {
        "people": { "title": "Your people show up here after your first House", "text": "Live together, then choose who you'd live with again – when it's mutual, they're your people." },
        "lived": { "title": "Everyone you lived with shows up here", "text": "After your first House, your whole crew is here." },
        "saved": { "title": "No saved profiles yet", "text": "Save a profile with the bookmark on it – only you see this list." },
        "crews": { "title": "Your crews stay here", "text": "After your first House, its crew stays as a group – with the chat, the album and “Do it again”." }
      },
      "livedIn": "Lived together in {place}",
      "remove": "Remove",
      "removed": "{name} is no longer in Your people",
      "unsaved": "{name} removed from saved profiles",
      "noMatch": "Nobody by that name.",
      "nowIn": "Now in {city}",
      "invite": "Invite to a House",
      "inFor": "In for {line}",
      "hint": "{a} and {b} are in for {place} in {month} – <link>open a House?</link>",
      "explore": "Find a House",
      "loginTitle": "Your people",
      "loginDescription": "Log in to see the people you lived with."
    },
    "going": {
      "eyebrow": "Your people",
      "title": "Your people are going",
      "subline": "Houses someone you lived with hosts or is in",
      "seeAll": "See all"
    },
    "signal": {
      "isIn": "{others, plural, =0 {{name} is in} other {{name} and # more of yours are in}}",
      "hostedBy": "Hosted by {name} from your people"
    }
  },
  "demo": {
    "band": {
      "text": "Preview – houses and people are examples.",
      "link": "Open your real House"
    },
    "toast": "This is a preview – open your real House on simpulo.com"
  },
  "overlap": {
    "alreadyIn": "You're already in {name} on these dates.",
    "cancelFirst": "Cancel {name} first",
    "cancelFirstText": "You've paid for {name}, and it overlaps these dates – one House per night. Leave {name} first, then pay here.",
    "openOther": "Open {name}",
    "pickOne": "Pick one",
    "pickTitle": "Two Houses, the same nights",
    "pickText": "You're in both and neither is paid yet. Keep one – the other spot goes to the next person.",
    "keep": "Keep {name}",
    "kept": "You kept {name}",
    "hostTwo": "You're hosting two Houses at the same time."
  },
  "invite": {
    "title": "Invite friends",
    "invite": "Invite",
    "inviteCount": "{count, plural, one {Invite # person} other {Invite #}}",
    "skip": "Not now",
    "spotsOpen": "{count, plural, =0 {No spots open} one {# spot open} other {# spots open}}",
    "pickHouse": "Which House?",
    "shareLink": "Share link",
    "copy": "Copy link",
    "whatsapp": "WhatsApp",
    "qr": "QR code",
    "share": "Share",
    "linkHolds": "A link holds a spot for {hours}h.",
    "linkFailed": "No spot left to hold.",
    "copied": "Copied",
    "message": `Come with me to {title}? I saved you a spot for ${H.invite}h.`,
    "yourPeople": "Your people",
    "livedWith": "Lived with you",
    "saved": "Saved",
    "savedNote": "Saved",
    "inForTitle": "In for {place} · {month}",
    "inForTitleNoPlace": "In for this House",
    "inForNote": "In for this",
    "picked": "Picked",
    "search": "Anyone else",
    "searchPlaceholder": "Search by first name",
    "searchNote": "From the search",
    "noMatch": "Nobody by that name",
    "allSpotsPicked": "Every open spot is picked.",
    "strangersLeft": "{count, plural, =0 {No more invites to new people today} one {# more invite to new people today} other {# more invites to new people today}} · {limit} a day",
    "sent": "{count, plural, one {# invite sent} other {# invites sent}} – spots held for {hours}h",
    "limitReached": "That's {count, plural, one {# invite} other {# invites}} to new people today – {sent} sent",
    "notSent": "Nothing sent – they can't be invited right now",
    "addSpot": "Invite to a free spot",
    "freeSpot": "Free spot",
    "bringSomeone": "Bring someone? {count, plural, one {# spot left} other {# spots left}}",
    "dontInviteAgain": "Don't invite me again",
    "stopped": "You won't get invites from {name} again",
    "fillTitle": "Fill your House",
    "fillLive": "Your House is live",
    "fillText": "Invite the people who'd love it – each invite holds a spot for {hours}h.",
    "requestWithFriend": "Request with a friend",
    "withFriendSent": "Request sent for two – send your friend this link to confirm",
    "withFriendCopy": "Copy friend link",
    "friendTitle": "{name} wants you along",
    "friendText": "{name} asked {host} for two spots in {title}. Confirm to send your own request with them.",
    "friendConfirm": "Confirm and request",
    "friendDone": "Request sent – together with {name}",
    "joinThem": "Join them",
    "shareHouse": "Share this House",
    "hostDot": "Host",
    "crewIn": "{in} of {total} in",
    "spotsLeft": "{count, plural, one {# spot left} other {# spots left}}",
    "full": "Full",
    "inviteFriends": "Invite friends",
    "shareTitle": "Share",
    "spotsForFriends": "Spots for friends",
    "spotsForFriendsText": `{count, plural, one {The link holds # spot for ${H.invite}h} other {The link holds # spots for ${H.invite}h}} – then {count, plural, one {it's} other {they're}} free again.`,
    "spotsAfterPaying": `Once you've paid your share, your link can hold spots for friends for ${H.invite}h. Until then it's the House's link.`,
    "spotCount": "{count, plural, one {# spot} other {# spots}}",
    "scanToJoin": "Scan to open the invite",
    "yourPeopleText": "Pick several – they get it in the app and by email.",
    "linkReady": `Link ready · {count, plural, one {# spot held} other {# spots held}} for ${H.invite}h`,
    "pickedNote": "Picked"
  },
  "inFor": {
    "title": "I'm in for",
    "lead": "Tell hosts where you'd go. They can invite you – nobody else sees more than the place and month.",
    "where": "Where",
    "when": "When",
    "from": "From",
    "until": "Until",
    "howLong": "How long",
    "short": "Short Trip",
    "month": "About a month",
    "long": "Longer",
    "categories": "Into (optional)",
    "add": "Add",
    "save": "Save",
    "remove": "Remove",
    "max": "{count} at a time – remove one to add another.",
    "added": "Saved – hosts in {place} can invite you",
    "empty": "Nothing yet.",
    "summary": "{count, plural, =0 {Where you'd go next} one {# place} other {# places}}",
    "line": "{place} · {months}",
    "cardTitle": "Nothing fits?",
    "cardText": "Tell hosts where you'd go.",
    "cardAction": "I'm in for…",
    "hint": "{count, plural, one {# person is} other {# people are}} in for {place} in {month}",
    "hintNoMonth": "{count, plural, one {# person is} other {# people are}} in for {place}",
    "invitePeopleIn": "Invite people who are in"
  },
  "guides": {
    "title": "Guides",
    "description": "Practical answers about sharing a place, finding roommates abroad and making friends in a new city.",
    "intro": "Short, practical answers about living together for a few weeks.",
    "read": "Read the guide",
    "minutes": "{count} min read",
    "housesTitle": "Houses that fit",
    "housesNone": "No open Houses that fit right now.",
    "waitlistTitle": "Hear when the next House opens",
    "waitlistText": "Join the waitlist – one email when Houses open, nothing else.",
    "exploreTitle": "Find your House",
    "exploreText": "Open Houses around the world – ask to join one.",
    "explore": "Explore Houses",
    "joinWaitlist": "Join the waitlist",
    "back": "All guides",
    "articles": {
      "villaSolo": {
        "title": "How to share a villa as a solo traveler",
        "description": "Why sharing a villa beats a single room, where to find people, how to split the cost fairly and what to agree on before you arrive.",
        "intro": "A villa with a pool is out of reach for one person – and perfectly normal for five. Sharing one is the easiest way to travel solo without being alone. Here's how to do it well.",
        "s1": {
          "q": "Why share a villa instead of booking a room?",
          "a": "A private room in a hotel costs a lot and gives you a door, not company. A villa split between four or five people often costs less per night than that room – and comes with a kitchen, a garden and people to have dinner with.\n\nThe real gain isn't the price. It's the evenings. When you travel alone, the hardest part is the time between activities: the dinners, the slow mornings, the rainy afternoon. A shared house fills exactly those gaps."
        },
        "s2": {
          "q": "Where do you find people to share with?",
          "a": "Friends of friends are the classic answer, but schedules rarely match. Travel forums and group chats work, yet you're usually agreeing to live with someone you've exchanged five messages with.\n\nA better way is a House that's built for it: a host opens it with a place, dates and a theme, and people who want the same kind of trip ask to join. You see who is already in before you ask – their profile, what they're coming for, who they've lived with before."
        },
        "s3": {
          "q": "How do you split the cost fairly?",
          "a": "Split the place equally, and decide it before anyone books. Arguments about who got the bigger room cost more goodwill than the room is worth – if rooms differ a lot, settle that once, openly, at the start.\n\nOn Simpulo the price per person is on the House before you ask: the place divided by the crew, plus a {fee} % service fee on your share. You pay only after the host has said yes and the crew is complete, so nobody pays for a house that never fills."
        },
        "s4": {
          "q": "How do you know the others are a good fit?",
          "a": "Look for a shared reason to be there. Five people who all came to surf get along more easily than five people who only wanted a cheap pool. A House with a clear theme – training, slow mornings, building something – does half the matching for you.\n\nThen look at the people: their short profile, the languages they speak, whether they've lived in a House before. And trust the host's judgement – they choose who joins, and they want the crew to work as much as you do."
        },
        "s5": {
          "q": "What should you agree on before you arrive?",
          "a": "Three things cause most trouble in shared houses: noise, cooking and guests. Agree on them in the first day or two – when quiet hours start, whether you cook together or on your own, and whether friends may come over.\n\nKeep it light. A short agreement everyone has voted on beats a long list of rules nobody remembers. And say early if something bothers you; small things are easy to fix on day two and hard on day ten."
        },
        "s6": {
          "q": "What if someone drops out?",
          "a": "Plan for it. Before the place is paid, anyone can step back without cost – that's why nobody should pay until the crew is complete. After payment, the fairest way out is handing the spot to someone else.\n\nOn Simpulo a full House can keep a short waitlist: if someone leaves, the next person gets the spot offered, and the one who left gets their share back except the service fee. Nobody is left paying for an empty room."
        }
      },
      "roommatesMonth": {
        "title": "Finding roommates for a month abroad",
        "description": "A month is long enough to want a home and short enough that a lease makes no sense. How to find people to live with – and live with them well.",
        "intro": "A month abroad sits in an awkward spot: too long for a hostel, too short for a lease. Sharing a place with a few people solves both – if you find the right ones.",
        "s1": {
          "q": "Why live with others for a month at all?",
          "a": "Because a month alone in a new place is longer than it sounds. The first week is exciting; by the third, most people miss someone to cook with or tell about their day.\n\nRoommates also make the place better: a bigger flat in a better area, a shared kitchen instead of takeaway, and someone who already knows where the good bakery is."
        },
        "s2": {
          "q": "Where do people look – and what goes wrong?",
          "a": "Most people try listing sites and expat groups. The problem is that those are built for long rentals: landlords want six months, and the people you meet there are looking for a flatmate, not company for a month.\n\nWhat works better is joining people who planned the same month in the same place. A House on Simpulo is exactly that: a host, a place and fixed dates, with a few spots for people who want to come along."
        },
        "s3": {
          "q": "How do you choose who to live with?",
          "a": "Choose by rhythm, not by sympathy. Two lovely people can still be terrible roommates if one goes to bed at ten and the other comes home at three.\n\nLook at what the House is for – remote work, training, a slower month – and at the people already in. Ask the host a question if something matters to you. A short note with your request helps them see whether you fit, too."
        },
        "s4": {
          "q": "How does paying work when you've never met?",
          "a": "Trust is the hard part, so the money should be simple. Nobody should send money to a stranger's personal account, and nobody should pay before the group exists.\n\nOn Simpulo you ask to join for free. Once the host accepts you and the crew is complete, you have {hours} hours to pay your share through Simpulo. The host receives it after everyone has paid and books the place – if the booking isn't confirmed in time, everyone gets their money back."
        },
        "s5": {
          "q": "What makes the first week go well?",
          "a": "Arrive with a little plan and a lot of openness. A shared first dinner does more than any house rule: everyone learns names, habits and why the others came.\n\nAgree on the basics early – quiet hours, cooking, friends over – and then let the month find its own rhythm. One shared thing a week, like a hike or a long breakfast, is usually enough to make a group out of roommates."
        },
        "s6": {
          "q": "What happens after the month?",
          "a": "Often the best part. People you lived with for a month know you better than colleagues of years. Some you'll never see again, and that's fine; one or two may become the people you plan the next trip with.\n\nAfter a House on Simpulo you can say who you'd live with again. Only a choice that goes both ways is ever shown – and those people stay in your network for the next House."
        },
          "s7": {"q": "What should you bring for a month in a shared place?", "a": "Less than you think, plus three things people forget: earplugs, a small lock for valuables, and something to share – a game, a spice you love, a recipe from home.\n\nAlso bring a little patience for the first days. Everyone arrives tired and a bit shy. By the end of the first week the house will feel like yours."}
      },
      "splitNomads": {
        "title": "Splitting accommodation with other digital nomads",
        "description": "How remote workers share a house for a few weeks: finding the right people, splitting costs, and keeping work and life apart under one roof.",
        "intro": "Remote work makes you free to go anywhere – and often alone wherever you go. Sharing a house with other people who work remotely fixes the loneliness and the budget at once.",
        "s1": {
          "q": "Why share a house with other remote workers?",
          "a": "A coworking desk gives you colleagues for the day; a shared house gives you people for the evening. With other remote workers you also get the same rhythm: focus in the morning, a break at lunch, a sunset at the end of the day.\n\nAnd the numbers work. A house with a good desk for everyone, fast internet and a garden is usually cheaper per person than a small studio – and far better to work from."
        },
        "s2": {
          "q": "What should the house have for working?",
          "a": "Check three things before anything else: internet you can rely on, a proper place to work for every person, and a room for calls. A dining table for five laptops looks nice on a photo and fails on the first Monday.\n\nAsk the host directly if it isn't clear. A House that's meant for remote work usually says how people work there – and a typical day on its page tells you a lot about the rhythm."
        },
        "s3": {
          "q": "How do you split rent, bills and extras?",
          "a": "Keep the place simple: an equal share for everyone, decided before anyone pays. Extras like groceries or a cleaner are easier in a small shared pot that one person keeps track of.\n\nOn Simpulo the place is shared equally, and every House shows its price per person with Simpulo's {fee} % service fee on top. You pay once the crew is complete, so the per-person price can't change because someone didn't show up."
        },
        "s4": {
          "q": "How do you keep work and home apart?",
          "a": "Agree on working hours the way you'd agree on quiet hours: when the house is in focus mode, where calls happen, and when it's fine to be loud. It sounds formal and saves a lot of tension.\n\nThen do the opposite after work. A shared dinner or a walk at the end of the day is what makes a group of laptop people feel like a house – and it's the part you'll remember."
        },
        "s5": {
          "q": "How long should you stay together?",
          "a": "Two to six weeks is a sweet spot. Long enough to settle in and get real work done; short enough that small annoyances never get big.\n\nIf you're unsure, choose a House with clear dates over an open end. Everyone arrives with the same expectation – and if it works, you can always plan the next one together."
        },
        "s6": {
          "q": "What if it doesn't work out?",
          "a": "Talk early and kindly; most problems are about noise, mess or calls and are easy to fix on day three. If something feels unsafe, it's different – then get help right away.\n\nOn Simpulo you can report a person, a message or a photo in one tap and get help from the House page during your stay. Before you've paid, you can step back from a House without cost."
        },
          "s7": {"q": "How do time zones and calls fit into a shared house?", "a": "Ask everyone's working hours on the first day. If one person has calls late in the evening and another starts at six in the morning, plan rooms around that rather than hoping it works out.\n\nA simple sign on the call room door, or a message in the group chat before a long call, saves a lot of friction. And when calls clash with dinner, move dinner – food tastes better without a laptop on the table anyway."}
      },
      "worthIt": {
        "title": "Is co-living worth it? Living with strangers for a few weeks",
        "description": "An honest look at co-living for a few weeks: what you get, what it costs, who it suits – and how to make it work.",
        "intro": "Living with people you haven't met sounds like a gamble. For a few weeks, with the right people and a clear frame, it's often the best part of a trip. Here's an honest look.",
        "s1": {
          "q": "What is co-living for a few weeks, exactly?",
          "a": "Not a hostel and not a flatshare. A small group – usually three to eight people – shares one place for a fixed time, often around a theme: surfing, training, working remotely, slowing down.\n\nOn Simpulo that's called a House: a host opens it with a place and dates, people ask to join, and the crew lives there together for the stay."
        },
        "s2": {
          "q": "What do you actually get out of it?",
          "a": "Company without effort. In a shared house the conversations happen at breakfast, not because you went looking for them.\n\nYou also get a better place than you'd book alone and people who know things you don't. And sometimes you get more: a few weeks of shared days turn strangers into friends faster than months of occasional coffees."
        },
        "s3": {
          "q": "What are the downsides?",
          "a": "Less control. You share the kitchen, the bathroom and the noise, and not everyone will become your friend. Some evenings you'll want to be alone – plan for that, and say it.\n\nThe risk is lower than it sounds when the frame is clear: fixed dates, a shared reason to be there, and a few agreed basics like quiet hours and guests."
        },
        "s4": {
          "q": "Is it cheaper than travelling alone?",
          "a": "Usually, yes. A shared house costs less per person than a hotel room of the same standard, and cooking together saves more.\n\nOn Simpulo everyone pays an equal share of the place, plus a {fee} % service fee on their share. Nothing is charged before the host says yes and the crew is complete, so you never pay for a group that didn't happen."
        },
        "s5": {
          "q": "Who is it for – and who not?",
          "a": "It suits people who like people but don't need them all the time: solo travellers, remote workers, people between two chapters of life.\n\nIt suits you less if you need total quiet, or if you want to decide everything alone. Then choose a calmer House, a smaller crew – or a room of your own for this trip."
        },
        "s6": {
          "q": "How do you make it work?",
          "a": "Choose the House by its people and its purpose, not only by its photos. Ask the host a question if something matters to you.\n\nThen show up for the shared moments – the first dinner, a day out together, the last evening. Those few hours carry the whole stay. Afterwards you can say who you'd live with again; when it's mutual, you stay connected for the next House."
        },
          "s7": {"q": "How do you choose the right House?", "a": "Start with why you're going. A House for training, for working or for slowing down attracts different people, and that's the point – the theme does the first part of the matching.\n\nThen check the practical things: the dates, the size of the crew, the price per person and where the place is. Read the host's few lines about why they're hosting; they tell you more about the atmosphere than any photo. And look at who's already in. If you'd happily share a breakfast with them, you're probably in the right place."}
      },
      "friendsNewCity": {
        "title": "How to make friends when you move to a new city",
        "description": "Friendship needs time together. How to find it in a new city – from the first week to the people you'll still know in a year.",
        "intro": "Moving to a new city is exciting for about three weeks. Then you notice that nobody calls. Making friends as an adult is hard – mostly because nobody has time. Here's what actually helps.",
        "s1": {
          "q": "Why is it so hard to make friends as an adult?",
          "a": "Because friendship needs time together, and adults rarely get it. At school and university you saw the same people every day without planning it. In a new city every meeting has to be arranged – and most never go beyond the first coffee.\n\nThe fix isn't meeting more people. It's spending more time with a few."
        },
        "s2": {
          "q": "Where do you meet people at all?",
          "a": "Go where people come back: a club, a class, a regular run, a volunteer group. Seeing the same faces every week does more than any single event.\n\nPick something you'd do anyway. You'll stick with it – and the people you meet there already share one thing with you."
        },
        "s3": {
          "q": "How do you turn acquaintances into friends?",
          "a": "Ask twice. Most friendships die after one nice evening because nobody suggests the second. Make the next plan before you part, even a small one.\n\nAnd go a little deeper than small talk. Asking what someone is in the middle of in their life is a better question than what they do for work."
        },
        "s4": {
          "q": "Can living with people speed it up?",
          "a": "A lot. A few weeks under one roof give you more time together than months of meetups: breakfasts, plans for tomorrow, a last evening.\n\nThat's the idea behind a House on Simpulo – a place for a few weeks with people who share your thing. When you arrive in a new city, joining one for your first month is a way to land with people instead of alone."
        },
        "s5": {
          "q": "How do you keep the people you meet?",
          "a": "Make it easy to stay in touch: a group chat, a monthly dinner, the next trip planned together. Friendship fades without shared plans, not without feelings.\n\nAfter a House on Simpulo you can say who you'd live with again. Only a choice that goes both ways is shown, and those people stay in your network."
        },
        "s6": {
          "q": "What if it takes longer than you hoped?",
          "a": "It usually does – most people need months, not weeks. That's normal, not a sign that something is wrong with you.\n\nKeep showing up to the same places, say yes more than you feel like, and give it time. And be the person who invites: in every new city, someone is waiting for exactly that."
        },
          "s7": {"q": "What if you're shy or introverted?", "a": "Then choose settings that do the talking for you. A class, a team sport or a shared house gives you something to do together, so the conversation can come slowly.\n\nSmall groups are easier than big ones. Three people at a kitchen table beat thirty at a party. And it's fine to need time alone in between – friendships don't need constant contact, they need repeated contact."},
          "s8": {"q": "What's one thing you can do this week?", "a": "Invite one person to one thing. Not a big plan – a coffee, a walk, a dinner where you cook too much on purpose.\n\nIf you have just arrived, look for something with a fixed start and end: a course, a weekly run, a House for a few weeks. A clear frame makes it easier to say yes, and the repetition does the rest."}
      }
    }
  },
  "helpCenter": {
    "title": "Help center",
    "intro": "Short answers about joining, hosting, money, safety and your account.",
    "searchLabel": "Search the help center",
    "searchPlaceholder": "Search, e.g. “cancel” or “refund”",
    "categoriesLabel": "Topics",
    "categories": { "joining": "Joining", "hosting": "Hosting", "payments": "Payments & refunds", "safety": "Safety", "account": "Your account" },
    "results": "{count, plural, =0 {Nothing found for “{query}”} one {# answer for “{query}”} other {# answers for “{query}”}}",
    "clear": "Clear",
    "stuckTitle": "Still stuck?",
    "stuckText": "Write to us – we read every message.",
    "contactPoint": "Contact point for authorities and users: <mail>{email}</mail>",
    "reportContent": "Report illegal content",
    "getHelp": "Get help",
    "shareIdea": "Share an idea"
  },
  "hostPage": {
    "eyebrow": { "prelaunch": "Founding Hosts wanted", "beta": "Founding Houses are open", "live": "For hosts" },
    "title": "Open a House. Bring your people.",
    "sentence": "Share a place for a few weeks with people who share your thing – everyone pays their share, and you choose who's in.",
    "apply": "Apply to host",
    "open": "Open a House",
    "howLink": "How it works",
    "how": {
      "eyebrow": "How hosting works",
      "title": "Four steps",
      "steps": {
        "open": { "title": "Open", "text": "Pick a theme and a place – one you have, or one you find with your crew." },
        "crew": { "title": "Set your crew size and dates", "text": "How many people, which month or exact dates, what each pays." },
        "accept": { "title": "Accept requests", "text": "People ask to join. Nobody is in without your yes." },
        "live": { "title": "Live it", "text": "Everyone pays their share once the crew is complete – then you live it together." }
      }
    },
    "types": {
      "eyebrow": "Share or Pro",
      "title": "Two ways to host",
      "share": "Share host",
      "pro": "Pro host",
      "shareSub": "Share the rent, live it together.",
      "proSub": "Lead the House with your own programme.",
      "rows": {
        "fee": { "label": "Host fee", "share": "None", "pro": "You set it, per guest" },
        "tasks": { "label": "Your tasks", "share": "Three small ones: check-in info, a welcome, confirm the House agreement", "pro": "The same three" },
        "programme": { "label": "Programme", "share": "None needed", "pro": "Your own – coaching, guiding, a daily plan" },
        "simpulo": { "label": "Simpulo keeps", "share": "Nothing from you", "pro": "{percent} % of your host fee" },
        "you": { "label": "You get", "share": "A House for your share", "pro": "Your host fee, minus {percent} %" }
      }
    },
    "example": {
      "eyebrow": "An example",
      "title": "The numbers, honestly",
      "place": "{place} for {nights} nights",
      "people": "people, you included",
      "share": "each – you too",
      "fee": "service fee per guest, not you",
      "pro": "Pro: {perGuest} host fee × {guests} guests",
      "simpulo": "Simpulo keeps {percent} %",
      "earn": "you earn as a Pro host",
      "minFee": "Guests pay a {percent} % service fee on their share, at least €{min} per booking – already in the price they see."
    },
    "home": {
      "eyebrow": "Host from your place",
      "title": "Your home, a few weeks at a time",
      "text": "Save the place you live in and open it for a few weeks – your free rooms are the spots, and you're part of the crew.",
      "link": "Can I host where I live?"
    },
    "founding": {
      "eyebrow": "Founding Hosts",
      "title": "Be one of the first",
      "text": "The first hosts shape what Simpulo becomes – and get a few things for it.",
      "perks": {
        "badge": { "title": "The Founding badge", "text": "On your profile and your Houses, for good." },
        "stage": { "title": "On the stage", "text": "Your Houses are among the first people see when we open." },
        "early": { "title": "Early access", "text": "Open your House before anyone else." }
      }
    },
    "safety": {
      "eyebrow": "Safety and support",
      "title": "You're not on your own",
      "items": {
        "decide": { "title": "You decide who joins", "text": "Every request needs your yes – you can ask for verified guests only." },
        "pay": { "title": "Paid through Simpulo", "text": "No cash, no chasing. The money comes once everyone has paid." },
        "help": { "title": "Help during the stay", "text": "Something goes wrong? Get help right from your House." },
        "report": { "title": "Report and block", "text": `One tap – we look at every report within ${H.reportReview} hours.` }
      },
      "link": "Safety for hosts"
    },
    "faq": { "title": "Questions from hosts", "all": "All questions" },
    "cta": {
      "title": { "prelaunch": "Apply to host", "beta": "Open your Founding House", "live": "Open your House" },
      "text": { "prelaunch": "We're picking the first hosts by hand – it takes two minutes.", "beta": "Founding Houses are open – nothing is paid until launch.", "live": "It's free to open a House. You pay your share like everyone else." }
    }
  },
  "aboutPage": {
    "eyebrow": "About Simpulo",
    "mission": "No one should have to go through life alone.",
    "whyTitle": "Why Simpulo",
    "why": {
      "time": "Friendship needs time together – not one dinner, but days that run into each other. Most adults barely get that anymore.",
      "dense": "A few weeks in one House is time made dense: breakfasts, plans for tomorrow, a last evening. That's how strangers become your people.",
      "houses": "So Simpulo is built around Houses: a place, a few weeks, a crew that shares your thing – and a way to keep the ones you'd live with again."
    },
    "founderTitle": "Who's behind it",
    "founderWrite": "Write to {name}",
    "founderPlaceholder": "Founder section – fill FOUNDER in config/pages.ts (photo, first name, two sentences, email). Hidden outside dev until then.",
    "valuesTitle": "What we hold to",
    "values": {
      "private": { "title": "Private, not anonymous", "text": "Real first names and faces for the people you live with – nothing public you didn't choose." },
      "real": { "title": "Real people, real time", "text": "No feeds, no likes. Time together in one place is the point." },
      "network": { "title": "You own your network", "text": "The people you choose stay yours – no one else sees who they are." }
    },
    "explore": "Explore Houses",
    "host": "Become a host"
  },
  "landing": {
    "title": "Share a place. Find your people.",
    "sentence": "Live together for a while with people who share your thing.",
    "whereNext": "Where to next?",
    "exploreAll": "See all Houses",
    "emailLabel": "Your email",
    "emailPlaceholder": "you@email.com",
    "join": "Join the waitlist",
    "how": {
      "eyebrow": "How it works",
      "title": "Three steps to your people",
      "steps": {
        "find": { "title": "Find a House", "text": "A place, a few weeks, a theme – and a host who opens it." },
        "join": { "title": "Join the crew", "text": "Ask to join. You pay your share only once the host says yes and the crew is complete." },
        "leave": { "title": "Leave with your people", "text": "Live together, then keep the ones you'd live with again." }
      }
    },
    "arc": {
      "eyebrow": "What makes a House",
      "title": "A few weeks that feel like a year",
      "text": "Every House has an arc – a few small moments that turn strangers into a crew.",
      "phases": {
        "before": "Before: say hi, share why you're coming.",
        "arrival": "Arrival: a first night with a few good questions.",
        "together": "Together: small plans for tomorrow, one big highlight.",
        "goodbye": "Goodbye: a closing circle on the last evening.",
        "after": "After: you choose who you'd live with again."
      }
    },
    "houses": {
      "examplesTitle": "Example Houses",
      "examplesText": "Examples of what Houses will look like – not bookable yet.",
      "openTitle": "Houses open now",
      "openText": "Real Houses with real crews – pick one and ask to join.",
      "seeAll": "See all"
    },
    "trust": {
      "eyebrow": "Trust",
      "title": "Living with new people, safely",
      "items": {
        "verified": { "title": "Verified hosts", "text": "Hosts can verify their ID with Stripe – you see the check on their profile." },
        "payAfterYes": { "title": "Pay only after the host says yes", "text": "Asking is free. Nothing is charged until you're accepted and the crew is complete." },
        "helpOnSite": { "title": "Help on site", "text": "Something wrong during your stay? Get help right from the House." },
        "report": { "title": "Report in one tap", "text": `Report a person, a message or a photo – we look at it within ${H.reportReview} hours.` }
      },
      "safety": "How we keep Houses safe"
    },
    "hosts": {
      "eyebrow": "For hosts",
      "title": "Open a House around your thing",
      "text": "Share your place or find one with your crew. Everyone pays their share – you can add a fee if you lead the programme.",
      "become": "Become a host",
      "howHosting": "How hosting works"
    },
    "faq": {
      "title": "Questions",
      "all": "All questions"
    },
    "guides": {
      "title": "Guides",
      "all": "All guides"
    },
    "phase": {
      "prelaunch": {
        "eyebrow": "Opening {month}",
        "stageNote": "Be the first to know when Houses open – one email, nothing else.",
        "closingTitle": "Be there when the first Houses open",
        "closingText": "Join the waitlist – we'll email you once, when Simpulo opens."
      },
      "beta": {
        "eyebrow": "Founding Houses are open",
        "stageNote": "Reserve a spot now – nothing is paid until launch.",
        "closingTitle": "Find your first House",
        "closingText": "Founding Houses are open – reserve your spot."
      },
      "live": {
        "eyebrow": "Co-living for a few weeks",
        "stageNote": "Free to ask. Pay only after the host says yes.",
        "closingTitle": "Find your people",
        "closingText": "Houses are open around the world – pick yours."
      }
    }
  },
  "deadlines": {
    "remindHost": "Remind {name}",
    "remindedHost": "{name} got a reminder",
    "remindHostOnce": "You can remind them once.",
    "remindHostEarly": "You can remind them in {hours, plural, one {# hour} other {# hours}}.",
    "remindHostUsed": "You reminded {name} – once is enough. The request stays open until it runs out.",
    "remindGuest": "Remind",
    "remindGuestLabel": "Remind {name} to pay",
    "remindedGuestLabel": "{name} was reminded",
    "remindedGuestShort": "Reminded",
    "remindGuestUsed": "Reminded once – Simpulo reminds them again before the time runs out.",
    "remindedGuest": "Reminder sent to {name}",
    "remindAll": "Remind everyone",
    "remindedAll": "{count, plural, one {Reminder sent to # person} other {Reminder sent to # people}}",
    "remindAllUsed": "Everyone open was reminded once. Simpulo reminds them again before the time runs out."
  },
  "platform": {
    "apply": {
      "eyebrow": "Before we open",
      "title": "Become a host",
      "text": "We're picking the first hosts by hand. Tell us about the House you'd open – it takes two minutes.",
      "back": "Back to Explore",
      "plus": "Apply to host",
      "name": "Your name",
      "email": "Email",
      "social": "A link to you",
      "socialHint": "Instagram, TikTok, YouTube or your website",
      "reach": "Followers",
      "reachHint": "Roughly, across your channels",
      "optional": "Optional",
      "topic": "Theme",
      "topicPick": "Pick a theme",
      "place": "Where",
      "placeHint": "A city or region",
      "when": "Roughly when",
      "whenAny": "Not sure yet",
      "why": "Why I want to host",
      "whyHint": "One sentence is enough.",
      "send": "Send application",
      "invalidEmail": "Check your email address.",
      "invalidLink": "Add a link that starts with https://",
      "sentTitle": "Application received",
      "sentText": "Thanks, {name}. We read every application and answer within a few days – by email to {email}.",
      "statusNew": "Application received",
      "statusNewText": "We're reading it – you'll hear from us by email.",
      "statusQuestion": "We have a question",
      "statusQuestionText": "We emailed you – reply there and we'll go on.",
      "statusYes": "You're a Founding Host",
      "getStarted": "Get started",
    "statusYesText": "Your application is accepted. You can open your House now.",
      "statusNo": "Not this time",
      "statusNoText": "Thank you for applying. We can't take every host yet – we'll write when that changes.",
      "openHouse": "Open a House",
      "applied": "Applied {date}",
      "accountGroup": "Hosting",
      "accountRow": "Host application"
    },
    "waitlist": {
      "join": "Join the waitlist",
      "toast": "You're on the list – we'll let you know when Simpulo opens.",
      "title": "Join the waitlist",
      "subtitle": "We'll email you when Houses open – nothing else.",
      "email": "Email",
      "where": "Where",
      "whereHint": "A city or region",
      "theme": "Theme",
      "themeAny": "Any theme",
      "when": "When",
      "whenAny": "Any time",
      "optional": "Optional",
      "consent": "Email me when Houses open here",
      "consentHint": "Required – you can unsubscribe with one click in every email.",
      "send": "Join",
      "invalidEmail": "Check your email address.",
      "sentTitle": "Check your inbox",
      "sentText": "We sent a link to {email}. Click it to confirm – then you're on the list.",
      "done": "Done",
      "confirmedTitle": "You're on the list",
      "confirmedText": "We'll email you when Houses open – nothing else.",
      "unknownTitle": "This link doesn't work",
      "unknownText": "It may be old or mistyped. Sign up again from Explore.",
      "unsubscribe": "Unsubscribe",
      "unsubscribeTitle": "Unsubscribe from the waitlist?",
      "unsubscribeText": "You won't get any more emails about Houses opening.",
      "unsubscribeConfirm": "Unsubscribe",
      "unsubscribedTitle": "You're unsubscribed",
      "unsubscribedText": "No more emails from the waitlist. You can join again any time.",
      "explore": "Explore"
    },
    "hero": {
      "title": "Find your people.",
      "sub": "Come for the place, stay for the people.",
      "becomeHost": "Become a Founding Host"
    },
    "empty": {
      "title": "Be the first here",
      "hostHere": "Host here"
    },
    "example": {
      "capsule": "Example",
      "house": "Example House",
      "upTo": "Up to {count} people",
      "note": "This is an example. Real Houses open in {month}.",
      "hostLike": "Host one like this",
      "noProfile": "A sample House – no real host yet"
    },
    "founding": {
      "capsule": "Founding House"
    },
    "ownPlace": {
      "capsule": "Host lives here"
    }
  },
  "ideas": {
    "title": "Top ideas",
    "intro": "What people want next – vote for the ones you want too.",
    "vote": "Vote",
    "voted": "Voted",
    "votes": "{count, plural, one {# vote} other {# votes}}",
    "planned": "Planned",
    "empty": "No ideas yet.",
    "share": "Share an idea"
  },
  "depth": {
    "capsule": {
      "easy": "Easy House",
      "balanced": "Balanced House",
      "deep": "Deep House"
    },
    "label": {
      "easy": "Easy",
      "balanced": "Balanced",
      "deep": "Deep"
    }
  },
  "preview": {
    "text": "This is a private preview of Simpulo.",
    "password": "Password",
    "wrong": "Wrong password",
    "enter": "Enter"
  },
  "emails": {
    "wordmark": "simpulo",
    "impressum": "Impressum",
    "privacy": "Privacy",
    "unsubscribe": "Unsubscribe from these emails",
    "settings": "Notification settings",
    "always": "You get this email because it's about your booking, your money or your account.",
    "magicLink": {
      "preview": "Tap to sign in – the link works for 15 minutes.",
      "headline": "Sign in to Simpulo",
      "action": "Sign in",
      "body": "Tap the button to sign in. The link works once, for 15 minutes.",
      "ignore": "Didn't ask for it? Ignore this email – nothing happens."
    },
    "weekly": {
      "headline": "{count, plural, one {A new House near your search} other {# new Houses near your searches}}",
      "action": "See them on Simpulo",
      "intro": "This week on Simpulo:"
    },
    "chatDigest": {
      "headline": "{count, plural, one {{name} wrote to you} other {# unread messages}}",
      "action": "Reply",
      "subject": "{count, plural, one {{subject}} other {# unread messages on Simpulo}}"
    }
  },
  "og": {
    "tagline": "Share a place. Find your people.",
    "siteTitle": "Simpulo – Share a place. Find your people.",
    "brand": "Simpulo",
    "spots": "{open, plural, =0 {Full} one {# spot left} other {# spots left}}",
    "openHouses": "{count, plural, one {# open House} other {# open Houses}}",
    "invite": {
      "alt": "You're invited to a House on Simpulo",
      "title": "You're invited to a House",
      "line": `Your spot is held for ${H.invite} hours.`,
      "eyebrow": "Invite",
      "strong": "Accept on Simpulo"
    },
    "priceTbd": "Price set with crew",
    "house": {
      "alt": "A House on Simpulo: cover, title, dates, place, price, crew and free spots",
      "crewLine": "{in} of {total} in · {spots}",
      "hostedBy": "Hosted by {name}"
    },
    "coLiving": {
      "alt": "Co-living on Simpulo: open Houses in this city",
      "eyebrow": "Co-living",
      "title": "Co-living in {city}"
    }
  },
  "receipt": {
    "docTitle": "Simpulo – Receipt",
    "number": "Receipt no. {id}",
    "share": "Share: {amount}",
    "hostExperience": "Host experience: {amount}",
    "fee": "Simpulo fee (included): {amount}",
    "total": "Total paid: {amount}",
    "paid": "Paid {date} with {brand} ****{last4}"
  }
};

export default en;

/** The shape every product language must have (keys and nesting as en). */
export type ProductMessages = typeof en;

