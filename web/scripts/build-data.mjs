// Bakes real NYC Open Data (boundaries, names, 311 counts) into src/lib/nyc.json.
// Run: node scripts/build-data.mjs
import { writeFileSync } from 'node:fs';

const base = 'https://data.cityofnewyork.us/resource/';
const get = async (path) => {
  const r = await fetch(base + path);
  if (!r.ok) throw new Error(path + ' -> ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return r.json();
};

// Community district boundaries (5crt-au7u), simplified server-side.
const geo = await get('5crt-au7u.geojson?$select=boro_cd,simplify_preserve_topology(the_geom,0.0006) as the_geom&$limit=100');
// District names come from the NTA dataset's CDTA labels (9nt8-h7nd).
const names = await get('9nt8-h7nd.json?$select=cdta2020,cdtaname&$group=cdta2020,cdtaname&$limit=200');
// Top 311 complaint types per community board, last 30 days (erm2-nwe9).
const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 19);
const c311 = await get(`erm2-nwe9.json?$select=community_board,complaint_type,count(*) as n&$where=created_date > '${since}'&$group=community_board,complaint_type&$order=n DESC&$limit=5000`);

const BORO = { MANHATTAN: 1, BRONX: 2, BROOKLYN: 3, QUEENS: 4, 'STATEN ISLAND': 5 };
const PFX = { MN: 1, BX: 2, BK: 3, QN: 4, SI: 5 };

const nameBy = {};
for (const r of names) {
  const cd = PFX[r.cdta2020.slice(0, 2)] * 100 + +r.cdta2020.slice(2);
  nameBy[cd] = r.cdtaname.replace(/^\w+\s/, '').replace(/\s*\(.*\)$/, '');
}
const issuesBy = {};
for (const r of c311) {
  const m = /^(\d+) (.+)$/.exec(r.community_board || '');
  if (!m || !BORO[m[2]]) continue;
  const cd = BORO[m[2]] * 100 + +m[1];
  if ((issuesBy[cd] ||= []).length < 4) issuesBy[cd].push([r.complaint_type, +r.n]);
}

const polysOf = (f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates);
const voting = geo.features.map((f) => +f.properties.boro_cd).filter((cd) => cd % 100 <= 18);

// Who lives there: Census ACS 5-year estimates per community district, via NYC Planning's Population FactFinder.
const CODE = { 1: 'MN', 2: 'BX', 3: 'BK', 4: 'QN', 5: 'SI' };
const pct = (v) => (v == null ? null : Math.round(v * 1000) / 10);
const demoBy = {};
for (const cd of voting) {
  const id = CODE[Math.floor(cd / 100)] + String(cd % 100).padStart(2, '0');
  const r = await fetch(`https://factfinder-api.herokuapp.com/survey/acs/cdtas/${id}?compareTo=0`);
  if (!r.ok) { console.warn('factfinder', id, r.status); continue; }
  const v = Object.fromEntries((await r.json()).map((x) => [x.variable, x]));
  demoBy[cd] = {
    pop: v.pop_1?.sum ?? null,
    income: v.mdhhinc?.sum != null ? Math.round(v.mdhhinc.sum) : null, // capped at 200,000 in the source
    renters: pct(v.rochu1?.percent),
    age: v.mdage?.sum ?? null,
    otherLang: pct(v.lgoeng1?.percent),
    over65: pct(v.pop65pl1?.percent),
    age20to24: pct(v.pop20t24?.percent),
    race: { white: pct(v.wtnh?.percent), black: pct(v.blnh?.percent), asian: pct(v.asnnh?.percent), hispanic: pct(v.hsp1?.percent) },
    citizens18: v.cvpop18pl?.sum ?? null,
  };
}

// 2025 mayoral turnout: Board of Elections results by election district, placed into community districts
// by testing each election district's centre against the community district boundaries.
const inRing = ([x, y], ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const inPolys = (pt, polys) => polys.some((p) => inRing(pt, p[0]) && !p.slice(1).some((hole) => inRing(pt, hole)));
const centre = (polys) => {
  const ring = polys.reduce((a, p) => (p[0].length > a.length ? p[0] : a), []);
  return [ring.reduce((s, c) => s + c[0], 0) / ring.length, ring.reduce((s, c) => s + c[1], 0) / ring.length];
};
const ED = 'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/ArcGIS/rest/services/NYC_Election_Districts/FeatureServer/0/query';
const homes = geo.features.filter((g) => +g.properties.boro_cd % 100 <= 18);
const centres = new Map(homes.map((g) => [g, centre(polysOf(g))]));
const dist = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
const edCd = {};
for (let offset = 0; ; offset += 1000) {
  const r = await fetch(`${ED}?where=1%3D1&outFields=ElectDist&outSR=4326&resultOffset=${offset}&resultRecordCount=1000&f=geojson`);
  const page = await r.json();
  for (const f of page.features) {
    const pt = centre(polysOf(f));
    // Parks and airports have no voters: an election district whose centre lands in one belongs to the
    // nearest residential district instead.
    const home = homes.find((g) => inPolys(pt, polysOf(g))) ?? homes.reduce((best, g) => (dist(pt, centres.get(g)) < dist(pt, centres.get(best)) ? g : best));
    edCd[f.properties.ElectDist] = +home.properties.boro_cd;
  }
  if (page.features.length < 1000) break;
}
const BOE = 'https://vote.nyc/sites/default/files/pdf/election_results/2025/20251104General%20Election/00000100000Citywide%20Mayor%20Citywide%20EDLevel.csv';
const ADMIN = new Set(['Public Counter', 'Manually Counted Emergency', 'Absentee / Military', 'Affidavit']);
const votesBy = {};
let counted = 0, unplaced = 0;
for (const line of (await (await fetch(BOE)).text()).split('\n')) {
  const cells = [...line.matchAll(/"([^"]*)"|(?<=^|,)([^,"]*)(?=,|$)/g)].map((m) => m[1] ?? m[2]);
  const v = cells.slice(11);
  if (v.length < 11 || ADMIN.has(v[9])) continue;
  const n = +String(v[10]).replace(/,/g, '') || 0;
  if (!n) continue;
  const cd = edCd[+v[0] * 1000 + +v[1]];
  if (cd) { votesBy[cd] = (votesBy[cd] || 0) + n; counted += n; } else unplaced += n;
}
const cityVotes = Object.values(votesBy).reduce((a, b) => a + b, 0);
const rank = [...voting].sort((a, b) => (votesBy[b] || 0) / (demoBy[b]?.citizens18 || 1) - (votesBy[a] || 0) / (demoBy[a]?.citizens18 || 1));

const round = (ring) => ring.map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)]);
const districts = geo.features.map((f) => {
  const cd = +f.properties.boro_cd;
  const vote = votesBy[cd] ? { votes: votesBy[cd], turnout: demoBy[cd]?.citizens18 ? pct(votesBy[cd] / demoBy[cd].citizens18) : null, share: pct(votesBy[cd] / cityVotes), rank: rank.indexOf(cd) + 1 } : null;
  return { cd, name: nameBy[cd] || 'Park / airport', issues: issuesBy[cd] || [], demo: demoBy[cd] ?? null, vote, polys: polysOf(f).map((p) => p.map(round)) };
});

writeFileSync(new URL('../src/lib/nyc.json', import.meta.url), JSON.stringify({ fetched: new Date().toISOString().slice(0, 10), districts }));
console.log(districts.length, 'districts;', Object.keys(issuesBy).length, 'with 311 data;', Object.keys(nameBy).length, 'names;', Object.keys(demoBy).length, 'with census data');
console.log('2025 mayoral votes placed:', counted.toLocaleString(), '| not placed:', unplaced.toLocaleString(), '| election districts mapped:', Object.keys(edCd).length);
