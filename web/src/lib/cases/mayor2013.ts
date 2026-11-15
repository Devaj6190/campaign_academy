import type { Case, Claim, Source } from "./types";

// New York City Democratic mayoral primary, September 10, 2013, from inside the de Blasio campaign.
// Record: docs/research/2013-mayoral-primary.md. Only claims marked VERIFIED there are used, plus the campaign's
// own expenditure filings queried from NYC Open Data. Simulation numbers are invented and fitted: see `start.basis`.

const src = (id: string, title: string, publisher: string, date: string | undefined, url: string, kind: Source["kind"]): Source => ({ id, title, publisher, date, url, kind });
const c = (text: string, ...sources: string[]): Claim => ({ text, sources });
const est = (text: string, ...sources: string[]): Claim => ({ text, sources, estimate: true });

const sources: Source[] = [
  src("boe-cert", "Statement and Return Report for Certification, Primary Election 2013, Democratic Mayor, Citywide", "Board of Elections in the City of New York", "2013-09-30", "https://www.vote.nyc/sites/default/files/downloads/pdf/results/2013/2013SeptemberPrimaryElection/01011000000Citywide%20Democratic%20Mayor%20Citywide%20Recap.pdf", "data"),
  src("cfb-limits", "Limits and Thresholds, 2013", "NYC Campaign Finance Board", undefined, "https://www.nyccfb.info/candidate-services/limits-thresholds/2013/", "filing"),
  src("cfb-ao", "Advisory Opinion 2013-2: runoff in the 2013 Democratic mayoral primary reasonably anticipated", "NYC Campaign Finance Board", "2013-06-20", "https://www.nyccfb.info/law/advisory-opinions/2013-2-runoff-2013-democratic-mayoral-primary-reasonably-anticipated", "filing"),
  src("cfb-exp", "Campaign expenditures, 2013 election cycle, candidate 326 (de Blasio), totalled by purpose and payment date", "NYC Campaign Finance Board via NYC Open Data", undefined, "https://data.cityofnewyork.us/resource/qxzj-vkn2.json?election=2013&candid=326&purposecd=TVADS", "filing"),
  src("q-0522", "Quinn at 25% in New York City Dem primary (with trend from January 16)", "Quinnipiac University Poll", "2013-05-22", "https://poll.qu.edu/images/polling/nyc/nyc05222013.pdf", "data"),
  src("q-0626", "Quinn, Thompson, Weiner tied in New York City primary", "Quinnipiac University Poll", "2013-06-26", "https://poll.qu.edu/images/polling/nyc/nyc06262013.pdf", "data"),
  src("q-0715", "Black voters lift Weiner, Spitzer in NYC Dem primary", "Quinnipiac University Poll", "2013-07-15", "https://poll.qu.edu/images/polling/nyc/nyc07152013.pdf", "data"),
  src("q-0724", "Thompson tops Quinn, Weiner in NYC Dem primary runoff", "Quinnipiac University Poll", "2013-07-24", "https://poll.qu.edu/images/polling/nyc/nyc07242013.pdf", "data"),
  src("q-0813", "De Blasio leads see-saw New York City mayoral race (with July 29 trend)", "Quinnipiac University Poll", "2013-08-13", "https://poll.qu.edu/images/polling/nyc/nyc08132013.pdf", "data"),
  src("q-0828", "De Blasio close to 40% in New York City mayoral race", "Quinnipiac University Poll", "2013-08-28", "https://poll.qu.edu/images/polling/nyc/nyc08282013.pdf", "data"),
  src("q-0903", "De Blasio surges past 40% in New York City mayoral race", "Quinnipiac University Poll", "2013-09-03", "https://poll.qu.edu/images/polling/nyc/nyc09032013_efbna.pdf", "data"),
  src("m-0214", "NYC Mayoralty: Quinn leads Democratic field", "Marist Poll", "2013-02-14", "https://maristpoll.marist.edu/polls/214-nyc-mayoralty-quinn-leads-democratic-fieldlhota-ahead-among-gop/", "data"),
  src("m-0725", "Quinn reclaims lead from Weiner in Democratic primary", "Marist Poll", "2013-07-25", "https://maristpoll.marist.edu/polls/725-quinn-reclaims-lead-from-weiner-in-democratic-primary-should-weiner-drop-out-dems-divide/", "data"),
  src("m-0816", "August 16, 2013 release", "Marist Poll", "2013-08-16", "https://maristpoll.marist.edu/?p=26747", "data"),
  src("m-0909", "September 9, 2013 release", "Marist Poll", "2013-09-09", "https://maristpoll.marist.edu/?p=26820", "data"),
  src("tpm-brand", "Branding Bill De Blasio: The Message Machine That Made NYC's Next Mayor", "Talking Points Memo", "2013-11-06", "https://talkingpointsmemo.com/?p=206375", "reporting"),
  src("wnyc-lucky", "De Blasio's Long, and Lucky, Campaign", "WNYC", "2013-11-05", "https://wnyc.org/story/de-blasio-long-and-lucky-campaign/", "analysis"),
  src("wnyc-thompson", "The End of Bill Thompson's Long Campaign", "WNYC", "2013-09-16", "https://wnyc.org/story/end-bill-thompsons-long-campaign/", "reporting"),
  src("wnyc-liu", "Liu Denied Public Matching Funds", "WNYC", "2013-08-05", "https://wnyc.org/story/310771-liu-denied-public-matching-funds/", "reporting"),
  src("dna-launch", "Bill de Blasio Launches Run for Mayor", "DNAinfo", "2013-01-27", "https://www.dnainfo.com/new-york/20130127/park-slope/bill-de-blasio-launches-run-for-mayor", "reporting"),
  src("dna-0114", "Candidates for Mayor Rake in Cash as Campaigns Heat Up", "DNAinfo", "2013-01-14", "https://www.dnainfo.com/new-york/20130114/new-york-city/candidates-for-mayor-rake-cash-as-campaigns-heat-up", "reporting"),
  src("dna-0514", "Mayoral Hopeful Bill Thompson Reports Major Jump in Fundraising", "DNAinfo", "2013-05-14", "https://www.dnainfo.com/new-york/20130514/new-york-city/mayoral-hopeful-bill-thompson-reports-major-jump-fundraising", "reporting"),
  src("dna-arrest", "Mayoral Candidate Bill de Blasio Arrested During Protest", "DNAinfo", "2013-07-10", "https://www.dnainfo.com/new-york/20130710/midtown/mayoral-candidate-bill-de-blasio-arrested-during-protest", "reporting"),
  src("dna-0723", "Anthony Weiner Admits Additional Sexts", "DNAinfo", "2013-07-23", "https://www.dnainfo.com/new-york/20130723/civic-center/anthony-weiner-admits-additional-sexts", "reporting"),
  src("dna-0724", "Weiner's Rivals Weigh In on Latest Sexting Scandal", "DNAinfo", "2013-07-24", "https://www.dnainfo.com/new-york/20130724/civic-center/weiners-rivals-weigh-on-latest-sexting-scandal", "reporting"),
  src("dna-0812", "Quinn, de Blasio, Liu Vow to Drop Any Appeal of Stop-and-Frisk Decision", "DNAinfo", "2013-08-12", "https://www.dnainfo.com/new-york/20130812/civic-center/quinn-de-blasio-liu-vow-drop-any-appeal-of-stop-and-frisk-decision", "reporting"),
  src("bkpaper-lich", "Report on the July 10 hospital protest arrests", "Brooklyn Paper", "2013-07-11", "https://www.brooklynpaper.com/stories/36/28/dtg_licharrests_2013_07_12_bk.html", "reporting"),
  src("npq-lich", "Mayoral Hopeful Arrested in Hospital Closing Protest", "Nonprofit Quarterly", "2013-07-15", "https://nonprofitquarterly.org/mayoral-hopeful-arrested-in-hospital-closing-protest/", "analysis"),
  src("cbs-weiner", "Former Rep. Anthony Weiner Enters NYC Mayoral Race", "CBS New York", "2013-05-22", "https://www.cbsnews.com/newyork/news/former-rep-anthony-weiner-enters-nyc-mayoral-race", "reporting"),
  src("cbs-exit", "Exit polls: De Blasio leads in NYC mayoral primary race", "CBS News", "2013-09-10", "https://www.cbsnews.com/news/exit-polls-de-blasio-leads-in-nyc-mayoral-primary-race", "data"),
  src("qns-thompson", "Thompson ends mayoral bid", "Queens Courier", "2013-09-16", "https://qns.com/2013/09/thompson-ends-mayoral-bid/", "reporting"),
  src("vin-ad", "Bill de Blasio's Son, 15, Appears on Campaign Ad", "VIN News", "2013-08-08", "https://vinnews.com/2013/08/08/new-york-bill-de-blasios-son-15-appears-on-campaign-ad/", "reporting"),
  src("dk-ad2", "Community post reproducing the campaign's email about its second ad", "Daily Kos", "2013-08-19", "https://www.dailykos.com/stories/2013/8/19/1232226/-NYC-Mayor-Bill-de-Blasio-s-D-New-Ad-Goes-After-Stop-And-Frisk", "campaign"),
  src("newsone-0826", "Bill Thompson Attacks Rival In New Ad", "NewsOne", "2013-08-26", "https://newsone.com/2698746/bill-thompson-stop-and-frisk-2/", "reporting"),
  src("spb-hyers", "Summary of a Washington Post profile of Bill Hyers", "SaintPetersBlog", undefined, "https://saintpetersblog.com/must-read-profile-of-charlie-crists-new-campaign-manager", "reporting"),
  src("gg-walzak", "In Communications Move, de Blasio Chooses Campaign Over City Hall", "Gotham Gazette", "2016-10-24", "https://www.gothamgazette.com/city/6589-in-communications-move-de-blasio-chooses-campaign-over-city-hall", "reporting"),
  src("gqr", "Congratulations to Bill de Blasio", "Greenberg Quinlan Rosner", "2013-09-16", "https://www.gqrr.com/news/congratulations-to-bill-de-blasio-2", "campaign"),
  // Outside events a published source ties to this race (research pass, 15 November 2026; each page loaded and read).
  src("wfuv-0425", "Democrats in Mayor Race Spar Over Issues of Public Safety", "WFUV", "2013-04-25", "https://wfuv.org/content/democrats-mayor-race-spar-over-issues-public-safety", "reporting"),
  src("aj-trayvon", "Sex, race and Trayvon Martin in NY politics", "Al Jazeera", "2013-08-08", "https://www.aljazeera.com/blogs/americas/2013/07/84626.html", "analysis"),
  src("fa-detroit", "NYC's Good Times May Sour As Detroit's Did, Mayor Bloomberg Says", "Bloomberg News, via Financial Advisor", "2013-08-06", "https://www.fa-mag.com/news/nyc-s-good-times-may-sour-as-detroit-s-did--mayor-bloomberg-says-15105.html?print", "reporting"),
  src("nation-0813", "A Populist Insurgency in New York City", "The Nation", "2013-08-13", "https://www.thenation.com/?p=107906", "analysis"),
  src("trd-0702", "Bill de Blasio calls for greater affordable housing to lessen \"tale of two cities\"", "The Real Deal", "2013-07-02", "https://therealdeal.com/new-york/2013/07/02/bill-de-blasio-calls-for-greater-affordable-housing-to-lessen-tale-of-two-cities/", "reporting"),
  src("nextcity-0903", "Bill de Blasio Is Running on Change, but Can New Yorkers Believe in It?", "Next City", "2013-09-03", "https://nextcity.org/equityfactor/entry/bill-de-blasio-is-running-on-change-but-can-new-yorkers-believe-in-it", "analysis"),
  src("dna-quinn-0211", "Quinn Vows to Build 40,000 New Middle-Class Apartments", "DNAinfo", "2013-02-11", "https://www.dnainfo.com/new-york/20130211/new-york-city/quinn-vows-build-40000-new-middle-class-apartments", "reporting"),
  src("dna-quinn-0529", "Quinn Pledges New CUNY Campus in Brooklyn Navy Yard in Tech Speech", "DNAinfo", "2013-05-29", "https://www.dnainfo.com/new-york/20130529/flatiron/quinn-pledges-new-cuny-campus-brooklyn-navy-yard-tech-speech", "reporting"),
  src("jw-thompson-0807", "'We're Not Going Backwards On Crime'", "New York Jewish Week (JTA)", "2013-08-07", "https://www.jta.org/2013/08/07/ny/were-not-going-backwards-on-crime", "reporting"),
  src("dna-thompson-0729", "Police Unions Unfazed by Thompson's Damning Tone On 'Stop-and-Frisks'", "DNAinfo", "2013-07-29", "https://www.dnainfo.com/new-york/20130729/civic-center/police-unions-unfazed-by-thompsons-damning-tone-on-stop-frisks", "reporting"),
  src("sb-thompson-0816", "Thompson Puts Cars First in Transportation Platform", "Streetsblog NYC", "2013-08-16", "https://nyc.streetsblog.org/2013/08/16/thompson-puts-cars-first-in-transportation-platform-announcement", "analysis"),
  src("cbs-liu-0814", "City Comptroller Liu Calls For Legalizing Pot In NYC", "CBS New York", "2013-08-14", "https://www.cbsnews.com/newyork/news/city-comptroller-liu-calls-for-legalizing-pot-in-nyc", "reporting"),
  src("tnr-liu-0814", "The Most Surprising Proposal in the New York Mayoral Race", "The New Republic", "2013-08-14", "https://newrepublic.com/article/114304/john-lius-progressive-proposal-new-york-mayor-race", "analysis"),
  src("cap-weiner-0703", "Anthony Weiner's single-payer plan is progressive, but not single-payer (Capital New York, reposted)", "PNHP / Capital New York", "2013-07-03", "https://pnhp.org/news/anthony-weiners-single-payer-plan-is-progressive-but-not-single-payer/", "analysis"),
  src("chalk-prek", "Public advocate tells city's elite he'd raise taxes to pay for pre-K", "Chalkbeat New York", "2012-10-04", "https://www.chalkbeat.org/newyork/2012/10/4/21092903/public-advocate-tells-city-s-elite-he-d-raise-taxes-to-pay-for-pre-k", "reporting"),
];

const TV = "Money left to spend";

export const mayor2013: Case = {
  id: "nyc-2013-dem-mayor",
  title: "The 2013 primary for Mayor of New York",
  office: "Mayor of New York City, Democratic primary",
  electionDate: "2013-09-10",
  briefingDate: "2013-01-27",
  follow: "deblasio",
  lesson: "A campaign in fourth place has a spending cap, one message and a few moments that matter. What you hold back is as much a decision as what you spend.",
  threshold: 40,

  briefing: [
    c("Bill de Blasio, the city's Public Advocate, announces outside his home in Park Slope, Brooklyn. He says twelve years under Mayor Bloomberg have left the middle class behind.", "dna-launch"),
    c("Christine Quinn leads every public poll with 35 to 37 percent of Democrats. De Blasio, Bill Thompson and John Liu are bunched between 9 and 14.", "q-0522", "m-0214"),
    c("If nobody reaches 40 percent, the top two meet in a runoff.", "cfb-ao"),
    c("Candidates who take public matching funds may spend no more than $6,426,000 on the primary. The city matches small donations from residents six to one, up to $3,534,300.", "cfb-limits"),
    c("Quinn has $5.3 million on hand. De Blasio's campaign says that with expected matching funds it is already close to the spending limit.", "dna-0114"),
    c("The mayor is leaving after three terms and is not on the ballot.", "cbs-exit"),
  ],

  candidates: [
    { id: "deblasio", name: "Bill de Blasio", standing: "Public Advocate, low double digits in the polls", about: [c("In October 2012 he proposed raising the city income tax on incomes above $500,000 to pay for full-day pre-kindergarten and after-school programmes.", "chalk-prek")] },
    { id: "quinn", name: "Christine Quinn", standing: "Speaker of the City Council, front-runner", about: [c("The best funded candidate, and first in every poll at this date.", "dna-0114", "m-0214"), c("Later coverage reports protests and resentment over her support for allowing the mayor a third term.", "wnyc-lucky")] },
    { id: "thompson", name: "Bill Thompson", standing: "Former Comptroller, the party's 2009 nominee", about: [c("Lost to Bloomberg in 2009 by fewer than 50,000 votes. The only Black candidate among the leading contenders.", "wnyc-thompson", "q-0626")] },
    { id: "liu", name: "John Liu", standing: "City Comptroller", about: [c("About 9 percent in early polls, with just over $2 million on hand.", "q-0522", "dna-0114"), c("On August 5 the Campaign Finance Board denied his campaign public matching funds.", "wnyc-liu")] },
    { id: "weiner", name: "Anthony Weiner", standing: "Former congressman, not yet running", about: [c("Resigned from Congress in 2011. He enters this race by video on May 22 with $4.8 million in his campaign account.", "cbs-weiner")] },
  ],

  // Each plank is dated to when it was first on record; a plank that answered a decision waits for that decision.
  platform: [
    {
      text: "Raise the city income tax on incomes above $500,000 to fund full-day pre-kindergarten and after-school programmes.",
      sources: ["chalk-prek"],
      asOf: "2012-10-04",
      reactions: [
        { who: "Stephanie Gendell, Campaign for Children", text: "Called the plan bold and fully funded.", sources: ["chalk-prek"], stance: "for", asOf: "2012-10-04" },
        { who: "Mayor Michael Bloomberg", text: "Said the tax would drive people out of the city.", sources: ["chalk-prek"], stance: "against", asOf: "2012-10-04" },
        { who: "Quinnipiac poll of city voters", text: "56 percent said they were more likely to back a candidate who would raise taxes on the wealthy.", sources: ["q-0522"], stance: "for", asOf: "2013-05-22" },
      ],
    },
    {
      text: "Paid sick leave: press the Council Speaker to allow a vote on the paid sick days bill.",
      sources: ["wnyc-lucky"],
      asOf: "2013-01-27",
      reactions: [
        { who: "Paid sick leave activists", text: "Held events with him in January 2013 against the Speaker's stalling of the bill.", sources: ["wnyc-lucky"], stance: "for", asOf: "2013-01-27" },
      ],
    },
    {
      text: "A clean break from the Bloomberg years, framed as a tale of two cities divided by income.",
      sources: ["tpm-brand", "dna-launch"],
      asOf: "2013-01-27",
      decision: "positioning",
      reactions: [
        { who: "Katrina vanden Heuvel, The Nation", text: "Praised the agenda as a populist insurgency.", sources: ["nation-0813"], stance: "for", asOf: "2013-08-13" },
        { who: "Quinnipiac poll of likely Democratic primary voters", text: "65 percent wanted a new direction from the Bloomberg years.", sources: ["q-0828"], stance: "for", asOf: "2013-08-28" },
        { who: "Mayor Michael Bloomberg", text: "Called the campaign racist in a September 2013 interview, as reported by TPM.", sources: ["tpm-brand"], stance: "against", asOf: "2013-09-10" },
      ],
    },
    {
      text: "Keep community hospitals open, in particular Long Island College Hospital in Brooklyn.",
      sources: ["dna-arrest", "bkpaper-lich"],
      asOf: "2013-07-10",
      decision: "hospital",
      reactions: [
        { who: "1199 SEIU and the New York State Nurses Association", text: "The health-care unions organised the protests over the hospital; 1199 had endorsed him.", sources: ["dna-arrest", "npq-lich"], stance: "for", groups: ["union"], asOf: "2013-07-10" },
        { who: "SUNY", text: "The state university system, which ran the hospital, was planning its sale.", sources: ["dna-arrest"], stance: "against", asOf: "2013-07-10" },
      ],
    },
    {
      text: "Create or preserve 200,000 affordable homes, put about $1 billion of city pension money into building them, and tighten the 80/20 programme so more new projects are affordable.",
      sources: ["trd-0702"],
      asOf: "2013-07-02",
      reactions: [
        { who: "Brad Lander, City Council member", text: "Praised his vision of more equal development and said he was optimistic it could be delivered.", sources: ["nextcity-0903"], stance: "for", asOf: "2013-09-03" },
      ],
    },
    {
      text: "Overhaul stop-and-frisk: no appeal of the federal ruling against it, and an inspector general for the police.",
      sources: ["dna-launch", "dna-0812"],
      asOf: "2013-08-12",
      reactions: [
        { who: "Quinnipiac poll of likely Democratic primary voters", text: "60 percent called the tactic excessive.", sources: ["q-0813"], stance: "for", asOf: "2013-08-13" },
        { who: "Quinnipiac poll of likely Democratic primary voters", text: "31 percent called it an acceptable way to make the city safer.", sources: ["q-0813"], stance: "against", asOf: "2013-08-13" },
      ],
    },
    // The rivals, from coverage of the race. Same rules: dated, cited, nothing beyond the source.
    {
      by: "quinn",
      text: "Build 40,000 middle-class apartments over ten years, paid for by borrowing and savings, with a tax break for owners who keep units affordable.",
      sources: ["dna-quinn-0211"],
      asOf: "2013-02-11",
      reactions: [
        { who: "Ruben Diaz Jr., Bronx Borough President", text: "Praised the package as substantive.", sources: ["dna-quinn-0211"], stance: "for", asOf: "2013-02-11" },
        { who: "Daniel Halloran, Queens Council member", text: "Said it could not be paid for without large tax rises.", sources: ["dna-quinn-0211"], stance: "against", asOf: "2013-02-11" },
      ],
    },
    { by: "quinn", text: "A technology agenda: a CUNY campus at the Brooklyn Navy Yard, a tech cluster in Long Island City and citywide high-speed internet by 2018.", sources: ["dna-quinn-0529"], asOf: "2013-05-29" },
    { by: "quinn", text: "Drop the city's appeal of the federal stop-and-frisk ruling.", sources: ["dna-0812"], asOf: "2013-08-12" },
    {
      by: "thompson",
      text: "Keep stop-and-frisk but limit it to stops tied to a suspect description, and add 2,000 officers.",
      sources: ["jw-thompson-0807", "dna-thompson-0729"],
      asOf: "2013-07-29",
      reactions: [
        { who: "Leaders of the detectives' and captains' unions", text: "Stood by him and called his approach realistic.", sources: ["dna-thompson-0729"], stance: "for", groups: ["union"], asOf: "2013-07-29" },
      ],
    },
    {
      by: "thompson",
      text: "A driver-friendly transport plan: pay-by-phone parking meters, no tolls on the East River bridges, real bus rapid transit, and bring back the commuter tax.",
      sources: ["sb-thompson-0816"],
      asOf: "2013-08-16",
      reactions: [
        { who: "Amalgamated Transit Union Local 726", text: "Endorsed him at the plan's launch.", sources: ["sb-thompson-0816"], stance: "for", groups: ["union"], asOf: "2013-08-16" },
        { who: "Streetsblog", text: "Called it the most driver-friendly plan in the race and noted it never mentions pedestrians.", sources: ["sb-thompson-0816"], stance: "against", asOf: "2013-08-16" },
      ],
    },
    { by: "liu", text: "Abolish stop-and-frisk, the only leading candidate to pledge it.", sources: ["jw-thompson-0807"], asOf: "2013-08-07" },
    {
      by: "liu",
      text: "Legalise and tax marijuana, for about $400 million a year, and use the money to cut CUNY tuition.",
      sources: ["cbs-liu-0814", "tnr-liu-0814"],
      asOf: "2013-08-14",
      reactions: [
        { who: "Betty Aldworth, National Cannabis Industry Association", text: "Applauded the plan.", sources: ["cbs-liu-0814"], stance: "for", asOf: "2013-08-14" },
        { who: "Gabriel Sayegh, Drug Policy Alliance", text: "Doubted it would get anywhere in Albany.", sources: ["tnr-liu-0814"], stance: "against", asOf: "2013-08-14" },
      ],
    },
    {
      by: "weiner",
      text: "A city-run health plan modelled on single payer, pooling city health spending, that could cover undocumented immigrants.",
      sources: ["cap-weiner-0703"],
      asOf: "2013-07-03",
      reactions: [
        { who: "Richard Gottfried, State Assembly member", text: "Said Weiner's thinking on coverage was in the right place.", sources: ["cap-weiner-0703"], stance: "for", asOf: "2013-07-03" },
        { who: "Dr. David Himmelstein, Physicians for a National Health Program", text: "Said it had useful parts but was not truly single payer.", sources: ["cap-weiner-0703"], stance: "against", asOf: "2013-07-03" },
      ],
    },
  ],

  groups: [
    { id: "black", name: "Black voters", census: "black" },
    { id: "white", name: "White voters", census: "white" },
    { id: "hispanic", name: "Hispanic voters", census: "hispanic" },
    { id: "union", name: "Union households" },
  ],

  start: {
    budget: 4_300_000,
    poll: { deblasio: 12, quinn: 36, thompson: 11, liu: 9, weiner: 0 },
    groups: { black: 10, white: 14, hispanic: 11, union: 12 },
    basis: [
      c("Starting poll shares follow the public polls of January and February 2013.", "q-0522", "m-0214"),
      est("Money left to spend is the room under the $6,426,000 cap after an allowance for staff, rent and other fixed costs. The campaign's filings record about $3.9 million of television spending between January 1 and September 10, 2013.", "cfb-limits", "cfb-exp"),
      est("Support within each voter group at the start is an estimate. Public polls did not break out these groups for de Blasio until the summer.", "q-0813"),
      est("Every change the simulation applies is invented in size. Sizes were chosen so that the real campaign's own choices finish near the certified result.", "boe-cert"),
    ],
  },

  decisions: [
    {
      id: "positioning",
      date: "2013-01-27",
      title: "What do you run as?",
      skill: "voter-groups",
      situation: [
        c("Quinn leads with 35 to 37 percent. You, Thompson and Liu are bunched between 9 and 14.", "q-0522", "m-0214"),
        c("The mayor is not running after three terms.", "cbs-exit"),
        c("Your media consultant's reading is that your rivals are aiming their messages at the middle class.", "tpm-brand"),
      ],
      constraints: { daysLeft: 226, notes: ["Spending cap for the primary: $6,426,000"] },
      options: [
        { id: "break", label: "A sharp break from the last twelve years", detail: "Income inequality is the central theme. You are the clear alternative to the incumbent's record.", preview: { up: ["Black voters", "Hispanic voters"], down: [] }, effect: { groups: { black: 2, hispanic: 2, white: 1 } } },
        { id: "manager", label: "An experienced manager", detail: "Keep what worked, fix what did not. Aimed at the middle class.", preview: { up: ["Poll standing", "White voters"], down: ["Black voters"] }, effect: { poll: { deblasio: 1 }, groups: { white: 2, black: -1 } } },
        { id: "boroughs", label: "The outer-borough candidate", detail: "Neighbourhood services and equal treatment of the five boroughs come first.", preview: { up: ["Hispanic voters", "Union households"], down: ["White voters"] }, effect: { groups: { hispanic: 2, union: 1, white: -1 } } },
        { id: "prek", label: "One signature policy", detail: "Run on schools and pre-kindergarten and leave the incumbent's record alone.", preview: { up: ["Poll standing", "White voters"], down: [] }, effect: { poll: { deblasio: 1 }, groups: { white: 2 } } },
      ],
      advice: [
        { name: "John Del Cecato", role: "Media consultant", argues: "break", basis: "on-record", sources: ["tpm-brand"], says: "Proposed the tale of two cities as the frame, to make you the clear progressive while rivals compete for the same middle-class ground." },
        { role: "Finance director", argues: "manager", basis: "predicted", sources: [], says: "Donors and editorial boards reward a steady hand. A manager's pitch keeps doors open that a break from the mayor closes." },
        { role: "Field director", argues: "boroughs", basis: "predicted", sources: [], says: "You live in Brooklyn and the front-runner is from Manhattan. Borough fairness is a message volunteers can carry door to door." },
      ],
      taken: "break",
      did: [
        c("Early in 2013 media consultant John Del Cecato met Bill and Chirlane de Blasio to build the message and proposed the tale of two cities. The aim was to make de Blasio the clear progressive and to differ from rivals' middle-class framing.", "tpm-brand"),
        c("The launch speech argued the Bloomberg years had left the middle class behind, while giving the mayor credit on public health.", "dna-launch"),
      ],
      followed: [
        c("Nothing moved for six months. He polled 14, 14, 11, 10, 10 and 10 percent among Democrats from February to mid-July.", "q-0522", "q-0626", "q-0715"),
        c("By August 28, 65 percent of likely primary voters wanted a new direction, and he led widely among voters who wanted a candidate with new ideas.", "q-0828"),
        c("On primary day about seven in ten voters wanted a different direction, and most of them backed him.", "cbs-exit"),
      ],
      saidAfter: [
        { who: "John Del Cecato, the campaign's media consultant", ...c("Rivals made strategic mistakes: they underestimated de Blasio and assumed voters wanted a business-friendly, middle-class focus.", "tpm-brand") },
        { who: "Anna Sale, WNYC", ...c("He read fatigue with the incumbent accurately, but luck and rivals' missteps also shaped the result.", "wnyc-lucky") },
      ],
    },
    {
      id: "weiner",
      date: "2013-05-22",
      title: "A famous rival enters. What do you do about him?",
      skill: "delegating",
      since: {
        notes: [
          c("Anthony Weiner enters the race by video with $4.8 million. That day's poll: Quinn 25, Weiner 15, de Blasio 10, Thompson 10.", "cbs-weiner", "q-0522"),
          c("You raised $240,000 in the last filing period. Thompson raised $600,000 and Quinn $510,000.", "dna-0514"),
          c("After the Boston Marathon bombing, a forum turned on whether to keep Police Commissioner Ray Kelly. Quinn would keep him; you would not.", "wfuv-0425"),
        ],
        shift: { poll: { deblasio: -2, quinn: -10, thompson: -1, liu: -3, weiner: 15 } },
      },
      situation: [
        c("Coverage says the new entrant's talk of middle-class struggles is crowding out your message.", "wnyc-lucky"),
        c("Your campaign has already reached the most it can claim in matching funds for the primary.", "dna-0514"),
        c("There are 111 days to the primary. As late as mid-July, 47 percent of Democrats will still not know enough about you to have a view.", "q-0715"),
      ],
      constraints: { daysLeft: 111 },
      options: [
        { id: "attack", label: "Go after him directly", detail: "Try to disqualify the new entrant before he settles in.", preview: { up: ["Poll standing"], down: [TV] }, effect: { poll: { deblasio: 1 }, budget: -150_000 } },
        { id: "hold", label: "Leave him alone and stay on plan", detail: "Keep the campaign aimed at the incumbent's record and the front-runner. Spend nothing extra now.", preview: { up: [], down: [] }, effect: {} },
        { id: "shift", label: "Change the message", detail: "Compete for the same outer-borough, middle-class voters he is talking to.", preview: { up: ["Poll standing", "White voters"], down: ["Black voters", "Hispanic voters"] }, effect: { poll: { deblasio: 1 }, groups: { white: 1, black: -2, hispanic: -1 } } },
        { id: "early", label: "Spend early on name recognition", detail: "Start paid advertising months ahead of plan so voters know who you are before the summer.", preview: { up: ["Poll standing"], down: [TV] }, effect: { poll: { deblasio: 3 }, budget: -700_000 } },
      ],
      advice: [
        { name: "Bill Hyers", role: "Campaign manager", argues: "hold", basis: "on-record", sources: ["spb-hyers", "gg-walzak"], says: "When the candidate, trailing, considered speeding up and spending more to raise his name recognition, he recommended staying with the plan." },
        { role: "Communications aide", argues: "attack", basis: "predicted", sources: [], says: "He is taking your oxygen every day. A direct contrast gets you into every story written about him." },
        { role: "Pollster", argues: "early", basis: "predicted", sources: [], says: "Nearly half of Democrats cannot rate you. You cannot win an argument with voters who do not know your name." },
      ],
      taken: "hold",
      did: [
        c("On the day Weiner entered, de Blasio's spokesman said only that the race was now wide open.", "cbs-weiner"),
        c("A later profile of campaign manager Bill Hyers says de Blasio, trailing, considered speeding up and spending more, and Hyers recommended staying with the plan.", "spb-hyers"),
      ],
      followed: [
        c("Weiner rose to 25 or 26 percent by mid-July, then fell: 16 on July 29 and 10 on August 13.", "q-0715", "q-0724", "q-0813"),
        c("On July 23, after Weiner admitted to further explicit messages, de Blasio called on him to withdraw. He and Sal Albanese were the only Democratic candidates to do so.", "dna-0723", "dna-0724"),
        c("Weiner finished fifth with 4.94 percent.", "boe-cert"),
      ],
      saidAfter: [
        { who: "Anna Sale, WNYC", ...c("Weiner's collapse was the first of de Blasio's lucky breaks.", "wnyc-lucky") },
        { who: "Maurice Carroll, Quinnipiac poll director, on August 28", ...c("De Blasio had been in fourth place five weeks earlier.", "q-0828") },
      ],
    },
    {
      id: "hospital",
      date: "2013-07-10",
      title: "A hospital is closing and there is a protest today",
      skill: "policy",
      since: { notes: [c("Thompson has won the teachers' union endorsement and risen to 16 percent. Weiner now leads some polls.", "q-0626", "m-0725")], shift: { poll: { weiner: 10, quinn: -3, thompson: 1, liu: 1 } } },
      situation: [
        c("The state university is considering selling Long Island College Hospital in Brooklyn and has diverted ambulances from it. A judge has ordered the hospital kept running.", "dna-arrest", "bkpaper-lich"),
        c("The protest is organised with 1199 SEIU, which has endorsed you, and the state nurses' association, which has not endorsed anyone yet.", "dna-arrest", "npq-lich"),
        c("Two rivals, Liu and Weiner, will also be there. Organisers plan civil disobedience.", "npq-lich"),
        c("You hold citywide office as Public Advocate.", "dna-launch"),
      ],
      constraints: { daysLeft: 62 },
      options: [
        { id: "speak", label: "Attend, speak, and leave when ordered", detail: "Show up for the cause and step back when police tell the crowd to disperse.", preview: { up: ["Union households"], down: [] }, effect: { poll: { deblasio: 1 }, groups: { union: 3 } } },
        { id: "arrest", label: "Join the civil disobedience and accept arrest", detail: "Stay with the hospital workers when the order comes.", preview: { up: ["Poll standing", "Union households", "Black voters"], down: ["White voters"] }, effect: { poll: { deblasio: 3 }, groups: { union: 8, black: 2, white: -1 } } },
        { id: "courts", label: "Stay off the street and use your office", detail: "Pursue the hospital through the courts and the Public Advocate's powers.", preview: { up: ["White voters", "Union households"], down: [] }, effect: { groups: { white: 1, union: 2 } } },
        { id: "statement", label: "Send a statement of support", detail: "Keep the day for other campaigning.", preview: { up: ["White voters"], down: ["Union households"] }, effect: { groups: { white: 1, union: -2 } } },
      ],
      advice: [
        { role: "Labor liaison", argues: "arrest", basis: "predicted", sources: [], says: "The union that endorsed you is putting its own members on the line today. They will remember who stood with them and who stepped back." },
        { role: "Campaign counsel", argues: "courts", basis: "predicted", sources: [], says: "You hold an office with standing to sue. A court order keeps the hospital open; a photograph does not." },
        { role: "Communications aide", argues: "speak", basis: "predicted", sources: [], says: "Be there and be heard, but a mayoral candidate in handcuffs is a story you do not control." },
      ],
      taken: "arrest",
      did: [c("De Blasio was one of fifteen people arrested outside the state university chancellor's office in Manhattan, with a Council member, two nurses' union leaders and nine hospital employees. The charge was disorderly conduct and all were released within hours. Liu and Weiner moved back into the crowd and were not arrested.", "bkpaper-lich", "dna-arrest", "npq-lich")],
      followed: [c("He polled 10 percent five days later, 15 on July 24 and 21 on July 29. Weiner's new admissions fall in the same weeks, so no source separates the effect of the arrest.", "q-0715", "q-0724", "q-0813")],
      saidAfter: [{ who: "Ruth McCambridge, Nonprofit Quarterly", ...c("The optics mattered, and the event could carry symbolic weight in endorsement decisions still to come.", "npq-lich") }],
    },
    {
      id: "budget",
      date: "2013-07-15",
      title: "Eight weeks left. How do you split the money?",
      skill: "budgeting",
      situation: [
        c("Every candidate in the public financing programme has the same $6,426,000 limit for the primary.", "cfb-limits"),
        c("You are at 10 percent and fourth. Nearly half of Democrats do not know enough about you to rate you.", "q-0715"),
        c("Outside money is in play for a rival: the teachers' union will spend more than $2.5 million supporting Thompson.", "wnyc-thompson"),
      ],
      constraints: { daysLeft: 57, notes: ["What you spend now cannot be spent in August"] },
      options: [
        { id: "mix", label: "A conventional mix", detail: "Television, direct mail to likely voters, and field, starting now.", preview: { up: ["Poll standing", "Union households"], down: [TV] }, effect: { poll: { deblasio: 3 }, groups: { union: 1 }, budget: -600_000 } },
        { id: "alltv", label: "Hold everything for television", detail: "Send no mail. Keep every available dollar for television in the final five weeks.", preview: { up: ["Poll standing"], down: [] }, effect: { poll: { deblasio: 2 } } },
        { id: "mail", label: "Lead with targeted mail", detail: "Mail the groups most likely to back you, and keep a smaller television buy for the last two weeks.", preview: { up: ["Poll standing", "Black voters", "Hispanic voters"], down: [TV] }, effect: { poll: { deblasio: 2 }, groups: { black: 2, hispanic: 2 }, budget: -500_000 } },
        { id: "tvnow", label: "Start television now at low weight", detail: "Lift your name recognition in July, at the cost of a thinner August.", preview: { up: ["Poll standing"], down: [TV] }, effect: { poll: { deblasio: 4 }, budget: -900_000 } },
      ],
      advice: [
        { name: "Bill Hyers", role: "Campaign manager", argues: "alltv", basis: "predicted", sources: ["cfb-exp"], says: "The city is several separate constituencies and only television reaches all of them at once. Under a cap, a dollar of mail is a dollar off the air." },
        { role: "Mail consultant", argues: "mail", basis: "predicted", sources: [], says: "Primary turnout is small and the voter file tells you who they are. Mail talks to them and nobody else." },
        { role: "Pollster", argues: "tvnow", basis: "predicted", sources: [], says: "You are fourth with eight weeks left. Voters who meet you in late August may already have chosen someone." },
      ],
      taken: "alltv",
      did: [
        c("The campaign's filings record about $3.88 million as television advertising out of about $5.65 million paid out between January 1 and September 10, 2013. One payment of $1,767 is coded as a campaign mailing.", "cfb-exp"),
        c("The first large television payment, $1.1 million, is dated August 6. Further payments of about $760,000, $950,000 and $1 million follow on August 14, 21 and 28.", "cfb-exp"),
      ],
      followed: [c("He went from 15 percent on July 24 to 30 on August 13, 36 on August 28 and 43 on September 3 among likely voters.", "q-0724", "q-0813", "q-0828", "q-0903")],
      saidAfter: [{ who: "Maurice Carroll, Quinnipiac poll director, on September 3", ...c("Singled out the television commercial as the image of the campaign.", "q-0903") }],
    },
    {
      id: "firstad",
      date: "2013-08-08",
      title: "Your first television ad",
      skill: "delegating",
      since: {
        notes: [
          c("On July 23 Weiner admitted to further explicit messages sent after he left Congress. He fell from first to fourth within a week.", "dna-0723", "q-0813"),
          c("Liu was denied public matching funds on August 5.", "wnyc-liu"),
          c("After the Zimmerman verdict in Florida, Thompson sharpened his attack on stop-and-frisk to win Black voters leaving Weiner.", "aj-trayvon"),
          c("Citing Detroit's bankruptcy, Mayor Bloomberg told voters to pick a mayor who would refuse retroactive raises for city workers.", "fa-detroit"),
          c("Polls of likely voters at the end of July: Quinn 26 or 27, with you, Thompson and Weiner between 15 and 21.", "q-0813", "m-0725"),
        ],
        shift: { poll: { deblasio: 6, quinn: 5, thompson: 10, weiner: -9, liu: -1 }, groups: { black: 3, white: 5, hispanic: 4, union: 3 } },
      },
      situation: [
        c("You need to finish in the top two to reach a runoff, or pass 40 percent to avoid one.", "cfb-ao"),
        c("A federal court ruling on stop-and-frisk is expected any day.", "dna-0812"),
        c("In mid-July nearly half of Democrats did not know enough about you to rate you.", "q-0715"),
      ],
      constraints: { daysLeft: 33, notes: ["A first flight of television costs about $1.1 million"] },
      options: [
        { id: "bio", label: "You, to camera, on your record", detail: "A biographical ad in which the candidate introduces himself.", preview: { up: ["Poll standing", "White voters"], down: [TV] }, effect: { poll: { deblasio: 4 }, groups: { white: 3 }, budget: -1_100_000 } },
        { id: "family", label: "A family member introduces you", detail: "Your teenage son speaks, naming the break from the incumbent, the tax plan and stop-and-frisk.", preview: { up: ["Poll standing", "Black voters", "White voters", "Hispanic voters"], down: [TV] }, effect: { poll: { deblasio: 6 }, groups: { black: 8, white: 12, hispanic: 8 }, budget: -1_100_000 }, synergy: { with: "positioning:break", effect: { poll: { deblasio: 3 }, groups: { black: 2, hispanic: 1 } } } },
        { id: "contrast", label: "A contrast with the front-runner", detail: "Open on term limits and her record alongside the incumbent.", preview: { up: ["Poll standing", "White voters"], down: [TV] }, effect: { poll: { deblasio: 5, quinn: -2 }, groups: { white: 4 }, budget: -1_100_000 } },
        { id: "wait", label: "Hold all television for the last two weeks", detail: "Stay dark now and concentrate the buy at the end.", preview: { up: [], down: [] }, effect: {} },
      ],
      advice: [
        { name: "John Del Cecato", role: "Media consultant", argues: "family", basis: "on-record", sources: ["tpm-brand"], says: "Had the idea after the candidate's son drew press attention at the launch, and persuaded the candidate to pay for the ad and run it." },
        { role: "Research director", argues: "contrast", basis: "predicted", sources: [], says: "The front-runner has never had to defend her record on air. Voters who want change need to hear why she is not it." },
        { role: "Communications aide", argues: "bio", basis: "predicted", sources: [], says: "Putting a child in front of a campaign invites criticism. Voters are choosing a mayor, so let them meet him." },
      ],
      taken: "family",
      did: [
        c("On August 8 the campaign released its first television ad, a 30-second spot in which the candidate's 15-year-old son says his father is the only Democrat who will break from the Bloomberg years and end a stop-and-frisk era.", "vin-ad"),
        c("Del Cecato said he had the idea after the son drew attention at the January launch, and that he persuaded de Blasio to pay for and run it. The campaign prepared for criticism by listing other candidates who had featured their children.", "tpm-brand"),
      ],
      followed: [
        c("On August 12 a federal judge ruled the police department's stop-and-frisk practices unconstitutional. De Blasio pledged not to appeal.", "dna-0812"),
        c("A poll taken August 7 to 12 put him first: de Blasio 30, Quinn 24, Thompson 22, Weiner 10. Its interviews only partly follow the ad.", "q-0813"),
        c("Among African American Democrats he went from 10 percent to 20 in the Marist poll of August 16.", "m-0816"),
      ],
      saidAfter: [
        { who: "David Axelrod, who saw the ad before it aired", ...c("The ad turned the race around.", "tpm-brand") },
        { who: "Maurice Carroll, Quinnipiac poll director", ...c("Credited the commercial with a boost among parents and Black voters, while allowing it might be the ad, the issues, or both.", "q-0903") },
        { who: "Anna Sale, WNYC", ...c("Weiner's collapse and the timing of the court ruling also explain the surge.", "wnyc-lucky") },
      ],
    },
    {
      id: "base",
      date: "2013-08-19",
      title: "The second ad, and whose voters you go after",
      skill: "voter-groups",
      since: { notes: [c("On August 12 a federal judge ruled stop-and-frisk unconstitutional and ordered a monitor. Thompson promised to work with the monitor without backing the Council's oversight bills.", "dna-0812")], shift: { poll: { deblasio: 2, quinn: -3, thompson: 2, weiner: -6 } } },
      situation: [
        c("Among Black likely voters the August 13 poll has Thompson 39, de Blasio 22, Quinn 18. Among white likely voters: de Blasio 39, Quinn 31, Thompson 12.", "q-0813"),
        c("60 percent of likely primary voters call stop-and-frisk excessive.", "q-0813"),
        c("Thompson has taken a restrained line on the policy, praising parts of it and pledging to keep it as a tool under an inspector general.", "newsone-0826"),
        c("Coverage describes Thompson as counting on being the only Black candidate to carry him into a runoff.", "wnyc-thompson"),
      ],
      constraints: { daysLeft: 22, notes: ["A second flight costs about $1.7 million", "The closing week will need about $1 million more"] },
      options: [
        { id: "frisk", label: "Make stop-and-frisk the second ad", detail: "Claim the sharpest position in the field on the issue.", preview: { up: ["Poll standing", "Black voters", "Hispanic voters"], down: [TV] }, effect: { poll: { deblasio: 5 }, groups: { black: 16, hispanic: 6, white: 5 }, budget: -1_700_000 }, synergy: { with: "positioning:break", effect: { poll: { deblasio: 2 }, groups: { black: 4, hispanic: 2 } } } },
        { id: "jobs", label: "Move to jobs and the cost of living", detail: "The issues voters rank first.", preview: { up: ["Poll standing", "White voters", "Hispanic voters", "Union households"], down: [TV] }, effect: { poll: { deblasio: 4 }, groups: { white: 3, hispanic: 4, union: 3 }, budget: -1_700_000 } },
        { id: "manhattan", label: "Take liberal Manhattan from the Speaker", detail: "Leave the former Comptroller's supporters alone, with a runoff in mind.", preview: { up: ["Poll standing", "White voters"], down: [TV] }, effect: { poll: { deblasio: 4, quinn: -2 }, groups: { white: 8 }, budget: -1_700_000 } },
        { id: "repeat", label: "Keep the first ad on air", detail: "A smaller buy, and no direct contrast with any rival.", preview: { up: ["Poll standing", "Black voters", "White voters"], down: [TV] }, effect: { poll: { deblasio: 3 }, groups: { black: 3, white: 2 }, budget: -1_200_000 } },
      ],
      advice: [
        { name: "Greenberg Quinlan Rosner", role: "Polling firm", argues: "frisk", basis: "predicted", sources: ["q-0813", "gqr"], says: "Six in ten primary voters call the policy excessive, and the candidate they assume owns the issue has not taken the sharp position." },
        { role: "Field director", argues: "jobs", basis: "predicted", sources: [], says: "At the doors people ask about rent and work. The ruling already made your point on policing for you." },
        { role: "Manhattan organiser", argues: "manhattan", basis: "predicted", sources: [], says: "The Speaker's voters are the easiest to move, and you may need the former Comptroller's supporters in a runoff." },
      ],
      taken: "frisk",
      did: [
        c("On August 19 the campaign released a second ad on stop-and-frisk. A campaign email said he was the only candidate who would end the stop-and-frisk era.", "dk-ad2"),
        c("Thompson answered with his own ad saying de Blasio's ad lied about his position, citing a newspaper fact-check that called the claim misleading. De Blasio's campaign stood by its ad.", "newsone-0826"),
      ],
      followed: [
        c("Among Black likely voters: de Blasio 34, Thompson 25 on August 28, then de Blasio 47, Thompson 25 on September 3.", "q-0828", "q-0903"),
        c("In the exit poll a majority of voters called stop-and-frisk excessive, and nearly six in ten of them backed de Blasio.", "cbs-exit"),
        c("WNYC's precinct analysis found Thompson lost 80 percent of majority-Black precincts to de Blasio.", "wnyc-thompson"),
      ],
      saidAfter: [
        { who: "Mark Winston Griffith, Brooklyn Movement Center", ...c("Thompson was seen as part of the Black political elite and was not the kind of candidate voters wanted that year.", "wnyc-thompson") },
        { who: "A newspaper fact-check, as cited in Thompson's ad", ...c("The claim to be the only candidate who would end the policy was misleading, since rivals had also pledged reform.", "newsone-0826") },
        { who: "Greenberg Quinlan Rosner, the campaign's polling firm", ...c("He carried every major racial and demographic group and all five boroughs.", "gqr") },
      ],
    },
  ],

  close: {
    notes: [c("The campaign's last large television payment before the primary, about $1 million, is dated August 28.", "cfb-exp")],
    shift: { poll: { deblasio: 2, quinn: -8, thompson: 4, weiner: -5, liu: 1 }, groups: { black: 3, white: 4, hispanic: 4, union: 4 }, budget: -1_000_000 },
  },

  press: [
    { date: "2013-01-14", outlet: "DNAinfo", summary: "Mayoral hopefuls reported six months of fundraising. Quinn held the largest reserve; de Blasio's campaign said it was nearing the spending limit once matching funds were counted.", source: "dna-0114", impact: 2 },
    { date: "2013-04-25", outlet: "WFUV", summary: "Ten days after the Boston Marathon bombing, a Democratic forum opened on counterterrorism and turned into a fight over Police Commissioner Ray Kelly. Quinn would keep him; de Blasio, Thompson and Liu would not.", source: "wfuv-0425", impact: 2, outside: true },
    { date: "2013-05-22", outlet: "CBS New York", summary: "Weiner entered by video with a large war chest. De Blasio's spokesman said the race was wide open.", source: "cbs-weiner", impact: 4 },
    { date: "2013-07-10", outlet: "DNAinfo", summary: "De Blasio was arrested for disorderly conduct at a protest over the possible sale of a Brooklyn hospital.", source: "dna-arrest", impact: 2 },
    { date: "2013-07-24", outlet: "DNAinfo", summary: "After Weiner's new admissions, de Blasio and Albanese called for him to leave the race; Quinn said that was for Weiner and the voters.", source: "dna-0724", impact: 5 },
    { date: "2013-08-06", outlet: "Bloomberg News", summary: "Citing Detroit's bankruptcy, Mayor Bloomberg warned that the next mayor must hold down pension and health costs and refuse retroactive raises. Liu and de Blasio had not ruled them out.", source: "fa-detroit", impact: 2, outside: true },
    { date: "2013-08-08", outlet: "Al Jazeera", summary: "After the Zimmerman verdict in Florida, Thompson sharpened his attack on stop-and-frisk in a Brooklyn church, a bid for Black voters leaving Weiner.", source: "aj-trayvon", impact: 3, outside: true },
    { date: "2013-08-08", outlet: "VIN News", summary: "De Blasio's first television ad, featuring his teenage son, presented him as the one Democrat who would break from the incumbent and end stop-and-frisk.", source: "vin-ad", impact: 5 },
    { date: "2013-08-12", outlet: "DNAinfo", summary: "A federal judge ruled stop-and-frisk unconstitutional. Quinn, de Blasio and Liu pledged to drop any appeal.", source: "dna-0812", impact: 5 },
    { date: "2013-08-13", outlet: "The Nation", summary: "The Nation cast de Blasio's \"tale of two cities\" campaign as an early test of a national argument among Democrats over inequality.", source: "nation-0813", impact: 2, outside: true, estimate: true },
    { date: "2013-08-26", outlet: "NewsOne", summary: "Thompson released an ad accusing de Blasio's stop-and-frisk ad of misrepresenting his position.", source: "newsone-0826", impact: 3 },
  ],

  finance: [],
  districts: {},

  result: [
    { candidate: "deblasio", votes: 282_344, share: 40.81 },
    { candidate: "thompson", votes: 180_841, share: 26.14 },
    { candidate: "quinn", votes: 108_893, share: 15.74 },
    { candidate: "liu", votes: 47_286, share: 6.84 },
    { candidate: "weiner", votes: 34_192, share: 4.94 },
  ],
  resultSources: ["boe-cert"],
  aftermath: [
    c("De Blasio cleared the 40 percent threshold by less than one point, so there was no runoff. He placed first in all five boroughs.", "boe-cert", "cfb-ao"),
    c("Thompson waited through several days of counting, then conceded and endorsed him on September 16.", "qns-thompson", "wnyc-thompson"),
    c("He went on to win the general election in November.", "wnyc-lucky"),
  ],
  sources,
};
