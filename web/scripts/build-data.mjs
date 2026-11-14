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

const round = (ring) => ring.map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)]);
const districts = geo.features.map((f) => {
  const cd = +f.properties.boro_cd;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  return { cd, name: nameBy[cd] || 'Park / airport', issues: issuesBy[cd] || [], polys: polys.map((p) => p.map(round)) };
});

writeFileSync(new URL('../src/lib/nyc.json', import.meta.url), JSON.stringify({ fetched: new Date().toISOString().slice(0, 10), districts }));
console.log(districts.length, 'districts;', Object.keys(issuesBy).length, 'with 311 data;', Object.keys(nameBy).length, 'names');
