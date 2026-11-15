// No invented numbers (issue #41, item 4). Staff may state only figures that come from what they were shown: the
// live case, the order, and the results of their own tools. A Ledger collects those; anything a staffer writes is
// checked against it. A figure that is not there is sent back once to be rewritten, and after that the sentence
// carrying it is dropped. Pure text handling: it never touches cash, support or the poll.

export type Figure = { raw: string; value: number; kind: "money" | "percent" | "plain" };

// A number, with an optional $ in front and an optional unit or % behind. A single-letter unit must touch the digits
// ("20k", "4.3M"), so "5 minutes" is not five million. Ordinals ("125th St", "the 29th") are names and dates.
const FIG = /(\$\s?)?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(?:(k|m|bn)\b|\s(thousand|million|billion)\b)?(\s?%|\s(?:percent|per cent)\b)?/gi;

export function figures(text: string): Figure[] {
  const out: Figure[] = [];
  for (const m of text.matchAll(FIG)) {
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 2);
    if (!m[1] && !m[3] && !m[4] && !m[5] && /^(st|nd|rd|th)/i.test(after)) continue;
    const unit = (m[3] ?? m[4] ?? "").toLowerCase();
    const mult = unit === "k" || unit === "thousand" ? 1e3 : unit === "m" || unit === "million" ? 1e6 : unit === "bn" || unit === "billion" ? 1e9 : 1;
    const value = Number(m[2].replace(/,/g, "")) * mult;
    if (!Number.isFinite(value)) continue;
    out.push({ raw: m[0].trim(), value, kind: m[1] || unit ? "money" : m[5] ? "percent" : "plain" });
  }
  return out;
}

/** Counts and days of the month: small bare numbers anyone may say ("2 events", "the 9"). Never money or a percentage. */
const SMALL = 31;

export class Ledger {
  private known: number[] = [];

  /** Everything in this text or number is a figure the staff were given. */
  add(...items: (string | number | undefined | null)[]) {
    for (const x of items) {
      if (typeof x === "number") this.known.push(x);
      else if (x) for (const f of figures(x)) this.known.push(f.value);
    }
    return this;
  }

  /** A figure is known when it was given, allowing for rounding ("$4.3M" for $4,312,000, "11%" for 11.4). */
  private has(f: Figure) {
    if (f.kind === "plain" && Number.isInteger(f.value) && f.value <= SMALL) return true;
    return this.known.some((a) => a === f.value || Math.round(a) === f.value || Math.abs(a - f.value) < 0.051 || (a >= 1000 && Math.abs(a - f.value) / a <= 0.03));
  }

  /** The figures in this text that the staff were never given. */
  unknown(text: string): string[] {
    return [...new Set(figures(text).filter((f) => !this.has(f)).map((f) => f.raw))];
  }

  /** The text without any sentence that carries a figure the staff were never given. */
  clean(text: string): string {
    return text.split(/(?<=[.!?])\s+/).filter((s) => !this.unknown(s).length).join(" ").trim();
  }
}

/** What a tool says to an agent whose text carried figures it was not given. */
export const bounce = (bad: string[]) => `Not sent. You stated ${bad.length === 1 ? "a figure" : "figures"} that ${bad.length === 1 ? "is" : "are"} not in the case or in your results: ${bad.join(", ")}. Write it again using only figures you were given, or none. Do not propose amounts of your own.`;
