import { shares } from "../demographics";
import type { Scenario } from "./index";

// The original race: invented candidates in a real city. Day 1 reads as the README describes it.

const lean = (f: (s: NonNullable<ReturnType<typeof shares>>) => number) => (cd: number) => {
  const s = shares(cd);
  return s ? f(s) : 1;
};

export const FICTIONAL: Scenario = {
  id: "fictional",
  kind: "fiction",
  title: "A fictional race for Mayor of New York",
  me: { id: "cole", name: "Adrian Cole", short: "Cole", color: "#f0a23b", pitch: "more housing near transit, better buses, level police funding and help for small business" },
  rivals: [
    {
      id: "hale",
      name: "Victoria Hale",
      short: "Hale",
      color: "#a3a3ad",
      cash: 900_000,
      perDay: 30_000,
      income: 24_000,
      participant: false,
      smallShare: 0.1,
      runsOn: "public safety and business: more police officers, lower property taxes, fewer fines and rules for small business",
      base: "homeowners, seniors, donors and real estate, Staten Island and southern Brooklyn",
      profile: { skills: ["planning", "field", "volunteers", "finance", "events", "comms", "press", "digital", "policy", "data"], cost: 1, effect: 1, voice: "Disciplined front-runner with money.", salary: 0 },
      courts: ["homeowners", "seniors"],
      lean: lean((s) => s.homeowners + s.seniors + s.donors * 3 + s.smallbiz),
    },
    {
      id: "brandt",
      name: "Naomi Brandt",
      short: "Brandt",
      color: "#7b72d6",
      cash: 250_000,
      perDay: 9_000,
      income: 5_500,
      participant: true,
      smallShare: 0.9,
      runsOn: "rent and police reform: rent freezes, tenant protection, moving police money to services",
      base: "young activists, students and young renters in north Brooklyn and upper Manhattan",
      profile: { skills: ["planning", "field", "volunteers", "events", "comms", "press", "digital", "policy"], cost: 0.9, effect: 1.05, voice: "Energetic insurgent with volunteers, not money.", salary: 0 },
      courts: ["renters", "activists", "students"],
      lean: lean((s) => s.activists * 2 + s.students * 2 + s.renters * 0.5),
    },
  ],
  startPoll: { cole: 31, hale: 38, brandt: 14 },
  undecided: { start: 0.17, end: 0.03 },
  threshold: 0,
  startCash: 412_000,
};
