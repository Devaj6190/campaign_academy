// The structural twins (#28, decided with Devaj on 15 November). Masking hid names but not facts, and the model
// recognised every masked card from the platform alone. A twin moves each case decision to an invented city, with
// different specifics that play the same part: a luxury property tax for free school meals instead of an income tax
// for pre-kindergarten, police sweeps in public housing instead of stop-and-frisk, an expenses scandal instead of the
// real one. The options keep their ids, order of costs and chips, so the real choice is still the right answer to
// score against. Written before any twin was run; the recognition probe checks each one.
//
// A twin's right answer rests on the twin keeping the real card's trade-offs. That is a judgement made in writing it,
// so twin results are weaker evidence than results on the real cards, and the report says so.

export type Twin = {
  title: string;
  since?: string[];
  situation: string[];
  /** Days left and other constraints, as on the real card. */
  constraints: string;
  options: Record<string, { label: string; detail: string }>;
};

export const CITY = "Halvern";
export const TWIN_NAMES: Record<string, string> = { deblasio: "you", quinn: "Ellen Marsh", thompson: "Robert Kane", liu: "Peter Doyle", weiner: "Jack Rourke" };

/** Who the twin campaigner is, and what it knows about itself, by decision. */
export const TWIN_PERSON = {
  name: "Tom Garland",
  role: `the elected city ombudsman of ${CITY}, a candidate in the party's primary for mayor`,
  facts: (i: number) => [
    "You hold citywide office as the elected ombudsman.",
    "You live on the east side with your wife and your teenage daughter.",
    "You proposed a tax on sales of luxury property to pay for free school meals and after-school programmes. A parents' group called it overdue; the mayor said it would drive buyers out of the city.",
    "You campaigned with tenant groups against the council leader's stalling of a rent-freeze bill. The council passed a compromise, and the credit went to her.",
    ...(i >= 2 ? ["You proposed building or saving 150,000 affordable homes, with city bond money to pay for them."] : []),
    ...(i >= 3 ? ["The health-care workers' union has endorsed you."] : []),
  ],
};

const BREAK = "A clean break from the Brenner years, framed as two economies in one city.";

/** The twin platform as it stood at decision `i` (the break only once that choice is made). */
export const twinPlatform = (i: number) => [
  "Tax sales of luxury property to pay for free school meals and after-school programmes.",
  "Rent freeze: press the council leader to allow a vote on the bill.",
  ...(i > 0 ? [BREAK] : []),
  ...(i >= 2 ? ["Build or save 150,000 affordable homes, paid for with city bonds."] : []),
  ...(i > 2 ? ["Keep neighbourhood hospitals open, in particular the Eastside General Hospital."] : []),
];

export const TWINS: Record<string, Twin> = {
  positioning: {
    title: "What do you run as?",
    situation: [
      "Ellen Marsh, the council leader, leads every poll with 35 to 37 percent. You, Robert Kane and Peter Doyle are bunched between 9 and 14.",
      "Mayor Hal Brenner is leaving after a long tenure and is not running.",
      "Your media consultant's reading is that your rivals are aiming their messages at the middle class.",
    ],
    constraints: "226 days to the primary. Spending limit for the primary: $6,100,000.",
    options: {
      break: { label: "A sharp break from the Brenner years", detail: "Inequality is the central theme. You are the clear alternative to the mayor's record." },
      manager: { label: "An experienced manager", detail: "Keep what worked, fix what did not. Aimed at the middle class." },
      boroughs: { label: "The neighbourhoods candidate", detail: "Local services and equal treatment of every part of the city come first." },
      prek: { label: "One signature policy", detail: "Run on free school meals and leave the mayor's record alone." },
    },
  },
  weiner: {
    title: "A famous rival enters. What do you do about him?",
    since: [
      "Jack Rourke enters the race with a large war chest. He resigned from the state senate two years ago over an expenses scandal. That day's poll: Marsh 25, Rourke 15, you 10, Kane 10.",
      "You raised less than half of what Kane and Marsh each raised in the last filing period.",
      "After a bombing in another city, a forum turned on whether to keep the police chief. Marsh would keep him; you would not.",
    ],
    situation: [
      "Coverage says Rourke's talk of middle-class struggles is crowding out your message.",
      "You have already claimed the most you can in public matching funds.",
      "Nearly half of party voters do not know enough about you to have a view.",
    ],
    constraints: "111 days to the primary.",
    options: {
      attack: { label: "Go after him directly", detail: "Try to disqualify him before he settles in." },
      hold: { label: "Leave him alone and stay on plan", detail: "Keep the campaign aimed at the mayor's record and the front-runner. Spend nothing extra now." },
      shift: { label: "Change the message", detail: "Compete for the same middle-class voters in the outer neighbourhoods he is talking to." },
      early: { label: "Spend early on name recognition", detail: "Start paid advertising months ahead of plan so voters know who you are before the summer." },
    },
  },
  hospital: {
    title: "A hospital is closing and there is a protest today",
    since: ["Kane has won the teachers' union endorsement and risen to 16 percent. Rourke now leads some polls."],
    situation: [
      "The state health authority may sell Eastside General Hospital and has diverted ambulances from it. A judge has ordered it kept running.",
      "The protest is organised with the health-care workers' union, which has endorsed you, and the nurses' union, which has endorsed nobody yet.",
      "Two rivals, Doyle and Rourke, will also be there. Organisers plan civil disobedience.",
      "You hold citywide office as the elected ombudsman.",
    ],
    constraints: "62 days to the primary.",
    options: {
      speak: { label: "Attend, speak, and leave when ordered", detail: "Show up for the cause and step back when police tell the crowd to disperse." },
      arrest: { label: "Join the civil disobedience and accept arrest", detail: "Stay with the hospital workers when the order comes." },
      courts: { label: "Stay off the street and use your office", detail: "Pursue the hospital through the courts and the ombudsman's powers." },
      statement: { label: "Send a statement of support", detail: "Keep the day for other campaigning." },
    },
  },
  budget: {
    title: "Eight weeks left. How do you split the money?",
    situation: [
      "Every candidate taking public funds has the same $6,100,000 limit for the primary.",
      "You are fourth at 10 percent. Nearly half of party voters do not know enough about you to rate you.",
    ],
    constraints: "57 days to the primary. What you spend now cannot be spent in the final month.",
    options: {
      mix: { label: "A conventional mix", detail: "Television, direct mail to likely voters, and field, starting now." },
      alltv: { label: "Hold everything for television", detail: "Send no mail. Keep every available dollar for television in the final five weeks." },
      mail: { label: "Lead with targeted mail", detail: "Mail the groups most likely to back you, and keep a smaller television buy for the last two weeks." },
      tvnow: { label: "Start television now at low weight", detail: "Lift your name recognition now, at the cost of a thinner final month." },
    },
  },
  firstad: {
    title: "Your first television ad",
    since: [
      "Rourke admitted to a second set of hidden expense claims and fell from first to fourth within a week.",
      "Doyle was denied public matching funds.",
      "After a national verdict on race and policing, Kane sharpened his attack on the police sweeps in public housing, to win Black voters leaving Rourke.",
      "Citing another city's bankruptcy, Mayor Brenner told voters to pick a mayor who would refuse back pay for city workers.",
      "Polls of likely voters at the end of last month: Marsh 26 or 27, with you, Kane and Rourke between 15 and 21.",
    ],
    situation: [
      "You need to finish in the top two to reach a runoff, or pass 40 percent to avoid one.",
      "A federal court ruling on the police sweeps is expected any day.",
      "Last month nearly half of party voters did not know enough about you to rate you.",
    ],
    constraints: "33 days to the primary. A first flight of television costs about $1.1 million.",
    options: {
      bio: { label: "You, to camera, on your record", detail: "A biographical ad in which the candidate introduces himself." },
      family: { label: "A family member introduces you", detail: "Your teenage daughter speaks, naming the break from the mayor, the tax plan and the police sweeps." },
      contrast: { label: "A contrast with the front-runner", detail: "Open on her record alongside the mayor's." },
      wait: { label: "Hold all television for the last two weeks", detail: "Stay dark now and concentrate the buy at the end." },
    },
  },
  base: {
    title: "The second ad, and whose voters you go after",
    since: ["A federal judge rules the police sweeps unconstitutional and orders a monitor. Kane promises to work with the monitor without backing the council's oversight bills."],
    situation: [
      "Among Black likely voters the latest poll has Kane 39, you 22, Marsh 18. Among white likely voters: you 39, Marsh 31, Kane 12.",
      "60 percent of likely primary voters call the police sweeps excessive.",
      "Kane has praised parts of the sweeps and would keep them as a tool under an inspector general.",
      "Coverage says Kane is counting on being the only Black candidate to carry him into a runoff.",
    ],
    constraints: "22 days to the primary. A second flight costs about $1.7 million. The closing week will need about $1 million more.",
    options: {
      frisk: { label: "Make the police sweeps the second ad", detail: "Claim the sharpest position in the field on the issue." },
      jobs: { label: "Move to jobs and the cost of living", detail: "The issues voters rank first." },
      manhattan: { label: "Take the liberal downtown voters from the council leader", detail: "Leave Kane's supporters alone, with a runoff in mind." },
      repeat: { label: "Keep the first ad on air", detail: "A smaller buy, and no direct contrast with any rival." },
      save: { label: "No second ad: save the money for the final days", detail: "Leave the first ad's goodwill to carry the month and keep the cash for the closing stretch." },
    },
  },
};
