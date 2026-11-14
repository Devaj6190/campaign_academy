import raw from "./nyc.json";

// Real NYC community districts (NYC Open Data), projected once into SVG path strings.
/** Census ACS 5-year estimates (NYC Planning FactFinder). Percentages are 0-100. */
export type Demo = { pop: number; income: number; renters: number; age: number; otherLang: number; over65: number; age20to24: number; race: { white: number; black: number; asian: number; hispanic: number }; citizens18: number };
/** 2025 mayoral general election: votes cast, turnout of voting-age citizens, share of the city, rank by turnout. */
export type Vote = { votes: number; turnout: number; share: number; rank: number };
type RawDistrict = { cd: number; name: string; issues: [string, number][]; demo: Demo | null; vote: Vote | null; polys: number[][][][] };
const src = raw as unknown as { fetched: string; districts: RawDistrict[] };

export const BOROUGHS = ["", "Manhattan", "Bronx", "Brooklyn", "Queens", "Staten Island"];
export const MAP_W = 1000;
export const FETCHED = src.fetched;

const k = Math.cos((40.7 * Math.PI) / 180);
const proj = ([lon, lat]: number[]) => [lon * k, -lat];

let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
for (const d of src.districts)
  for (const poly of d.polys)
    for (const c of poly[0]) {
      const [x, y] = proj(c);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }

export const MAP_H = (MAP_W * (y1 - y0)) / (x1 - x0);
const pt = (c: number[]) => {
  const [x, y] = proj(c);
  return [((x - x0) / (x1 - x0)) * MAP_W, ((y - y0) / (y1 - y0)) * MAP_H];
};

export type District = { cd: number; name: string; boro: string; num: number; park: boolean; issues: [string, number][]; demo: Demo | null; vote: Vote | null; polys: number[][][][]; d: string; cx: number; cy: number };

export const DISTRICTS: District[] = src.districts.map((d) => {
  let sx = 0, sy = 0, n = 0;
  const path = d.polys
    .map((poly) => poly.map((ring) => "M" + ring.map((c) => { const [x, y] = pt(c); sx += x; sy += y; n++; return x.toFixed(1) + " " + y.toFixed(1); }).join("L") + "Z").join(""))
    .join("");
  // District numbers above 18 are parks, airports and other land nobody votes from.
  return { cd: d.cd, name: d.name, boro: BOROUGHS[Math.floor(d.cd / 100)], num: d.cd % 100, park: d.cd % 100 > 18, issues: d.issues, demo: d.demo, vote: d.vote, polys: d.polys, d: path, cx: sx / n, cy: sy / n };
});

export const districtBy = (cd: number | null) => DISTRICTS.find((d) => d.cd === cd);
