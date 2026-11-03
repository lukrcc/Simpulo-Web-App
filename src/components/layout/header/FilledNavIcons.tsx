import type { ComponentType, SVGProps } from "react";
import type { NavItem } from "@/components/layout/nav";

/*
 * The header nav's current page: Lucide's own paths and stroke, filled, so the shape doesn't change between the two (Lucide
 * has no filled set). Details that would vanish in a solid shape are cut out: the compass's needle, the house's door. The
 * cut-outs show the header behind them, so there's no colour here but the text's.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  );
}

function CompassFilled(props: IconProps) {
  return (
    <Base {...props}>
      <path stroke="none" fillRule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M16.24 7.76l-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" />
      <circle cx="12" cy="12" r="10" fill="none" />
    </Base>
  );
}

function MapPinFilled(props: IconProps) {
  const pin = "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0";
  return (
    <Base {...props}>
      <path stroke="none" fillRule="evenodd" d={`${pin} M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z`} />
      <path fill="none" d={pin} />
    </Base>
  );
}

function HouseFilled(props: IconProps) {
  const house = "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z";
  return (
    <Base {...props}>
      <path stroke="none" fillRule="evenodd" d={`${house} M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8z`} />
      <path fill="none" d={house} />
    </Base>
  );
}

function MessageCircleFilled(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
    </Base>
  );
}

function MegaphoneFilled(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
      <path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14" />
    </Base>
  );
}

function LightbulbFilled(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5z" />
      <path fill="none" d="M9 18h6" />
      <path fill="none" d="M10 22h4" />
    </Base>
  );
}

const FILLED: Partial<Record<NavItem["labelKey"], ComponentType<IconProps>>> = {
  explore: CompassFilled,
  whereNext: MapPinFilled,
  houses: HouseFilled,
  messages: MessageCircleFilled,
  host: MegaphoneFilled,
  howItWorks: LightbulbFilled,
};

const LAYER = "absolute inset-0 size-4 nav:size-5 transition-opacity duration-150 motion-reduce:transition-none";

/** 20px (16px below 1024px), both forms on top of each other: the current page crossfades to the filled one. Colour comes from the link's text. */
export function NavIcon({ item, active }: { item: NavItem; active: boolean }) {
  const Outline = item.icon;
  const Filled = FILLED[item.labelKey] ?? Outline;
  return (
    <span aria-hidden className="relative size-4 shrink-0 nav:size-5">
      <Outline data-nav-icon="outline" style={{ opacity: active ? 0 : 1 }} className={LAYER} />
      <Filled data-nav-icon="filled" style={{ opacity: active ? 1 : 0 }} className={LAYER} />
    </span>
  );
}
