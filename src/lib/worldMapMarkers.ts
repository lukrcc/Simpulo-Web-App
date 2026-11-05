// The world map's markers: which places are one circle at which zoom. Pure, in the map's own units (WORLD_WIDTH × WORLD_HEIGHT of the
// Natural Earth projection). Supercluster thinks in lng/lat under Web Mercator, so the units are handed over as the lng/lat that lands on
// exactly them: its pixel radius is then a pixel radius on this map, whatever the projection does to the poles.
import Supercluster from "supercluster";
import type { Continent } from "./worldRegions";

export interface MapPlaceBase {
  id: string;
  x: number;
  y: number;
  continent: Continent | null;
  /** Everyone looking for it */
  people: number;
}

export interface MapMarker<P extends MapPlaceBase> {
  key: string;
  x: number;
  y: number;
  places: P[];
  /** More than one place */
  cluster: boolean;
  /** The world view's circle of a whole region */
  regional: boolean;
  /** All its places are in this region */
  continent: Continent | null;
}

const UNITS = 1000;
/** Supercluster's tile size: its pixels at zoom z are this × 2^z across the world. */
const EXTENT = 512;
/** How close two places may be before they're looked at as a cluster, in pixels. Overlaps are settled afterwards. */
const CLUSTER_RADIUS = 44;
const MAX_ZOOM = 16;
/** Air between two circles. */
const GAP = 3;
export const MIN_RADIUS = 14;
export const MAX_RADIUS = 30;

const toLngLat = (x: number, y: number): [number, number] => [(x / UNITS - 0.5) * 360, ((2 * Math.atan(Math.exp(Math.PI * (1 - (2 * y) / UNITS))) - Math.PI / 2) * 180) / Math.PI];

const people = <P extends MapPlaceBase>(places: readonly P[]) => places.reduce((total, p) => total + p.people, 0);

function markerOf<P extends MapPlaceBase>(places: P[], regional = false): MapMarker<P> {
  const weight = (p: P) => Math.max(1, p.people);
  const total = places.reduce((n, p) => n + weight(p), 0);
  const continent = places[0].continent !== null && places.every((p) => p.continent === places[0].continent) ? places[0].continent : null;
  return {
    key: regional ? `region-${continent}` : places.length === 1 ? places[0].id : `cluster-${places.map((p) => p.id).toSorted()[0]}-${places.length}`,
    x: places.reduce((n, p) => n + p.x * weight(p), 0) / total,
    y: places.reduce((n, p) => n + p.y * weight(p), 0) / total,
    places,
    cluster: places.length > 1,
    regional,
    continent,
  };
}

/** A circle's radius in pixels, from how many people it stands for. `top`: the most any region has. */
export function radiusOf(count: number, top: number): number {
  return MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * Math.sqrt(Math.min(1, count / Math.max(1, top)));
}

const markerRadius = <P extends MapPlaceBase>(m: MapMarker<P>, top: number) => radiusOf(people(m.places), top);

export function createMapClusters<P extends MapPlaceBase>(places: readonly P[]) {
  const byId = new Map(places.map((p) => [p.id, p]));
  const index = new Supercluster<{ id: string }>({ radius: CLUSTER_RADIUS, extent: EXTENT, minZoom: 0, maxZoom: MAX_ZOOM });
  index.load(places.map((p) => ({ type: "Feature", properties: { id: p.id }, geometry: { type: "Point", coordinates: toLngLat(p.x, p.y) } })));
  const regions = new Map<Continent, P[]>();
  for (const p of places) if (p.continent) regions.set(p.continent, [...(regions.get(p.continent) ?? []), p]);
  const top = Math.max(1, ...[...regions.values()].map((list) => people(list)));

  return {
    top,
    /** One circle per region, pushed apart where a small map would make them touch. `pixels`: pixels per unit. */
    world(pixels: number): MapMarker<P>[] {
      const markers = [...[...regions.values()].map((list) => markerOf(list, true)), ...places.filter((p) => !p.continent).map((p) => markerOf([p]))];
      for (let round = 0; round < 40; round++) {
        let moved = false;
        for (let i = 0; i < markers.length; i++) {
          for (let j = i + 1; j < markers.length; j++) {
            const [a, b] = [markers[i], markers[j]];
            const dx = (b.x - a.x) * pixels || 1;
            const dy = (b.y - a.y) * pixels;
            const distance = Math.hypot(dx, dy);
            const need = markerRadius(a, top) + markerRadius(b, top) + GAP;
            if (distance >= need) continue;
            const push = (need - distance) / 2 / distance / pixels;
            a.x -= dx * push;
            a.y -= dy * push;
            b.x += dx * push;
            b.y += dy * push;
            moved = true;
          }
        }
        if (!moved) break;
      }
      return markers;
    },
    /** The zoom level for this many pixels per unit: the markers only change when this does. */
    zoomOf: (pixels: number) => Math.max(0, Math.min(MAX_ZOOM, Math.floor(Math.log2((UNITS * pixels) / EXTENT)))),
    /** Cities and clusters at a zoom level. `atLeast`: the fewest pixels per unit this level is seen at; further in, everything is only further apart. */
    at(zoom: number, atLeast: number): MapMarker<P>[] {
      // Level 0 is also seen smaller than its own scale; above it, a level starts exactly there.
      const pixels = zoom === 0 ? atLeast : Math.max(atLeast, (EXTENT * 2 ** zoom) / UNITS);
      let markers = index.getClusters([-180, -90, 180, 90], zoom).map((feature) => {
        const props = feature.properties as { id?: string; cluster?: boolean; cluster_id?: number };
        const ids = props.cluster ? index.getLeaves(props.cluster_id!, Infinity).map((leaf) => leaf.properties.id) : [props.id!];
        return markerOf(ids.flatMap((id) => byId.get(id) ?? []));
      });
      // Whatever still touches becomes one circle. That can make it larger, so once more until nothing does.
      for (let merged = true; merged; ) {
        merged = false;
        search: for (let i = 0; i < markers.length; i++) {
          for (let j = i + 1; j < markers.length; j++) {
            const [a, b] = [markers[i], markers[j]];
            if (Math.hypot(a.x - b.x, a.y - b.y) * pixels >= markerRadius(a, top) + markerRadius(b, top) + GAP) continue;
            markers = [...markers.filter((m) => m !== a && m !== b), markerOf([...a.places, ...b.places])];
            merged = true;
            break search;
          }
        }
      }
      return markers;
    },
    radius: (marker: MapMarker<P>) => markerRadius(marker, top),
  };
}
