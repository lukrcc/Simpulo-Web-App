// The admin's symbols (CLAUDE.md "Admin: eine Farbe = eine Seite"): one set of line symbols (lucide-react, same size and stroke), named in
// the config (config/admin/pages.ts, config/admin/cards/*) and looked up here – only the ones in use, so the bundle stays small.
import {
  Activity, AlertTriangle, ArrowUpRight, Award, BarChart3, BedDouble, Bookmark, Box, Building2, CalendarDays, CalendarRange, CircleCheck,
  CircleX, ClipboardList, Clapperboard, Clock, Coins, Compass, CreditCard, Eye, FileText, Filter, Flag, FlaskConical, FolderOpen, Gauge, Gem,
  GitBranch, Globe, Handshake, HeartHandshake, Home, Inbox, Infinity as InfinityIcon, Landmark, Layers, LayoutGrid, Lightbulb, ListChecks, Mail,
  Map as MapIcon, MapPin, Megaphone, MessageSquare, MinusCircle, Network, Percent, PieChart, PiggyBank, Repeat, Rocket, Scale, ScatterChart,
  ScrollText, Search, SearchCheck, Shapes, ShieldOff, SlidersHorizontal, Smartphone, Split, Star, Tags, Target, ThumbsUp, Timer, TrendingUp,
  User, UserPlus, Users, Wallet, Wrench, Store, Waves, ShieldCheck, Sprout, Sparkles, type LucideIcon,
} from "lucide-react";

export const ADMIN_ICONS = {
  Activity, AlertTriangle, ArrowUpRight, Award, BarChart3, BedDouble, Bookmark, Box, Building2, CalendarDays, CalendarRange, CircleCheck,
  CircleX, ClipboardList, Clapperboard, Clock, Coins, Compass, CreditCard, Eye, FileText, Filter, Flag, FlaskConical, FolderOpen, Gauge, Gem,
  GitBranch, Globe, Handshake, HeartHandshake, Home, Inbox, Infinity: InfinityIcon, Landmark, Layers, LayoutGrid, Lightbulb, ListChecks, Mail,
  Map: MapIcon, MapPin, Megaphone, MessageSquare, MinusCircle, Network, Percent, PieChart, PiggyBank, Repeat, Rocket, Scale, ScatterChart,
  ScrollText, Search, SearchCheck, Shapes, ShieldOff, SlidersHorizontal, Smartphone, Split, Star, Tags, Target, ThumbsUp, Timer, TrendingUp,
  User, UserPlus, Users, Wallet, Wrench, Store, Waves, ShieldCheck, Sprout, Sparkles,
} satisfies Record<string, LucideIcon>;

export type AdminIconName = keyof typeof ADMIN_ICONS;
