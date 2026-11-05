"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useMediaQuery } from "@/lib/useMediaQuery";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
/** How much of the neighbourhood the soft circle covers while the exact place is open. */
const AREA_RADIUS_M = 1500;
const AREA_ZOOM = 13;
const PIN_ZOOM = 14;
/** Metres per pixel at zoom 0 on the equator: the static map's circle is drawn to the same 1.5km. */
const METRES_PER_PX_AT_ZOOM_0 = 156_543;
const CALM_STYLES = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

/** Only what this file uses of the Maps JavaScript API. */
type MapsApi = {
  importLibrary: (name: string) => Promise<Record<string, new (options: object) => unknown> & { SymbolPath: { CIRCLE: number } }>;
};
type MapsWindow = Window & { google?: { maps?: MapsApi }; gm_authFailure?: () => void; __simpuloMapsReady?: () => void };

let script: Promise<MapsApi> | undefined;
function loadMaps(): Promise<MapsApi> {
  script ??= new Promise((resolve, reject) => {
    const w = window as MapsWindow;
    w.__simpuloMapsReady = () => (w.google?.maps ? resolve(w.google.maps) : reject(new Error("no maps")));
    const tag = document.createElement("script");
    tag.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY ?? "")}&v=weekly&loading=async&callback=__simpuloMapsReady`;
    tag.async = true;
    tag.onerror = () => reject(new Error("maps failed to load"));
    document.head.append(tag);
  });
  return script;
}

interface HouseMapProps {
  lat: number;
  lng: number;
  /** Booked: a pin. Otherwise a soft circle over the neighbourhood. */
  pin: boolean;
  /** Places without coordinates: a text search */
  query: string;
  hasCoordinates: boolean;
  zoom: number;
  title: string;
}

/**
 * The calm map (no POIs, no transit, no controls), loaded when it comes near the window. Without NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, or if
 * Google refuses it, Google's embed: it takes no styles and no circle, so the open case is a still picture with a circle of the same size.
 */
export function HouseMap({ lat, lng, pin, query, hasCoordinates, zoom, title }: HouseMapProps) {
  const t = useTranslations("house.map");
  const coarse = useMediaQuery("(pointer: coarse)");
  const canvasRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(!API_KEY || !hasCoordinates);
  const [ready, setReady] = useState(false);
  const [mac, setMac] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (failed || !canvas) return;
    let cancelled = false;
    (window as MapsWindow).gm_authFailure = () => setFailed(true);
    const draw = async () => {
      const maps = await loadMaps();
      const [{ Map, Circle }, { Marker }, { SymbolPath }] = await Promise.all([maps.importLibrary("maps"), maps.importLibrary("marker"), maps.importLibrary("core")]);
      if (cancelled) return;
      const center = { lat, lng };
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
      const live = new (Map as unknown as new (element: HTMLElement, options: object) => unknown)(canvas, { center, zoom: pin ? PIN_ZOOM : AREA_ZOOM, styles: CALM_STYLES, gestureHandling: "cooperative", disableDefaultUI: true, clickableIcons: false });
      if (pin) new Marker({ map: live, position: center, icon: { path: SymbolPath.CIRCLE, scale: 8, fillColor: accent, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 } });
      else new Circle({ map: live, center, radius: AREA_RADIUS_M, fillColor: accent, fillOpacity: 0.15, strokeWeight: 0, clickable: false });
      setMac(/Mac|iPhone|iPad/.test(navigator.platform));
      setReady(true);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        draw().catch(() => setFailed(true));
      },
      { rootMargin: "400px" },
    );
    observer.observe(canvas);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [failed, lat, lng, pin]);

  if (failed) {
    const still = hasCoordinates && !pin;
    const src = still ? `https://www.google.com/maps?ll=${lat},${lng}&z=${AREA_ZOOM}&output=embed` : `https://www.google.com/maps?q=${query}&z=${zoom}&output=embed`;
    const circle = (2 * AREA_RADIUS_M) / ((METRES_PER_PX_AT_ZOOM_0 * Math.cos((lat * Math.PI) / 180)) / 2 ** AREA_ZOOM);
    return (
      <>
        <iframe src={src} title={title} loading="lazy" referrerPolicy="no-referrer-when-downgrade" tabIndex={still ? -1 : undefined} className={`absolute inset-0 size-full border-0 saturate-50 brightness-[1.03] contrast-[0.95] ${still ? "pointer-events-none" : ""}`} />
        {still && <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15" style={{ width: circle, height: circle }} />}
      </>
    );
  }

  return (
    <>
      <div ref={canvasRef} role="img" aria-label={title} className="house-map absolute inset-0" />
      {/* Above Google's attribution, which has to stay readable. */}
      {ready && (
        <GlassPanel className="pointer-events-none absolute bottom-7 right-2 rounded-full! px-3 py-1">
          <span className="text-small text-muted">{coarse ? t("hintTouch") : t(mac ? "hintMac" : "hintCtrl")}</span>
        </GlassPanel>
      )}
    </>
  );
}
