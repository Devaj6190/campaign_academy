"use client";

import { Map as MLMap, NavigationControl, setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import adResult from "@/lib/cases/mayor2013-ad.json";
import { groupsHere } from "@/lib/demographics";
import { DISTRICTS } from "@/lib/geo";
import { sentimentOf, useGame } from "@/lib/store";

// A real street map of New York (OpenFreeMap, no key) with the 59 community districts on top, coloured by
// how each one feels about Cole. Buildings rise in 3D when you zoom in on a district.

const STYLE = "https://tiles.openfreemap.org/styles/dark";
// The bundler can't serve MapLibre's worker, so it is copied to public/ on install (scripts/copy-map-worker.mjs).
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
const BLANK: StyleSpecification = { version: 8, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": "#060607" } }] };
const NYC: [[number, number], [number, number]] = [[-74.27, 40.49], [-73.68, 40.92]];

const geojson = {
  type: "FeatureCollection" as const,
  features: DISTRICTS.map((d) => ({
    type: "Feature" as const,
    id: d.cd,
    properties: { cd: d.cd, park: d.park },
    geometry: { type: "MultiPolygon" as const, coordinates: d.polys },
  })),
};

const boundsOf = (cd: number): [[number, number], [number, number]] | null => {
  const d = DISTRICTS.find((x) => x.cd === cd);
  if (!d) return null;
  let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
  for (const p of d.polys) for (const [x, y] of p[0]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [[x0, y0], [x1, y1]];
};

function focus(m: MLMap | null, ready: boolean, district: number | null, duration = 1400) {
  if (!m || !ready) return;
  m.setFilter("district-selected", ["==", ["get", "cd"], district ?? -1]);
  const b = district ? boundsOf(district) : null;
  if (b) m.fitBounds(b, { padding: 80, pitch: 50, bearing: -17, duration, maxZoom: 14.6 });
  else if (duration) m.fitBounds(NYC, { padding: 24, pitch: 0, bearing: 0, duration: 1000 });
}

async function loadStyle(): Promise<StyleSpecification | string> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 5000);
    const r = await fetch(STYLE, { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error(String(r.status));
    return (await r.json()) as StyleSpecification;
  } catch {
    return BLANK; // no tiles: the districts still draw on a plain background
  }
}

/** One Assembly District's certified 2013 votes (Board of Elections recaps, checked against the borough totals). */
export type RealRow = { ad: number; total: number; share: number; deblasio: number; thompson: number; quinn: number; liu: number; weiner: number };
export type Tip = { x: number; y: number; cd: number; real?: RealRow };

const LAYERS = { districts: ["district-fill", "district-line", "district-pulse", "district-selected"], real: ["real-fill", "real-line"] };
const show = (m: MLMap, real: boolean) => {
  for (const id of LAYERS.districts) m.setLayoutProperty(id, "visibility", real ? "none" : "visible");
  for (const id of LAYERS.real) m.setLayoutProperty(id, "visibility", real ? "visible" : "none");
};

export function MapCanvas({ onHover, onSelect, real = false }: { onHover: (t: Tip | null) => void; onSelect: (cd: number | null) => void; real?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const ready = useRef(false);
  const cbs = useRef({ onHover, onSelect, real });
  useEffect(() => { cbs.current = { onHover, onSelect, real }; });

  const sent = useGame((s) => s.sent);
  const filter = useGame((s) => s.filter);
  const factions = useGame((s) => s.factions);
  const district = useGame((s) => s.district);
  const ledger = useGame((s) => s.ledger.length);

  // Paint support (and, under a group filter, how many of that group live there) into feature state.
  const paint = () => {
    const m = map.current;
    if (!m || !ready.current) return;
    const world = useGame.getState();
    for (const d of DISTRICTS) {
      if (d.park) continue;
      const g = world.filter === "all" ? null : groupsHere(d.cd).find((x) => x.id === world.filter);
      const op = g ? 0.25 + 0.5 * Math.min(1, g.rel / 1.6) : 0.6;
      m.setFeatureState({ source: "districts", id: d.cd }, { v: sentimentOf(world, d.cd) * (world.filter === "all" ? 2 : 1), op });
    }
  };

  useEffect(() => {
    let dead = false;
    let hovered: number | null = null;
    (async () => {
      const style = await loadStyle();
      if (dead || !box.current) return;
      const m = new MLMap({ container: box.current, style, bounds: NYC, fitBoundsOptions: { padding: 24 }, maxBounds: [[-74.6, 40.35], [-73.4, 41.05]], attributionControl: { compact: true }, dragRotate: true });
      map.current = m;
      m.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
      m.on("load", () => {
        const firstLabel = m.getStyle().layers.find((l) => l.type === "symbol")?.id;
        if (m.getLayer("background")) m.setPaintProperty("background", "background-color", "#08080a");
        m.addSource("districts", { type: "geojson", data: geojson });
        const heat = ["interpolate", ["linear"], ["coalesce", ["feature-state", "v"], 50], 20, "rgb(70,116,214)", 47.5, "rgb(50,50,58)", 75, "rgb(240,162,59)"];
        m.addLayer({ id: "district-fill", type: "fill", source: "districts", filter: ["!", ["get", "park"]], paint: { "fill-color": heat as never, "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], ["+", ["coalesce", ["feature-state", "op"], 0.6], 0.18], ["coalesce", ["feature-state", "op"], 0.6]] as never, "fill-opacity-transition": { duration: 400 }, "fill-color-transition": { duration: 600 } } }, firstLabel);
        m.addLayer({ id: "district-line", type: "line", source: "districts", filter: ["!", ["get", "park"]], paint: { "line-color": "rgba(255,255,255,0.22)", "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.6, 14, 1.6] } }, firstLabel);
        m.addLayer({ id: "district-pulse", type: "line", source: "districts", paint: { "line-color": "#f0a23b", "line-blur": 3, "line-width": ["case", ["boolean", ["feature-state", "pulse"], false], 6, 0], "line-opacity": ["case", ["boolean", ["feature-state", "pulse"], false], 0.9, 0], "line-width-transition": { duration: 500 }, "line-opacity-transition": { duration: 900 } } });
        m.addLayer({ id: "district-selected", type: "line", source: "districts", filter: ["==", ["get", "cd"], -1], paint: { "line-color": "#ffffff", "line-width": 2.4 } });
        // The real 2013 result by Assembly District, coloured by de Blasio's share. Hidden until the case is finished.
        m.addSource("real", { type: "geojson", data: adResult as never });
        m.addLayer({ id: "real-fill", type: "fill", source: "real", paint: { "fill-color": ["interpolate", ["linear"], ["get", "share"], 25, "rgb(70,116,214)", 40, "rgb(50,50,58)", 55, "rgb(240,162,59)"] as never, "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.85, 0.68] as never } }, firstLabel);
        m.addLayer({ id: "real-line", type: "line", source: "real", paint: { "line-color": "rgba(255,255,255,0.22)", "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.6, 14, 1.6] } }, firstLabel);
        show(m, cbs.current.real);
        // 3D buildings from the street map's own building data, rising as you zoom in.
        if (m.getSource("openmaptiles")) {
          m.addLayer({ id: "buildings-3d", type: "fill-extrusion", source: "openmaptiles", "source-layer": "building", minzoom: 12, paint: { "fill-extrusion-color": "#3b3b45", "fill-extrusion-height": ["coalesce", ["get", "render_height"], 10] as never, "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0] as never, "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0, 13.2, 0.9] as never } }, firstLabel);
        }
        ready.current = true;
        paint();
        // Coming back to the map with a district already picked: go straight to it.
        focus(m, true, useGame.getState().district, 0);
      });
      // Only one of the two fills is visible at a time, so they share the hover bookkeeping.
      for (const [layer, source] of [["district-fill", "districts"], ["real-fill", "real"]] as const) {
        m.on("mousemove", layer, (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const id = Number(f.id);
          if (hovered !== id) {
            if (hovered != null) m.setFeatureState({ source, id: hovered }, { hover: false });
            hovered = id;
            m.setFeatureState({ source, id }, { hover: true });
          }
          m.getCanvas().style.cursor = source === "real" ? "" : "pointer";
          const r = m.getContainer().getBoundingClientRect();
          const at = { x: r.left + e.point.x, y: r.top + e.point.y };
          cbs.current.onHover(source === "real" ? { ...at, cd: 0, real: f.properties as RealRow } : { ...at, cd: id });
        });
        m.on("mouseleave", layer, () => {
          if (hovered != null) m.setFeatureState({ source, id: hovered }, { hover: false });
          hovered = null;
          m.getCanvas().style.cursor = "";
          cbs.current.onHover(null);
        });
      }
      m.on("click", (e) => {
        const f = m.queryRenderedFeatures(e.point, { layers: ["district-fill"] })[0];
        cbs.current.onSelect(f ? Number(f.id) : null);
      });
    })();
    return () => { dead = true; ready.current = false; map.current?.remove(); map.current = null; };
  }, []);

  // Recolour whenever support, the group filter or group feelings change.
  useEffect(paint, [sent, filter, factions]);

  // Swap between the student's campaign and the real result.
  useEffect(() => { if (map.current && ready.current) show(map.current, real); }, [real]);

  // Fly to the selected district and tilt so its buildings stand up; zoom back out when cleared.
  useEffect(() => focus(map.current, ready.current, district), [district]);

  // Districts that just changed glow for a moment, so the map visibly reacts to staff and to the candidate.
  const seen = useRef(0);
  useEffect(() => {
    const m = map.current;
    const entries = useGame.getState().ledger;
    const fresh = entries.slice(seen.current);
    seen.current = entries.length;
    if (!m || !ready.current) return;
    for (const l of fresh) {
      for (const cd of Object.keys(l.effect.sent)) {
        m.setFeatureState({ source: "districts", id: +cd }, { pulse: true });
        setTimeout(() => map.current?.setFeatureState({ source: "districts", id: +cd }, { pulse: false }), 2600);
      }
    }
  }, [ledger]);

  // MapLibre's stylesheet makes its container position: relative, so it fills a positioned wrapper instead.
  return (
    <div className="absolute inset-0 [&_.maplibregl-ctrl-attrib]:!bg-black/50 [&_.maplibregl-ctrl-attrib]:text-[10px] [&_.maplibregl-ctrl-group]:!bg-raised [&_.maplibregl-ctrl-group_button_span]:invert">
      <div ref={box} className="h-full w-full" />
    </div>
  );
}

