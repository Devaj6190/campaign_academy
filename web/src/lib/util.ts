export const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

export const money = (n: number) => (n < 0 ? "−$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
export const moneyK = (n: number) => "$" + (Math.abs(n) / 1000).toFixed(1) + "k";

// Deterministic 0..1 pseudo-random from two integers, so fake numbers stay stable between renders.
export const hash = (a: number, b = 0) => {
  let h = (Math.imul(a, 2654435761) + Math.imul(b, 40503)) >>> 0;
  h ^= h >>> 13;
  return (Math.imul(h, 1274126177) >>> 0) / 4294967296;
};

const COOL = [70, 116, 214], MID = [50, 50, 58], WARM = [240, 162, 59];
const mix = (a: number[], b: number[], t: number) => a.map((x, i) => Math.round(x + (b[i] - x) * t));

/** Sentiment 0-100 to a cool → neutral → warm colour. */
export const heat = (v: number, alpha = 1) => {
  const t = Math.max(0, Math.min(1, (v - 20) / 55));
  const c = t < 0.5 ? mix(COOL, MID, t * 2) : mix(MID, WARM, (t - 0.5) * 2);
  return `rgb(${c.join(" ")} / ${alpha})`;
};
/** Same scale without the dark midpoint, for text and strokes that must stay legible. */
export const tone = (v: number) => (v >= 58 ? "var(--color-warm)" : v <= 40 ? "var(--color-cool)" : "var(--color-soft)");
export const feelWord = (v: number) => (v >= 58 ? "Warm" : v <= 40 ? "Cold" : "Mixed");

export const initials = (name: string) => name.split(" ").map((w) => w[0]).slice(0, 2).join("");
export const clock = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(Math.floor(min % 60)).padStart(2, "0")}`;
