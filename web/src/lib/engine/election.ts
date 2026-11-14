import { shares } from "../demographics";
import { DISTRICTS } from "../geo";
import type { LedgerEntry } from "../store";
import { lean, splitOf, type Rival } from "./poll";

// Election night, district by district. Turnout starts from how many people really voted there in 2025 and
// rises where the campaign did field work. Undecideds break by how that district's voter groups feel about
// Cole; whoever wins the most votes citywide wins.

const FIELD = new Set(["canvass", "phone_bank", "volunteer_training", "voter_targeting"]);

type World = {
  sent: Record<number, number>;
  factions: { id: string; feel: number }[];
  rivals: Record<Rival, { strength: Record<number, number> }>;
  ledger: LedgerEntry[];
};

export type DistrictResult = { cd: number; votes: number; lift: number; cole: number; hale: number; brandt: number; winner: "cole" | Rival };

export function electionResult(w: World) {
  const strength = { hale: w.rivals.hale.strength, brandt: w.rivals.brandt.strength };
  const field: Record<number, number> = {};
  for (const l of w.ledger) if ((l.source === "staff" || l.source === "candidate") && FIELD.has(l.effect.action) && l.effect.district) field[l.effect.district] = (field[l.effect.district] ?? 0) + 1;

  const byDistrict: DistrictResult[] = DISTRICTS.filter((d) => !d.park && d.vote).map((d) => {
    const sp = splitOf(d.cd, w.sent[d.cd] ?? 50, 30, strength);
    // Undecideds lean to Cole as much as the groups living here like him.
    const s = shares(d.cd) ?? {};
    let wsum = 0, fsum = 0;
    for (const f of w.factions) { wsum += s[f.id] ?? 0; fsum += (s[f.id] ?? 0) * f.feel; }
    const toCole = wsum ? fsum / wsum / 100 : 0.4;
    const l = lean(d.cd);
    const h = l.hale * (1 + (strength.hale[d.cd] ?? 0) / 100), b = l.brandt * (1 + (strength.brandt[d.cd] ?? 0) / 100);
    const cole = sp.cole + sp.undecided * toCole;
    const hale = sp.hale + (sp.undecided * (1 - toCole) * h) / (h + b);
    const brandt = sp.brandt + (sp.undecided * (1 - toCole) * b) / (h + b);
    const lift = Math.min(0.15, (field[d.cd] ?? 0) * 0.03);
    const votes = Math.round(d.vote!.votes * (1 + lift));
    const winner = cole >= hale && cole >= brandt ? "cole" : hale >= brandt ? "hale" : "brandt";
    return { cd: d.cd, votes, lift, cole: Math.round(cole * votes), hale: Math.round(hale * votes), brandt: Math.round(brandt * votes), winner };
  });

  const totals = byDistrict.reduce((a, r) => ({ cole: a.cole + r.cole, hale: a.hale + r.hale, brandt: a.brandt + r.brandt }), { cole: 0, hale: 0, brandt: 0 });
  const all = totals.cole + totals.hale + totals.brandt;
  const pct = { cole: Math.round((totals.cole / all) * 1000) / 10, hale: Math.round((totals.hale / all) * 1000) / 10, brandt: Math.round((totals.brandt / all) * 1000) / 10 };
  const won = totals.cole > totals.hale && totals.cole > totals.brandt;
  // Results come in from the highest-turnout districts first, as on a real election night.
  const order = [...byDistrict].sort((a, b) => b.votes - a.votes).map((r) => r.cd);
  return { byDistrict, totals, pct, won, order, districtsWon: { cole: byDistrict.filter((r) => r.winner === "cole").length, hale: byDistrict.filter((r) => r.winner === "hale").length, brandt: byDistrict.filter((r) => r.winner === "brandt").length } };
}

export type ElectionResult = ReturnType<typeof electionResult>;
