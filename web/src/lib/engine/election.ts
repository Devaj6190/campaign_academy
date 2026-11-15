import { shares } from "../demographics";
import { DISTRICTS } from "../geo";
import type { LedgerEntry } from "../store";
import { splitOf } from "./poll";
import { ACTIVE, activeRivals, ME } from "../scenario";

// Election night, district by district. Turnout starts from how many people really voted there in 2025 and
// rises where the campaign did field work. Undecideds break by how that district's voter groups feel about
// Cole; whoever wins the most votes citywide wins.

const FIELD = new Set(["canvass", "phone_bank", "volunteer_training", "voter_targeting"]);

type World = {
  sent: Record<number, number>;
  factions: { id: string; feel: number }[];
  rivals: Record<string, { strength: Record<number, number> }>;
  ledger: LedgerEntry[];
};

export type DistrictResult = { cd: number; votes: number; lift: number; shares: Record<string, number>; winner: string };

export function electionResult(w: World) {
  const strength = Object.fromEntries(Object.entries(w.rivals).map(([k, v]) => [k, v.strength]));
  const field: Record<number, number> = {};
  for (const l of w.ledger) if ((l.source === "staff" || l.source === "candidate") && FIELD.has(l.effect.action) && l.effect.district) field[l.effect.district] = (field[l.effect.district] ?? 0) + 1;
  const ids = [ME.id, ...activeRivals(30)];

  const byDistrict: DistrictResult[] = DISTRICTS.filter((d) => !d.park && d.vote).map((d) => {
    const sp = splitOf(d.cd, w.sent[d.cd] ?? 50, 30, strength);
    // Undecideds lean to the student as much as the groups living here like them; the rest split like the rivals' vote.
    const s = shares(d.cd) ?? {};
    let wsum = 0, fsum = 0;
    for (const f of w.factions) { wsum += s[f.id] ?? 0; fsum += (s[f.id] ?? 0) * f.feel; }
    const toMe = wsum ? fsum / wsum / 100 : 0.4;
    const rivals = ids.filter((id) => id !== ME.id);
    const rsum = rivals.reduce((a, id) => a + sp[id], 0) || 1;
    const final: Record<string, number> = { [ME.id]: sp[ME.id] + sp.undecided * toMe };
    for (const id of rivals) final[id] = sp[id] + (sp.undecided * (1 - toMe) * sp[id]) / rsum;
    const lift = Math.min(0.15, (field[d.cd] ?? 0) * 0.03);
    const votes = Math.round(d.vote!.votes * (1 + lift));
    const winner = ids.reduce((a, b) => (final[b] > final[a] ? b : a));
    return { cd: d.cd, votes, lift, shares: Object.fromEntries(ids.map((id) => [id, Math.round(final[id] * votes)])), winner };
  });

  const totals: Record<string, number> = Object.fromEntries(ids.map((id) => [id, byDistrict.reduce((a, r) => a + r.shares[id], 0)]));
  const all = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  // Minor candidates the game does not model take their real share, so shares and the runoff line match the real count.
  const keep = 1 - (ACTIVE.others ?? 0);
  const pct: Record<string, number> = Object.fromEntries(ids.map((id) => [id, Math.round((totals[id] / all) * keep * 1000) / 10]));
  const ranked = [...ids].sort((a, b) => totals[b] - totals[a]);
  // Below the threshold, the top two meet in a runoff. The eliminated vote splits between them in proportion
  // to how the finalists did where those voters live (a simulated runoff, labelled as such).
  let runoff: { a: string; b: string; pct: Record<string, number>; winner: string } | null = null;
  if (ACTIVE.threshold && pct[ranked[0]] < ACTIVE.threshold) {
    const [a, b] = ranked;
    let va = 0, vb = 0;
    for (const r of byDistrict) {
      const rest = Object.entries(r.shares).filter(([k]) => k !== a && k !== b).reduce((x, [, v]) => x + v, 0);
      const pa = r.shares[a] / Math.max(1, r.shares[a] + r.shares[b]);
      va += r.shares[a] + rest * pa;
      vb += r.shares[b] + rest * (1 - pa);
    }
    const pa = Math.round((va / (va + vb)) * 1000) / 10;
    runoff = { a, b, pct: { [a]: pa, [b]: Math.round((100 - pa) * 10) / 10 }, winner: va >= vb ? a : b };
  }
  const winner = runoff ? runoff.winner : ranked[0];
  const won = winner === ME.id;
  // Results come in from the highest-turnout districts first, as on a real election night.
  const order = [...byDistrict].sort((a, b) => b.votes - a.votes).map((r) => r.cd);
  const districtsWon = Object.fromEntries(ids.map((id) => [id, byDistrict.filter((r) => r.winner === id).length]));
  return { byDistrict, totals, pct, ranked, runoff, winner, won, order, districtsWon };
}

export type ElectionResult = ReturnType<typeof electionResult>;
