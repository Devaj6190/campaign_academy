"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { pollHistory, shortDate, useCase, useCaseNow } from "@/lib/cases/store";
import { Label } from "./ui";

// The race over time, on the student's path: every candidate's line by day from the briefing to today, the student's
// in the warm gold, rivals in the neutral greys, each named at its end. Markers along the bottom are the student's
// decisions (gold) and the case's biggest moments (grey); hovering one says what happened. Grows as the clock runs.

const W = 408, H = 150, PAD = { l: 4, r: 64, t: 8, b: 18 };

export function PollChart() {
  const { c } = useCaseNow();
  const work = useCase((s) => s.work), picks = useCase((s) => s.picks), today = useCase((s) => s.date);
  const days = useMemo(() => pollHistory(), [work, picks, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const [hover, setHover] = useState<string | null>(null);
  if (days.length < 2) return <p className="text-[12.5px] text-muted">The chart starts once the clock has run a few days.</p>;

  const span = Math.max(1, (Date.parse(c.electionDate) - Date.parse(c.briefingDate)) / 86_400_000);
  const x = (date: string) => PAD.l + ((Date.parse(date) - Date.parse(c.briefingDate)) / 86_400_000 / span) * (W - PAD.l - PAD.r);
  const ids = c.candidates.map((k) => k.id).filter((id) => days.some((d) => (d.poll[id] ?? 0) > 0.5));
  const top = Math.max(40, ...days.flatMap((d) => ids.map((id) => d.poll[id] ?? 0))) + 4;
  const y = (v: number) => PAD.t + (1 - v / top) * (H - PAD.t - PAD.b);
  const path = (id: string) => days.map((d, i) => `${i ? "L" : "M"}${x(d.date).toFixed(1)},${y(d.poll[id] ?? 0).toFixed(1)}`).join("");
  const last = days[days.length - 1];
  const name = (id: string) => (id === c.follow ? "You" : (c.candidates.find((k) => k.id === id)?.name.split(" ").pop() ?? id));

  // End labels, nudged apart so they never sit on top of each other.
  const labels = ids.map((id) => ({ id, v: last.poll[id] ?? 0, y: y(last.poll[id] ?? 0) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) labels[i].y = Math.max(labels[i].y, labels[i - 1].y + 11);

  const marks = [
    ...c.decisions.filter((d) => picks[d.id] && d.date <= today).map((d) => ({ key: `d${d.id}`, date: d.date, text: `${shortDate(d.date)} · Your decision: ${d.title}`, mine: true })),
    ...c.press.filter((p) => (p.impact ?? 0) >= 4 && p.date <= today).map((p) => ({ key: `p${p.date}${p.source}`, date: p.date, text: `${shortDate(p.date)} · ${p.short ?? p.summary.split(". ")[0]}`, mine: false })),
  ];
  const shown = marks.find((m) => m.key === hover);

  return (
    <div>
      <Label>The race so far</Label>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full overflow-visible" role="img" aria-label="Every candidate's poll standing by day, simulated">
        {[10, 20, 30, 40].filter((v) => v < top).map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="rgb(255 255 255 / .06)" />
            <text x={W - PAD.r + 4} y={y(v) + 3} className="fill-faint font-mono text-[8px]">{v}</text>
          </g>
        ))}
        {/* The outright-win line. */}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(c.threshold)} y2={y(c.threshold)} stroke="var(--color-gold)" strokeOpacity=".35" strokeDasharray="3 3" />
        {ids.filter((id) => id !== c.follow).map((id) => <motion.path key={id} d={path(id)} fill="none" stroke="rgb(255 255 255 / .38)" strokeWidth={1.2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: "easeOut" }} />)}
        <motion.path d={path(c.follow)} fill="none" stroke="var(--color-warm)" strokeWidth={2.2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: "easeOut" }} />
        <circle cx={x(last.date)} cy={y(last.poll[c.follow] ?? 0)} r={3} fill="var(--color-warm)" />
        {labels.map((l) => (
          <text key={l.id} x={x(last.date) + 6} y={l.y + 3} className={`font-mono text-[9px] ${l.id === c.follow ? "fill-warm" : "fill-muted"}`}>{name(l.id)} {l.v.toFixed(l.id === c.follow ? 1 : 0)}</text>
        ))}
        {marks.map((m) => (
          <g key={m.key} onMouseEnter={() => setHover(m.key)} onMouseLeave={() => setHover(null)} className="cursor-default">
            <rect x={x(m.date) - 5} y={H - PAD.b} width={10} height={PAD.b} fill="transparent" />
            <line x1={x(m.date)} x2={x(m.date)} y1={PAD.t} y2={H - PAD.b} stroke={m.mine ? "var(--color-gold)" : "rgb(255 255 255 / .25)"} strokeOpacity={hover === m.key ? 0.8 : 0.18} />
            {m.mine ? <rect x={x(m.date) - 3} y={H - PAD.b + 5} width={6} height={6} transform={`rotate(45 ${x(m.date)} ${H - PAD.b + 8})`} fill="var(--color-gold)" /> : <circle cx={x(m.date)} cy={H - PAD.b + 8} r={2.5} fill="rgb(255 255 255 / .5)" />}
          </g>
        ))}
      </svg>
      <p className="mt-1 min-h-[16px] text-[11.5px] leading-snug text-muted">{shown ? shown.text : "Simulated, on your path. Gold marks your decisions; grey marks the race's biggest moments. The dashed line is the 40 percent needed to win outright."}</p>
    </div>
  );
}
