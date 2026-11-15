// The real people the eval's agents play (#28). Each is played as themselves, from facts in
// docs/research/2013-mayoral-primary.md marked VERIFIED, and each fact carries the date it became true (not the date
// of the article that reports it). An agent deciding on day X is told only the facts dated before X.
//
// Facts that are themselves the answer to a scored decision (de Blasio calling on Weiner to quit, the pledges after
// the stop-and-frisk ruling, Quinn on keeping Kelly) are left out, so a profile never carries a scored choice.

export type Fact = { date: string; text: string; sources: string[] };
export type Person = { id: string; name: string; role: string; facts: Fact[]; /** How the masked condition names them. */ masked: { name: string; role: string } };

/** Facts true before the campaign began. */
const BEFORE = "2013-01-01";
const f = (date: string, text: string, ...sources: string[]): Fact => ({ date, text, sources });

export const PEOPLE: Record<string, Person> = {
  deblasio: {
    id: "deblasio",
    name: "Bill de Blasio",
    role: "Public Advocate of New York City, a candidate in the 2013 Democratic primary for mayor",
    masked: { name: "the candidate", role: "a citywide elected official, a candidate in the party's primary for mayor" },
    facts: [
      f(BEFORE, "You hold citywide office as Public Advocate.", "dna-launch"),
      f(BEFORE, "You live in Park Slope, Brooklyn, with your wife Chirlane and your teenage son.", "dna-launch", "tpm-brand"),
      f("2012-10-04", "You proposed raising the city income tax on incomes above $500,000 to pay for full-day pre-kindergarten and after-school programmes. A children's advocate called it bold; Mayor Bloomberg said it would drive people out of the city.", "chalk-prek"),
      f("2013-01-20", "You campaigned with paid sick leave activists against the Council Speaker's stalling of the paid sick days bill.", "wnyc-lucky"),
      f("2013-03-31", "The Council reached a paid sick leave compromise, and the credit went to the Speaker rather than to you.", "wnyc-lucky"),
      f("2013-07-02", "You proposed creating or preserving 200,000 affordable homes, with about $1 billion of city pension money for building them.", "trd-0702"),
      f("2013-07-10", "1199 SEIU (health-care workers) has endorsed you.", "dna-arrest"),
    ],
  },
  quinn: {
    id: "quinn",
    name: "Christine Quinn",
    role: "Speaker of the New York City Council, a candidate in the 2013 Democratic primary for mayor",
    masked: { name: "the council leader", role: "the leader of the city council, a candidate in the party's primary for mayor" },
    facts: [
      f(BEFORE, "You are Speaker of the City Council.", "dna-launch"),
      f(BEFORE, "You supported allowing Mayor Bloomberg a third term, which drew protests and resentment.", "wnyc-lucky"),
      f("2013-01-16", "You have $5.3 million on hand, the largest reserve in the field, and you lead every public poll.", "dna-0114", "q-0522"),
      f("2013-02-11", "You proposed 40,000 middle-class apartments over ten years.", "dna-quinn-0211"),
      f("2013-03-31", "The Council reached a paid sick leave compromise, credited to you.", "wnyc-lucky"),
      f("2013-05-29", "You set out a technology agenda: a CUNY campus at the Brooklyn Navy Yard and citywide high-speed internet by 2018.", "dna-quinn-0529"),
    ],
  },
  thompson: {
    id: "thompson",
    name: "Bill Thompson",
    role: "former New York City Comptroller, a candidate in the 2013 Democratic primary for mayor",
    masked: { name: "the former finance chief", role: "the city's former chief financial officer, a candidate in the party's primary for mayor" },
    facts: [
      f(BEFORE, "You are the former City Comptroller and the party's 2009 nominee for mayor; you lost to Bloomberg by fewer than 50,000 votes.", "wnyc-thompson"),
      f(BEFORE, "You are the only Black candidate among the leading contenders.", "q-0626"),
      f("2013-06-15", "The teachers' union has endorsed you.", "q-0626", "wnyc-thompson"),
      f("2013-07-29", "You would keep stop-and-frisk but limit it to stops tied to a suspect description, and add 2,000 officers. Leaders of the detectives' and captains' unions called your approach realistic.", "jw-thompson-0807", "dna-thompson-0729"),
      f("2013-08-16", "You set out a driver-friendly transport plan.", "sb-thompson-0816"),
    ],
  },
  liu: {
    id: "liu",
    name: "John Liu",
    role: "New York City Comptroller, a candidate in the 2013 Democratic primary for mayor",
    masked: { name: "the finance chief", role: "the city's chief financial officer, a candidate in the party's primary for mayor" },
    facts: [
      f(BEFORE, "You are City Comptroller, at about 9 percent in the polls, with just over $2 million on hand.", "q-0522", "dna-0114"),
      f(BEFORE, "Your campaign's fundraising is under federal scrutiny.", "wnyc-liu"),
      f("2013-05-31", "Your former treasurer and a fundraiser were convicted in May.", "wnyc-liu"),
      f("2013-08-05", "The Campaign Finance Board denied your campaign public matching funds.", "wnyc-liu"),
      f("2013-08-07", "You pledge to abolish stop-and-frisk, the only leading candidate to do so.", "jw-thompson-0807"),
    ],
  },
  weiner: {
    id: "weiner",
    name: "Anthony Weiner",
    role: "former congressman, a candidate in the 2013 Democratic primary for mayor",
    masked: { name: "the late entrant", role: "a former national legislator, a candidate in the party's primary for mayor" },
    facts: [
      f(BEFORE, "You resigned from Congress in 2011 after sending lewd images to several women.", "cbs-weiner"),
      f("2013-05-22", "You entered the race by video with $4.8 million in your campaign account.", "cbs-weiner"),
      f("2013-07-03", "You proposed a city-run health plan modelled on single payer.", "cap-weiner-0703"),
    ],
  },
  // The two advisers the record names arguing for an option (Decision.advice). Little else about them is verified.
  delcecato: {
    id: "delcecato",
    name: "John Del Cecato",
    role: "media consultant and ad maker to Bill de Blasio's 2013 campaign for mayor, a partner at AKPD Message and Media",
    masked: { name: "the media consultant", role: "the campaign's media consultant and ad maker" },
    facts: [f(BEFORE, "You are a partner at AKPD Message and Media and make the campaign's ads.", "tpm-brand", "bf-0911")],
  },
  hyers: {
    id: "hyers",
    name: "Bill Hyers",
    role: "campaign manager of Bill de Blasio's 2013 campaign for mayor",
    masked: { name: "the campaign manager", role: "the campaign manager" },
    facts: [f(BEFORE, "You run the campaign day to day.", "gg-walzak", "spb-hyers")],
  },
};

/** An adviser named in a case decision's `advice`, by name. */
export const personNamed = (name: string) => Object.values(PEOPLE).find((p) => p.name === name);

/** What a person knows about themselves on `date`: only facts dated before it. */
export const factsBefore = (p: Person, date: string) => p.facts.filter((x) => x.date < date);
