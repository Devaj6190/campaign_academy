// The held-out decisions (#28, option C). Real choices by real people in the 2013 primary, written from facts marked
// VERIFIED in docs/research/2013-mayoral-primary.md, before any run or tuning. They are never used while tuning and
// run once, after tuning is frozen (`npm run eval -- heldout --frozen`). Every report prints this file's hash, so a
// change to it after the first run shows.
//
// They are scored only: none moves anything in the simulation. Each is shown to the agent playing `person`, with the
// situation as it stood that day and the options in a shuffled order. `taken` is the record and never reaches an agent.

export type HeldOut = {
  id: string;
  person: string;
  date: string;
  title: string;
  situation: { text: string; sources: string[] }[];
  options: { id: string; label: string; detail: string }[];
  taken: string;
  /** Where the record of the choice is. */
  record: string[];
};

const s = (text: string, ...sources: string[]) => ({ text, sources });

const KELLY = {
  date: "2013-04-25",
  title: "A forum asks whether you would keep the police commissioner",
  situation: [
    s("Ten days after the Boston Marathon bombing, a Democratic forum opens on counterterrorism and turns to Police Commissioner Ray Kelly.", "wfuv-0425"),
    s("Every candidate is asked whether, as mayor, they would keep him.", "wfuv-0425"),
    s("The latest Quinnipiac poll of Democrats: Quinn 28, Weiner 15 (not yet a candidate), de Blasio 11, Thompson 10.", "q-0522"),
  ],
  options: [
    { id: "keep", label: "Say you would keep him", detail: "Stand by the commissioner and his record on safety." },
    { id: "replace", label: "Say you would not keep him", detail: "Say the department needs new leadership." },
    { id: "defer", label: "Say it is too early to name anyone", detail: "Decline to commit either way." },
    { id: "review", label: "Praise his record, promise an outside review", detail: "Credit him on safety and promise a review of police practices." },
  ],
};

const HOSPITAL = {
  date: "2013-07-10",
  title: "Police order the hospital protest to disperse",
  situation: [
    s("The state university is considering selling Long Island College Hospital in Brooklyn and has diverted ambulances from it. A judge has ordered it kept running.", "dna-arrest", "bkpaper-lich"),
    s("The protest outside the state university chancellor's office is organised with the health-care workers' union and the nurses' association, which has not endorsed anyone yet.", "dna-arrest", "npq-lich"),
    s("Organisers planned civil disobedience. Police now order the crowd to disperse. Three mayoral candidates are in the crowd: Bill de Blasio, John Liu and Anthony Weiner.", "npq-lich"),
  ],
  options: [
    { id: "arrest", label: "Stay and accept arrest", detail: "Join the civil disobedience with the hospital workers." },
    { id: "stepback", label: "Step back into the crowd", detail: "Stay at the protest but out of the arrests." },
    { id: "leave", label: "Leave the protest", detail: "Go before the arrests start." },
    { id: "speak", label: "Address the crowd, then go", detail: "Speak for the hospital to the press and leave." },
  ],
};

const WEINER_NEWS = {
  date: "2013-07-23",
  situation: [
    s("Anthony Weiner admits to further explicit messages, sent after he left Congress.", "dna-0723"),
    s("The latest Quinnipiac poll of Democrats: Weiner 25, Quinn 22, Thompson 11, de Blasio 10.", "q-0715"),
    s("The primary is 49 days away.", "boe-cert"),
  ],
};

const RULING = {
  date: "2013-08-12",
  title: "A federal judge rules stop-and-frisk unconstitutional",
  situation: [
    s("A federal judge rules the police department's stop-and-frisk practices unconstitutional and orders a monitor.", "dna-0812"),
    s("Every candidate is asked whether, as mayor, they would keep up an appeal by the city.", "dna-0812"),
    s("In the August 13 Quinnipiac poll of likely primary voters, 60 percent call stop-and-frisk excessive.", "q-0813"),
  ],
};

export const HELD_OUT: HeldOut[] = [
  { id: "quinn-kelly", person: "quinn", ...KELLY, taken: "keep", record: ["wfuv-0425"] },
  { id: "deblasio-kelly", person: "deblasio", ...KELLY, taken: "replace", record: ["wfuv-0425"] },
  { id: "liu-hospital", person: "liu", ...HOSPITAL, taken: "stepback", record: ["npq-lich"] },
  { id: "weiner-hospital", person: "weiner", ...HOSPITAL, taken: "stepback", record: ["npq-lich"] },
  {
    id: "deblasio-weiner-call", person: "deblasio", ...WEINER_NEWS, title: "Weiner's new admissions: what do you say?",
    options: [
      { id: "withdraw", label: "Call on him to leave the race", detail: "Say plainly that he should withdraw." },
      { id: "voters", label: "Say it is for him and the voters", detail: "Decline to tell him what to do." },
      { id: "silent", label: "Say nothing and stay on your message", detail: "Keep the day on your own campaign." },
      { id: "judgement", label: "Question his judgement, without asking him to go", detail: "Criticise him but stop short of calling for withdrawal." },
    ],
    taken: "withdraw", record: ["dna-0723", "dna-0724"],
  },
  {
    id: "quinn-weiner-call", person: "quinn", ...WEINER_NEWS, title: "Weiner's new admissions: what do you say?",
    options: [
      { id: "withdraw", label: "Call on him to leave the race", detail: "Say plainly that he should withdraw." },
      { id: "voters", label: "Say it is for him and the voters", detail: "Decline to tell him what to do." },
      { id: "silent", label: "Say nothing and stay on your message", detail: "Keep the day on your own campaign." },
      { id: "judgement", label: "Question his judgement, without asking him to go", detail: "Criticise him but stop short of calling for withdrawal." },
    ],
    taken: "voters", record: ["dna-0724"],
  },
  {
    id: "weiner-stay", person: "weiner", ...WEINER_NEWS, title: "Your new admissions are public: do you stay in?",
    options: [
      { id: "stay", label: "Stay in the race", detail: "Apologise and keep campaigning to the end." },
      { id: "withdraw", label: "Withdraw", detail: "Leave the race now." },
      { id: "pause", label: "Suspend campaigning for two weeks", detail: "Step back from events, then decide." },
      { id: "endorse", label: "Withdraw and endorse a rival", detail: "Leave the race and back another candidate." },
    ],
    taken: "stay", record: ["boe-cert"],
  },
  {
    id: "deblasio-appeal", person: "deblasio", ...RULING,
    options: [
      { id: "drop", label: "Pledge to drop any appeal", detail: "As mayor, end the city's appeal of the ruling." },
      { id: "appeal", label: "Back the city's appeal", detail: "Say the ruling goes too far." },
      { id: "monitor", label: "Work with the monitor, no position on the appeal", detail: "Promise to cooperate with the court's monitor." },
      { id: "review", label: "Say you will study the ruling first", detail: "Take no position today." },
    ],
    taken: "drop", record: ["dna-0812"],
  },
  {
    id: "quinn-appeal", person: "quinn", ...RULING,
    options: [
      { id: "drop", label: "Pledge to drop any appeal", detail: "As mayor, end the city's appeal of the ruling." },
      { id: "appeal", label: "Back the city's appeal", detail: "Say the ruling goes too far." },
      { id: "monitor", label: "Work with the monitor, no position on the appeal", detail: "Promise to cooperate with the court's monitor." },
      { id: "review", label: "Say you will study the ruling first", detail: "Take no position today." },
    ],
    taken: "drop", record: ["dna-0812"],
  },
  {
    id: "thompson-appeal", person: "thompson", ...RULING,
    options: [
      { id: "drop", label: "Pledge to drop the appeal and back the Council's oversight bills", detail: "End the appeal and support the police oversight bills." },
      { id: "monitor", label: "Work with the monitor, without backing the oversight bills", detail: "Cooperate with the court but keep your distance from the Council's bills." },
      { id: "appeal", label: "Back the city's appeal", detail: "Say the ruling goes too far." },
      { id: "review", label: "Say you will study the ruling first", detail: "Take no position today." },
    ],
    taken: "monitor", record: ["dna-0812"],
  },
  {
    id: "thompson-ad", person: "thompson", date: "2013-08-25", title: "A rival's ad says only he will end stop-and-frisk",
    situation: [
      s("Bill de Blasio's second television ad says he is the only candidate who will end the stop-and-frisk era.", "dk-ad2"),
      s("A New York Times fact-check calls the claim misleading, since other candidates have also pledged reform.", "newsone-0826"),
      s("Among Black likely voters, the August 13 Quinnipiac poll had you at 39, de Blasio 22, Quinn 18.", "q-0813"),
      s("The primary is 16 days away.", "boe-cert"),
    ],
    options: [
      { id: "answer", label: "Answer with your own ad calling his claim false", detail: "Cite the fact-check and state your own position." },
      { id: "ignore", label: "Ignore it and stay on your message", detail: "Do not give his ad more attention." },
      { id: "end", label: "Pledge to end stop-and-frisk outright", detail: "Take the sharpest position yourself." },
      { id: "other", label: "Attack him on another issue", detail: "Change the subject to his record elsewhere." },
    ],
    taken: "answer", record: ["newsone-0826"],
  },
];
