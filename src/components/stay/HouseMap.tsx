"use client";

import { useEffect, useRef, useState } from "react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
/** How much of the neighbourhood the soft circle covers while the exact place is open. */
const AREA_RADIUS_M = 1500;
const AREA_ZOOM = 13;
const PIN_ZOOM = 14;
/** Metres per pixel at zoom 0 on the equator: the static map's circle is drawn to the same 1.5km. */
const METRES_PER_PX_AT_ZOOM_0 = 156_543;
/** The embed's own "Open in Maps" sits along its top edge: that strip is cut off. Its bottom edge stays, Google's attribution is there. */
const EMBED_TOP_CROP = 56;
/**
 * The embed always brings a map-type thumbnail (bottom left) and a camera button (bottom right, above the attribution); no URL option turns them off.
 * The thumbnail is cut off on the left; the camera button lies under the "Open in Google Maps" capsule, which sits exactly over it (EMBED_CAPSULE).
 * Google's logo and attribution stay visible.
 */
const EMBED_LEFT_CROP = 64;
/** Nearly opaque, so the button under it doesn't show through the glass. */
export const EMBED_CAPSULE = { right: 10, bottom: 20, height: 44, backgroundColor: "color-mix(in srgb, var(--glass-solid) 97%, transparent)" } as const;
/** Without a key (or coordinates) it's the embed – the House page places its capsule over the embed's camera button then. */
export const mapIsEmbed = (hasCoordinates: boolean) => !API_KEY || !hasCoordinates;
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
  /** The soft circle's radius in metres (default 1.5 km; a booked place keeps it approximate at about 500 m) */
  radius?: number;
}

/**
 * The calm map (no POIs, no transit, no controls), loaded when it comes near the window. Without NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, or if
 * Google refuses it, Google's embed: it takes no styles and no circle, so the open case is a still picture with a circle of the same size.
 */
export function HouseMap({ lat, lng, pin, query, hasCoordinates, zoom, title, radius = AREA_RADIUS_M }: HouseMapProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(!API_KEY || !hasCoordinates);
  const [embedLoaded, setEmbedLoaded] = useState(false);

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
      const css = getComputedStyle(document.documentElement);
      const accent = css.getPropertyValue("--signal").trim();
      const plate = css.getPropertyValue("--plate").trim();
      const stage = css.getPropertyValue("--stage-bg").trim();
      const live = new (Map as unknown as new (element: HTMLElement, options: object) => unknown)(canvas, { center, zoom: pin ? PIN_ZOOM : AREA_ZOOM, styles: CALM_STYLES, gestureHandling: "none", disableDefaultUI: true, fullscreenControl: false, mapTypeControl: false, cameraControl: false, rotateControl: false, scaleControl: false, streetViewControl: false, zoomControl: false, keyboardShortcuts: false, clickableIcons: false });
      if (pin) new Marker({ map: live, position: center, icon: { path: SymbolPath.CIRCLE, scale: 8, fillColor: accent, fillOpacity: 1, strokeColor: plate, strokeWeight: 2 } });
      else new Circle({ map: live, center, radius, fillColor: stage, fillOpacity: 0.1, strokeWeight: 0, clickable: false });
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
  }, [failed, lat, lng, pin, radius]);

  if (failed) {
    const still = hasCoordinates && !pin;
    const src = still ? `https://www.google.com/maps?ll=${lat},${lng}&z=${AREA_ZOOM}&output=embed` : `https://www.google.com/maps?q=${query}&z=${zoom}&output=embed`;
    const circle = (2 * radius) / ((METRES_PER_PX_AT_ZOOM_0 * Math.cos((lat * Math.PI) / 180)) / 2 ** AREA_ZOOM);
    return (
      <>
        <iframe src={src} title={title} onLoad={() => setEmbedLoaded(true)} referrerPolicy="no-referrer-when-downgrade" tabIndex={-1} style={{ top: -EMBED_TOP_CROP, height: `calc(100% + ${EMBED_TOP_CROP}px)`, left: -EMBED_LEFT_CROP, width: `calc(100% + ${EMBED_LEFT_CROP}px)` }} className="pointer-events-none absolute border-0 saturate-50 brightness-[1.03] contrast-[0.95]" />
        {/* Only over a map: never a lone circle on an empty surface. */}
        {still && embedLoaded && <span aria-hidden className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/10" style={{ top: `calc(50% - ${EMBED_TOP_CROP / 2}px)`, left: `calc(50% - ${EMBED_LEFT_CROP / 2}px)`, width: circle, height: circle }} />}
      </>
    );
  }

  return (
    <>
      <div ref={canvasRef} role="img" aria-label={title} className="house-map absolute inset-0" />
      {/* Above Google's attribution, which has to stay readable. */}
    </>
  );
}
