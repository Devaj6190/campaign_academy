# Dossier: New York City Democratic mayoral primary, September 10, 2013 (following the de Blasio campaign)

Research pass of 2026-11-14. Web sources only, each opened in this pass unless marked otherwise. Built to fill the `Case` shape in `web/src/lib/cases/types.ts`.

## How to read the marks

- **VERIFIED**: the page was opened in this pass and the claim is on it.
- **SNIPPET**: seen only in a search-result summary; the page itself was not opened or not readable.
- **UNVERIFIED**: not confirmed at all; listed only so nobody fills the gap from memory.
- Source ids in square brackets, e.g. `[boe-cert]`, refer to the numbered list in section 10.
- Poll figures are quoted from the pollsters' own releases. Quinnipiac surveyed *registered* Democrats until July 15 and *likely* primary voters from July 24; Quinnipiac itself says the two series cannot be compared directly [q-0724].

### Pages that could not be opened (recorded, not worked around)

| Source | Status |
|---|---|
| Michael Barbaro, "Luck and a Shrewd Strategy Fueled de Blasio's Ascension", New York Times, Sept. 2013, https://www.nytimes.com/2013/09/11/nyregion/luck-and-a-shrewd-strategy-fueled-de-blasios-ascension.html | **Not opened** (fetch blocked). Third-party reposts exist but were not read. Everything attributed to this article below is SNIPPET. |
| New School roundtable transcript, http://www.newschool.edu/milano/nycaffairs/documents/RaceforMayor2013.pdf | **Not opened** (HTTP 429 on five attempts). The landing pages were opened [cnyca-round], [cnyca-mayoral]. |
| NYC CFB 2013 post-election report "By the People", https://a860-gpp.nyc.gov/downloads/c247dw84c | **Not opened** (HTTP 403). |
| Washington Post profile of Bill Hyers, Nov. 24, 2013 | **Not opened** (HTTP 403). Read only through a secondary summary [spb-hyers]. |
| New York Magazine, MediaPost, The Real Deal, Brooklyn Eagle, Time, Times Union blog, Columbia Magazine, Quinnipiac Jan. 16 2013 PDF | **Not opened** (blocked, 403/404 or certificate errors). |

---

## 1. The race at the briefing date

**Suggested `briefingDate`: 2013-01-27** (the day de Blasio formally launched). `electionDate`: 2013-09-10. Days between: 226.

- **The launch.** On Sunday January 27, 2013 Public Advocate Bill de Blasio announced his candidacy outside his home in Park Slope, Brooklyn, with his wife and son beside him. He argued that twelve years under Mayor Bloomberg had left the middle class behind, and promised equal treatment of the five boroughs, a larger role for parents in schools, help for small business, more affordable housing and an overhaul of stop-and-frisk. He gave Bloomberg some credit on public health. VERIFIED [dna-launch]
- **The field.** Christine Quinn (City Council Speaker) had not yet formally entered on the launch date; Bill Thompson (former Comptroller, 2009 nominee) was running; John Liu (Comptroller) formally launched on or about March 17; Sal Albanese (former Council member) was in. Anthony Weiner was not a candidate until May 22. VERIFIED [dna-launch] [dna-0315] [dna-0114] [cbs-weiner]
- **Polls at the time (registered Democrats).** Quinnipiac, Jan. 16, 2013: Quinn 35, de Blasio 11, Thompson 10, Liu 9. Quinnipiac, Feb. 27: Quinn 37, de Blasio 14, Thompson 11, Liu 9. VERIFIED from the trend table in [q-0522]. Marist, Feb. 14: Quinn 37, Thompson 13, de Blasio 12, Liu 9, Albanese 2, undecided 26. VERIFIED [m-0214]
- **Money at the time** (filing covering July 12, 2012 to Jan. 11, 2013). Quinn had raised $6.1 million in total with $5.3 million on hand; de Blasio's campaign put its total at more than $5.3 million *including expected matching funds* and said it was close to the primary spending limit; Thompson raised more than $1 million in the period; Liu had just over $2 million on hand. VERIFIED [dna-0114]
- **The incumbent.** Michael Bloomberg was finishing a third term and was not on the ballot. Primary-day exit polling found about two-thirds of Democratic primary voters thought changing the law to allow that third term had been a bad idea, and about seven in ten wanted the next mayor to move in a different direction. VERIFIED [cbs-exit] [ap-exit]. Bloomberg's approval rating at the briefing date: **not retrieved** (the January Quinnipiac PDF returned 404).
- **The rules.**
  - Runoff: if no candidate for citywide office gets at least 40 percent in the primary, the top two meet in a runoff (N.Y. Election Law § 6-162, as described by the CFB). VERIFIED [cfb-ao]. The runoff date would have been October 1, 2013. VERIFIED [pbs-0911]
  - Spending limit for participants in the public financing program, Mayor, 2013: **$6,426,000 for the primary** and the same for the general; out-year (2010 to 2012) limit $303,000, with any excess counted against the first 2013 limit. VERIFIED [cfb-limits]
  - Public matching funds: $6 of public money per $1 from a New York City resident on the first $175 of a contribution (maximum $1,050 per contributor); maximum **$3,534,300 per election** for a mayoral candidate; threshold to qualify $250,000 from 1,000 contributors. Contribution limit $4,950. VERIFIED [cfb-limits]
  - On June 20, 2013 the CFB ruled, on a request from the de Blasio campaign dated May 28, that a mayoral runoff was "reasonably anticipated", which let candidates raise runoff money. VERIFIED [cfb-ao]
- **Issues being raised.** Stop-and-frisk and police oversight, taxes on high earners, Bloomberg's legacy on schools and public health, and paid sick leave. A May 2013 Quinnipiac poll found voters more likely, by 56 to 15, to back a candidate who would raise taxes on the wealthy, and less likely, by 37 to 29, to back one who would continue stop-and-frisk. VERIFIED [q-0522]. De Blasio had campaigned with activists in January 2013 against Quinn's stalling of a paid sick days bill; the Council reached a compromise in March. VERIFIED [wnyc-lucky]

## 2. The five major candidates (standing at the briefing date)

**Bill de Blasio** (followed candidate). New York City Public Advocate, living in Park Slope, Brooklyn; launched January 27, 2013. Third or tied for second in early-2013 polls at 11 to 14 percent of registered Democrats. Had proposed in October 2012 a tax increase on incomes above $500,000 to pay for pre-kindergarten and after-school programs. Standing: "Citywide elected official, low double digits in polls". VERIFIED [dna-launch] [q-0522] [m-0214] [chalk-prek]

**Christine Quinn.** Speaker of the City Council; front-runner in every public poll at the briefing date (35 to 37 percent) and the best funded, with $5.3 million on hand in January 2013. Had not formally declared on January 27. Later coverage reports she faced protests and resentment over her support for allowing Bloomberg a third term. Standing: "Front-runner, Council Speaker". VERIFIED [q-0522] [m-0214] [dna-0114] [dna-launch] [wnyc-lucky]

**William C. (Bill) Thompson Jr.** Former City Comptroller and the Democratic nominee in 2009, when he lost to Bloomberg by fewer than 50,000 votes. Around 10 to 13 percent in early-2013 polls; raised more than $1 million in the second half of 2012. The only Black candidate among the leading contenders. Standing: "2009 nominee, former Comptroller". VERIFIED [wnyc-thompson] [q-0522] [m-0214] [dna-0114] [q-0626]

**John Liu.** City Comptroller; about 9 percent in early-2013 polls; just over $2 million on hand in January 2013; formal launch in mid-March 2013. His campaign's fundraising was under federal scrutiny; his former treasurer and a fundraiser were convicted in May 2013, and on August 5, 2013 the CFB unanimously denied his request for more than $3 million in matching funds. Standing: "City Comptroller, campaign under investigation". VERIFIED [q-0522] [dna-0114] [dna-0315] [wnyc-liu]

**Anthony Weiner.** Former U.S. Representative who resigned from Congress in June 2011 after sending lewd images to several women. **Not a candidate at the briefing date**; entered by video on May 22, 2013 with $4.8 million in his campaign account. Standing at briefing date: "Former congressman, not yet running". VERIFIED [cbs-weiner]

## 3. De Blasio's platform as he ran on it

| # | Plank | Source | Reported to like it | Reported to dislike it |
|---|---|---|---|---|
| 1 | Raise the city income tax rate on incomes above $500,000 (from 3.86% to 4.3% as first proposed, about $532 million a year) to fund full-day pre-K and extended-day programs for middle schoolers. | VERIFIED [chalk-prek] | Stephanie Gendell of the Campaign for Children called it bold and fully funded [chalk-prek]. In May 2013, 56% of voters said they were more likely to back a candidate who would raise taxes on the wealthy [q-0522]. | Mayor Bloomberg said the tax would drive people out of the city [chalk-prek]. |
| 2 | Overhaul stop-and-frisk: no appeal of the federal ruling against it, an NYPD inspector general, and override of the mayor's veto of a ban on biased policing. | VERIFIED [dna-launch] [dna-0812] | 60% of likely Democratic primary voters called the tactic excessive in August 2013 [q-0813]. | 31% of the same voters called it an acceptable way to make the city safer [q-0813]. Bloomberg's defence of the programme: SNIPPET. |
| 3 | A "clean break" from the Bloomberg years, framed as a "tale of two cities" divided by income. | VERIFIED [tpm-brand] [dna-launch] | 65% of likely Democratic primary voters wanted a new direction from Bloomberg (Aug. 28) [q-0828]. Katrina vanden Heuvel in The Nation praised the agenda [nation-0813]. | Bloomberg called the campaign "racist" in a September 2013 interview, as reported by TPM [tpm-brand]. |
| 4 | Keep community hospitals open, in particular Long Island College Hospital in Brooklyn, which SUNY was considering selling. | VERIFIED [dna-arrest] [bkpaper-lich] | 1199 SEIU (which had endorsed him) and the New York State Nurses Association organised the protests [dna-arrest] [npq-lich]. | SUNY, which planned the sale [dna-arrest]. Criticism of his protest as a stunt: SNIPPET only. |
| 5 | Paid sick leave: he pressed Quinn to allow a vote on a paid sick days bill. | VERIFIED [wnyc-lucky] | Activists who held events with him in January 2013 [wnyc-lucky]. | The Council's March 2013 compromise was credited to Quinn rather than to him [wnyc-lucky]. Business opposition: UNVERIFIED. |
| 6 | Affordable housing: create or preserve 200,000 units, about $1 billion of city pension money for building them, and a tighter 80/20 programme. On record by 2013-07-02. | VERIFIED [trd-0702] (read by the research pass; The Real Deal refuses automated re-fetching) | Brad Lander, Council member, praised the vision of more equal development [nextcity-0903] (2013-09-03). | Joe Lhota called mandatory inclusionary zoning unconstitutional, but in the October 2013 general-election debate, after this case ends [trd-1016]: not used. |

Mandatory inclusionary zoning is first on readable record in September 2013 [nextcity-0903], with no unit number, so it is folded into the housing plank's discussion rather than shipped as a plank.

### Dates and spoilers (case file)

Each plank in `mayor2013.ts` has `asOf` (first on record) and, where it was the campaign's answer to a decision, `decision`. Profile and the decision panel only show what was on record by the student's date, and a decision-linked plank only after the student has made that decision (`lib/cases/platform.ts`). Reactions carry their own dates.

### The rivals' platforms (case file)

| Candidate | Plank | On record | Sources |
|---|---|---|---|
| Quinn | 40,000 middle-class apartments over ten years | 2013-02-11 | VERIFIED [dna-quinn-0211] |
| Quinn | Tech agenda: CUNY campus at the Brooklyn Navy Yard, Long Island City tech cluster, citywide broadband by 2018 | 2013-05-29 | VERIFIED [dna-quinn-0529] |
| Quinn | Drop the appeal of the stop-and-frisk ruling | 2013-08-12 | VERIFIED [dna-0812] |
| Thompson | Keep stop-and-frisk but limit it, add 2,000 officers (the source also says he opposed an outside inspector general; the case's decision 6 situation says the opposite, so the clause is left out pending a check) | 2013-07-29 | VERIFIED [jw-thompson-0807] [dna-thompson-0729] |
| Thompson | Driver-friendly transport plan | 2013-08-16 | VERIFIED [sb-thompson-0816] |
| Liu | Abolish stop-and-frisk | 2013-08-07 | VERIFIED [jw-thompson-0807] |
| Liu | Legalise and tax marijuana to cut CUNY tuition | 2013-08-14 | VERIFIED [cbs-liu-0814] [tnr-liu-0814] |
| Weiner | City-run health plan modelled on single payer | 2013-07-03 | VERIFIED [cap-weiner-0703] |

UNVERIFIED and not used: Thompson's 120,000-unit housing plan and his school-closings pause (search snippets only), the PBA's reaction to Thompson (page did not load), Weiner's "Keys to the City" booklet date, and the billdeblasio.com policy book (archive unreachable).

## 4. Decision points

Six decision points follow. For each: `situation` and `constraints` are what the student sees; `did`, `followed` and `saidAfter` are the reveal. Options are written so the one taken is not signalled; the `taken` id is given separately.

### D1. What to run as (launch positioning)

- **Date:** 2013-01-27. **Skill:** reading voter groups. **Days left:** 226.
- **Situation.**
  - Quinn led with 35 to 37 percent; de Blasio, Thompson and Liu were bunched between 9 and 14. VERIFIED [q-0522] [m-0214]
  - Quinn had $5.3 million on hand; de Blasio's campaign counted more than $5.3 million including expected matching funds. VERIFIED [dna-0114]
  - The incumbent was not running after three terms. VERIFIED [cbs-exit]
  - His media consultant said rivals were focusing their messages on the "middle class". VERIFIED [tpm-brand] (the consultant's own later account)
- **Constraints:** cash on hand not reported separately from expected matching funds at this date; spending cap $6,426,000 for the primary [cfb-limits].
- **Options.**
  - a. Run as a sharp break from the incumbent's twelve years, with income inequality as the central theme.
  - b. Run as an experienced manager who would keep what worked and fix what did not, aimed at the middle class.
  - c. Run as the outer-borough candidate, with neighbourhood services and borough equity first.
  - d. Run on a single signature policy (schools and pre-K) and leave the incumbent's record alone.
- **Taken:** a.
- **Did.**
  - Early in 2013 John Del Cecato (AKPD Message and Media) met Bill and Chirlane de Blasio to build a message framework and proposed the "tale of two cities" metaphor; the aim was to make de Blasio the clear progressive and to differ from rivals' middle-class framing. VERIFIED [tpm-brand]
  - The launch speech argued the Bloomberg years had left the middle class behind, while crediting Bloomberg on public health. VERIFIED [dna-launch]. The "tale of two cities" wording at the launch itself: SNIPPET (Columbia Magazine, not opened).
- **Followed.**
  - No movement for six months: de Blasio was at 14 (Feb. 27), 14 (Apr. 10), 11 (Apr. 19), 10 (May 22), 10 (June 26) and 10 (July 15) among registered Democrats. VERIFIED [q-0522] [q-0626] [q-0715]
  - By August 28, 65 percent of likely Democratic primary voters wanted a new direction from Bloomberg, and de Blasio led by wide margins among voters who wanted a candidate with new ideas or one who understood them. VERIFIED [q-0828]
  - On primary day about seven in ten voters wanted a different direction and most of them backed de Blasio. VERIFIED [cbs-exit]
- **Said afterwards.**
  - John Del Cecato (TPM, Nov. 6, 2013): rivals made strategic mistakes, underestimating de Blasio and assuming voters wanted a business-friendly, middle-class focus. VERIFIED [tpm-brand]
  - Anna Sale (WNYC, Nov. 5, 2013): he read fatigue with Bloomberg accurately, but luck and rivals' missteps also shaped the result. VERIFIED [wnyc-lucky]
  - Maurice Carroll (Quinnipiac, Aug. 28, 2013): the old rule that the most liberal candidate wins the Democratic primary appeared to hold, and voters seemed bored with Bloomberg. VERIFIED [q-0828]
  - Ben Smith and colleagues (BuzzFeed, Sept. 11, 2013): the result was a rejection of Bloomberg's legacy. VERIFIED [bf-0911]

### D2. What to do about Weiner

- **Date:** 2013-05-22 to 2013-07-23. **Skill:** delegating to staff. **Days left at start:** 111.
- **Situation.**
  - Weiner entered on May 22 with $4.8 million. That day's Quinnipiac poll: Quinn 25, Weiner 15, de Blasio 10, Thompson 10. VERIFIED [cbs-weiner] [q-0522]
  - Weiner then rose: Marist in June had Weiner 25, Quinn 20, Thompson 13, de Blasio 10; Quinnipiac on July 15 had Weiner 25, Quinn 22, Thompson 11, de Blasio 10, with 47 percent of Democrats not knowing enough about de Blasio to rate him. VERIFIED [m-0725] [q-0715]
  - Weiner's talk of middle-class struggles crowded out de Blasio's message. VERIFIED [wnyc-lucky] (WNYC's characterisation)
  - Thompson gained the teachers' union endorsement in mid-June and rose to 16. VERIFIED [q-0626]
  - De Blasio had raised $240,000 in the March to May period against Thompson's $600,000 and Quinn's $510,000. VERIFIED [dna-0514]
- **Constraints:** cash on hand at this date not found; the campaign had already reached the maximum it could claim in primary matching funds [dna-0514].
- **Options.**
  - a. Go after the new entrant directly and try to disqualify him.
  - b. Leave the new entrant alone and keep the campaign aimed at the incumbent's record and the front-runner.
  - c. Change the message to compete for the same outer-borough, middle-class voters.
  - d. Spend earlier than planned to raise name recognition before the summer.
- **Taken:** b (through July 22).
- **Did.**
  - On the day Weiner entered, de Blasio's spokesman said only that the race was now wide open. VERIFIED [cbs-weiner]
  - According to the New York Times reconstruction, de Blasio wanted to attack Weiner; his political team pushed back, and campaign manager Bill Hyers advised him to stay focused on Bloomberg as the real target. **SNIPPET** (NYT not opened).
  - A Washington Post profile, as summarised by a secondary site, says de Blasio, trailing in the polls, considered speeding up and spending more to raise name recognition, and Hyers recommended staying with the plan. VERIFIED only on the secondary summary [spb-hyers]; original not opened.
  - On July 23, after Weiner admitted to further explicit messages sent after leaving Congress, de Blasio called on him to withdraw ("Enough is enough"). He and Sal Albanese were the only Democratic candidates to do so; Quinn said the decision was for Weiner and the voters. VERIFIED [dna-0723] [dna-0724]
- **Followed.**
  - Quinnipiac likely voters: July 24 (interviews July 18 to 23) Weiner 26, Quinn 22, Thompson 20, de Blasio 15; July 29 Quinn 27, de Blasio 21, Thompson 20, Weiner 16; Aug. 13 de Blasio 30, Quinn 24, Thompson 22, Weiner 10. VERIFIED [q-0724] [q-0813]
  - Marist likely voters, July 25: Quinn 26, de Blasio 17, Weiner 16, Thompson 15. VERIFIED [m-0725]
  - Weiner finished fifth with 4.94 percent. VERIFIED [boe-cert]
- **Said afterwards.**
  - Anna Sale (WNYC): Weiner's collapse was the first of de Blasio's lucky breaks. VERIFIED [wnyc-lucky]
  - Bradley Tusk, Bloomberg's 2009 campaign manager, had predicted before the July revelations that the runoff would be Quinn against Thompson. VERIFIED [wnyc-lucky]
  - Maurice Carroll (Quinnipiac, Aug. 28): de Blasio had been in fourth place five weeks earlier. VERIFIED [q-0828]
  - **Disagreement to show the student:** the campaign's own people credit discipline and the plan [spb-hyers] [tpm-brand]; WNYC credits luck and rivals' errors as well [wnyc-lucky]. The NYT headline names both (title only; article not opened).

### D3. How to split the budget under the cap (television or mail)

- **Date:** July 2013 (the staff meeting is dated only to "July" in the snippet). **Skill:** budgeting. **Days left on July 15:** 57.
- **Situation.**
  - The primary spending limit was $6,426,000 for every participating candidate; maximum public funds $3,534,300. VERIFIED [cfb-limits]
  - De Blasio was at 10 percent and fourth, and nearly half of Democrats could not rate him. VERIFIED [q-0715]
  - Cumulative net contributions reported at the July 15 filing: Quinn $7,637,577, Weiner $5,968,061, de Blasio $4,141,972, Thompson $3,943,808, Liu $3,389,446. VERIFIED [qns-0719], with the caveat in section 6.
  - Outside money was in play for a rival: the teachers' union spent more than $2.5 million supporting Thompson. VERIFIED [wnyc-thompson]
- **Constraints:** spending cap $6,426,000; cash on hand in July not found.
- **Options.**
  - a. A conventional mix: television, direct mail to likely voters, and field.
  - b. Put every available dollar into television and send no mail.
  - c. Lead with targeted mail to the groups most likely to back him and keep a smaller television buy for the last two weeks.
  - d. Start television immediately in July at low weight to lift name recognition, at the cost of a thinner August.
- **Taken:** b.
- **Did.**
  - According to the New York Times reconstruction, Hyers wanted every available dollar on television to reach across the city's separate constituencies; at a staff meeting in July the campaign decided to send no mail at all and move that money to television, and the campaign's own mail director agreed. **SNIPPET** (NYT not opened).
  - A Daily Kos community post of Sept. 17, 2013 states that the campaign sent no mailers before the primary and that this let it spend about $200,000 more than rivals on television under the same cap. VERIFIED that the post says so [dk-mail]; the post cites no source and is not staff-reviewed.
  - **Conflict:** TPM reports that the campaign ran a mailer showing the family in the closing weeks [tpm-brand]. The article is dated the day after the general election and does not say which election's final weeks, so it may refer to the general. Do not present "not a single piece of mail" as settled without the NYT original.
  - The first television ad went up on August 8 and a second on August 19. VERIFIED [vin-ad] [dk-ad2]
- **Followed.** De Blasio went from 15 (July 24) to 30 (Aug. 13) to 36 (Aug. 28) to 43 (Sept. 3) among likely voters. VERIFIED [q-0724] [q-0813] [q-0828] [q-0903]
- **Said afterwards.**
  - Randy Shaw (Daily Kos community post): the savings on mail helped on television, but the field operation was the real key. VERIFIED [dk-mail] (opinion)
  - Maurice Carroll (Quinnipiac, Sept. 3): singled out the television commercial as the image of the campaign. VERIFIED [q-0903]
  - Total television spending by candidate: **not found** in any opened source.

### D4. The hospital protest

- **Date:** 2013-07-10. **Skill:** policy trade-offs. **Days left:** 62.
- **Situation.**
  - SUNY was considering selling Long Island College Hospital in Cobble Hill and had diverted ambulances from it; a judge had ordered the hospital kept running. VERIFIED [dna-arrest] [bkpaper-lich]
  - The protest was organised with 1199 SEIU, which had endorsed de Blasio, and the New York State Nurses Association, which had not yet endorsed anyone. VERIFIED [dna-arrest] [npq-lich]
  - Rivals John Liu and Anthony Weiner also attended. VERIFIED [npq-lich]
  - De Blasio was at 10 percent in the Quinnipiac poll released five days later. VERIFIED [q-0715]
- **Constraints:** he held citywide office as Public Advocate; cash on hand not found.
- **Options.**
  - a. Attend, speak, and leave when police give the order to disperse.
  - b. Take part in the planned civil disobedience and accept arrest.
  - c. Stay away from the street protest and pursue the hospital through the courts and the Public Advocate's office.
  - d. Send a statement of support and keep the day for fundraising and other campaigning.
- **Taken:** b.
- **Did.** De Blasio was one of fifteen people arrested outside the SUNY chancellor's office on West 42nd Street in Manhattan, with Council Member Steve Levin, two nurses' union leaders, a civic association member and nine hospital employees. The charge was disorderly conduct and all were released within hours. He said the hospital would close within weeks unless something changed, and called on Governor Cuomo to act. Liu and Weiner moved back into the crowd and were not arrested. VERIFIED [bkpaper-lich] [dna-arrest] [npq-lich]
- **Followed.**
  - Likely-voter polls: 15 on July 24, 21 on July 29. VERIFIED [q-0724] [q-0813]. The Weiner revelations of July 23 fall in the same window, so no source isolates the effect of the arrest.
  - He appeared in court over the arrest on August 20. SNIPPET.
  - He later obtained a court order keeping the hospital operating. SNIPPET.
- **Said afterwards.**
  - Ruth McCambridge (Nonprofit Quarterly, July 15, 2013): the optics mattered and the event could carry symbolic weight in endorsement decisions. VERIFIED [npq-lich]
  - Critics called the arrest a publicity stunt and de Blasio rejected that. **SNIPPET** (Brooklyn Eagle, July 15, 2013; page returned 403). No named critic was verified.
  - This is the thinnest reveal in the dossier: no opened source gives a named retrospective judgment of the arrest.

### D5. The first television ad: when, and what it leads with

- **Date:** 2013-08-08. **Skill:** delegating to staff. **Days left:** 33.
- **Situation.**
  - Likely-voter polls: Quinnipiac July 29, Quinn 27, de Blasio 21, Thompson 20, Weiner 16; Marist July 25, Quinn 26, de Blasio 17, Weiner 16, Thompson 15. VERIFIED [q-0813] [m-0725]
  - A top-two finish was needed to reach a runoff. VERIFIED [tpm-brand] [cfb-ao]
  - Liu had been denied matching funds three days earlier. VERIFIED [wnyc-liu]
  - De Blasio's first public funds payment was reported as nearly $2.2 million, leaving about $4 million on hand at the August 9 filing. **SNIPPET** (Queens Chronicle, Aug. 15, 2013).
  - A federal ruling on stop-and-frisk was pending; it came on August 12. VERIFIED [dna-0812]
- **Constraints:** cash on hand about $4,000,000 (SNIPPET; mark `estimate`); spending cap $6,426,000.
- **Options.**
  - a. Open with a biographical ad in which the candidate speaks to camera about his record.
  - b. Open with a family member introducing him, naming the tax plan and stop-and-frisk.
  - c. Open with a contrast ad against the front-runner on term limits and the incumbent.
  - d. Hold all television until the last two weeks and concentrate the buy.
- **Taken:** b.
- **Did.**
  - On Thursday August 8 the campaign released its first television ad, a 30-second spot for network and cable channels in which the candidate's 15-year-old son says his father is the only Democrat who will break clearly from the Bloomberg years and will end a stop-and-frisk era that he says unfairly targets people of colour. VERIFIED [vin-ad]. The ad's line on taxing high earners for early-childhood and after-school programmes: SNIPPET.
  - Del Cecato said he had the idea after the son drew press attention at the January launch, and that he persuaded de Blasio to pay for and run the ad; David Axelrod said he saw it before it aired and judged it a winner. VERIFIED [tpm-brand]
  - The New York Times reconstruction is reported to say the ad nearly was not made. SNIPPET.
  - The campaign prepared for criticism by compiling a list of other candidates who had featured their children in ads. VERIFIED [tpm-brand]
- **Followed.**
  - Aug. 12: federal judge Shira Scheindlin ruled the NYPD's stop-and-frisk practices unconstitutional and ordered a monitor. De Blasio blamed Quinn and Bloomberg for the practice and pledged not to appeal. VERIFIED [dna-0812]
  - Quinnipiac, Aug. 13 (interviews Aug. 7 to 12): de Blasio 30, Quinn 24, Thompson 22, Weiner 10. VERIFIED [q-0813]
  - Marist, Aug. 16: de Blasio 24, Quinn 24, Thompson 18, Weiner 11; de Blasio at 20 percent among African American Democrats, up from 10. VERIFIED [m-0816]
  - Quinnipiac, Aug. 28: 36. Sept. 3: 43. VERIFIED [q-0828] [q-0903]
- **Said afterwards.**
  - David Axelrod (TPM): the ad turned the race around. VERIFIED [tpm-brand]
  - Maurice Carroll (Quinnipiac, Sept. 3): credited the commercial with a boost among parents and in the Black community, while allowing it might be the ad, the issues, or both. VERIFIED [q-0903]
  - An unnamed senior Quinn aide (Daily Beast, Sept. 14, 2013): blamed the ad, along with perceived media bias, for Quinn's loss. VERIFIED [db-ad]; anonymous, single outlet.
  - Critics said the family focus was exploitative; Del Cecato said he did not worry about that. Joe Lhota remarked in his concession that his own family had not made a commercial. VERIFIED [tpm-brand]
  - **Date disagreement:** Aug. 8 release [vin-ad]; "mid-August" [wnyc-lucky]; "early August" [tpm-brand]; Aug. 9 (New Statesman, SNIPPET).
  - **Disagreement on cause:** the ad [tpm-brand] [q-0903]; Weiner's collapse and the court ruling's timing [wnyc-lucky]. The Aug. 13 poll that first showed him ahead was in the field from Aug. 7, so most of its interviews came after Weiner's July 23 collapse and only partly after the ad.

### D6. Contesting Thompson's presumed base on stop-and-frisk

- **Date:** 2013-08-19 to 2013-09-10. **Skill:** reading voter groups. **Days left at start:** 22.
- **Situation.**
  - Black likely voters, Aug. 13: Thompson 39, de Blasio 22, Quinn 18. White likely voters: de Blasio 39, Quinn 31, Thompson 12. VERIFIED [q-0813]
  - 60 percent of likely Democratic primary voters called stop-and-frisk excessive; among them de Blasio led with 34 to Thompson's 24. VERIFIED [q-0813]
  - Thompson was betting that being the only Black candidate would carry him into a runoff; he had presented himself as acceptable to the establishment. VERIFIED [wnyc-thompson] (WNYC's characterisation)
  - Thompson had taken a restrained line: he had praised parts of the policy and pledged to keep it as a tool under an inspector general, and after the Aug. 12 ruling he avoided endorsing the Council's police oversight bills. VERIFIED [newsone-0826] [dna-0812]
  - De Blasio led either rival in a runoff by then (54 to 38 over Quinn, 50 to 41 over Thompson). VERIFIED [q-0813]
- **Constraints:** cash on hand about $4,000,000 at Aug. 9 (SNIPPET); cap $6,426,000.
- **Options.**
  - a. Make stop-and-frisk the subject of the second ad and claim the sharpest position in the field.
  - b. Move the second ad to jobs and the cost of living, which voters ranked first.
  - c. Concentrate on taking liberal Manhattan voters from the Council Speaker and leave the former Comptroller's supporters alone, with a runoff in mind.
  - d. Keep airing the first ad at higher weight and avoid direct contrast with any rival.
- **Taken:** a.
- **Did.**
  - On August 19 the campaign released a second television ad on stop-and-frisk; a campaign email signed by Chirlane de Blasio said he was the only candidate who would end the stop-and-frisk era. VERIFIED [dk-ad2] (community post reproducing the campaign email)
  - Thompson answered with his own ad saying de Blasio's ad lied about his position, citing a New York Times fact-check that called it misleading, and pledging to end racial profiling. De Blasio's campaign said it stood by the ad. VERIFIED [newsone-0826]
  - The campaign's stated basis for "only": he alone supported both replacing Police Commissioner Ray Kelly and all of the Council's Community Safety Act. SNIPPET (Times Union blog, not opened).
- **Followed.**
  - Black likely voters: Aug. 28, de Blasio 34, Thompson 25; Sept. 3, de Blasio 47, Thompson 25. VERIFIED [q-0828] [q-0903]. Marist, Sept. 9: de Blasio 39, Thompson 25 among African American likely voters. VERIFIED [m-0909]
  - A New York Times report of about Aug. 27 said de Blasio was drawing Black support away from Thompson by criticising stop-and-frisk. VERIFIED only via Political Wire's summary [pw-0827].
  - Exit poll: a majority of Democratic voters called stop-and-frisk excessive and nearly six in ten of them backed de Blasio. VERIFIED [cbs-exit]
  - WNYC's precinct analysis: Thompson lost 80 percent of majority-Black precincts to de Blasio. VERIFIED [wnyc-thompson]
  - **Disagreement:** BuzzFeed reports de Blasio led Thompson among Black voters in the exit poll [bf-0911]; The Root is reported to say they tied (SNIPPET); an aggregator gives de Blasio 44 percent of Black voters (SNIPPET). No opened source gives the exit-poll crosstab.
- **Said afterwards.**
  - Mark Winston Griffith, Brooklyn Movement Center (WNYC, Sept. 16, 2013): Thompson was seen as part of the Black political elite and was not the kind of candidate voters wanted that year. VERIFIED [wnyc-thompson]
  - New York Times fact-check, as cited in Thompson's ad and by NewsOne: the "only" claim was misleading, since rivals had also pledged reform. VERIFIED via [newsone-0826]; original not opened.
  - Michael Bloomberg, September 2013 interview: called de Blasio's campaign "racist", as reported by TPM. VERIFIED [tpm-brand]
  - Greenberg Quinlan Rosner (firm statement, Sept. 16, 2013): he carried every major racial and demographic group and all five boroughs. VERIFIED [gqr]; the boroughs claim matches [boe-cert].

## 5. Timeline, January to September 10, 2013

| Date | Event | Mark and source |
|---|---|---|
| Oct. 4, 2012 | De Blasio proposes the tax on incomes above $500,000 for pre-K at an Association for a Better New York breakfast. | VERIFIED [chalk-prek] |
| Jan. 14 to 15 | Filings for July 12, 2012 to Jan. 11, 2013. Quinn $5.3M on hand. | VERIFIED [dna-0114] |
| Jan. 16 | Quinnipiac: Quinn 35, de Blasio 11, Thompson 10, Liu 9. | VERIFIED [q-0522] |
| Jan. 27 | De Blasio launches in Park Slope. | VERIFIED [dna-launch] |
| Feb. 14 | Marist: Quinn 37, Thompson 13, de Blasio 12, Liu 9. | VERIFIED [m-0214] |
| Feb. 27 | Quinnipiac: Quinn 37, de Blasio 14, Thompson 11, Liu 9. | VERIFIED [q-0522] |
| March | Council reaches a paid sick leave compromise, credited to Quinn. | VERIFIED [wnyc-lucky] |
| Mar. 15 | Filings: Quinn $5.53M on hand; Thompson $2.8M; de Blasio raised $267,000 and spent $135,000 in two months. | VERIFIED [dna-0315] |
| ~Mar. 17 | Liu's formal launch. | VERIFIED [dna-0315] (date inferred from "two days") |
| Apr. 10 / Apr. 19 | Quinnipiac: Quinn 32, de Blasio 14, Thompson 13 / Quinn 28, Weiner 15, de Blasio 11, Thompson 10. | VERIFIED [q-0522] |
| May (date not confirmed) | 1199 SEIU endorses de Blasio. | Endorsement VERIFIED [dna-arrest]; month SNIPPET |
| May 14 to 15 | Filings for Mar. 12 to May 11: Thompson $600,000, Quinn $510,000, de Blasio $240,000. | VERIFIED [dna-0514] |
| May 22 | Weiner enters. Quinnipiac: Quinn 25, Weiner 15, de Blasio 10, Thompson 10. | VERIFIED [cbs-weiner] [q-0522] |
| June (mid) | United Federation of Teachers endorses Thompson. | VERIFIED [q-0626] [wnyc-thompson] |
| June 20 | CFB rules a runoff "reasonably anticipated". | VERIFIED [cfb-ao] |
| June 26 | Quinnipiac: Quinn 19, Weiner 17, Thompson 16, de Blasio 10. Marist (June): Weiner 25, Quinn 20, Thompson 13, de Blasio 10. | VERIFIED [q-0626] [m-0725] |
| July 10 | De Blasio arrested at the hospital protest. | VERIFIED [dna-arrest] [bkpaper-lich] |
| July 15 | Quinnipiac: Weiner 25, Quinn 22, Thompson 11, de Blasio 10. Filing deadline for May 12 to July 11. | VERIFIED [q-0715] [qns-0719] |
| July (undated) | Staff meeting decides on television over mail. | SNIPPET (NYT) |
| July 23 | Weiner admits further messages; de Blasio calls on him to withdraw. | VERIFIED [dna-0723] |
| July 24 | Quinnipiac (likely voters): Weiner 26, Quinn 22, Thompson 20, de Blasio 15. | VERIFIED [q-0724] |
| July 25 | Marist (likely voters): Quinn 26, de Blasio 17, Weiner 16, Thompson 15. | VERIFIED [m-0725] |
| July 29 | Quinnipiac: Quinn 27, de Blasio 21, Thompson 20, Weiner 16. | VERIFIED [q-0813] |
| Aug. 5 | CFB denies Liu matching funds. | VERIFIED [wnyc-liu] |
| Aug. 8 | De Blasio's first television ad. | VERIFIED [vin-ad] |
| Aug. 12 | Federal ruling against stop-and-frisk. | VERIFIED [dna-0812] |
| Aug. 13 | Quinnipiac: de Blasio 30, Quinn 24, Thompson 22, Weiner 10, Liu 6. | VERIFIED [q-0813] |
| Aug. 16 | Marist: de Blasio 24, Quinn 24, Thompson 18, Weiner 11. | VERIFIED [m-0816] |
| Aug. 19 | Second de Blasio ad, on stop-and-frisk. | VERIFIED [dk-ad2] |
| ~Aug. 25 | Thompson's ad answering it. | VERIFIED [newsone-0826] |
| Aug. 28 | Quinnipiac: de Blasio 36, Quinn 21, Thompson 20, Weiner 8, Liu 6. | VERIFIED [q-0828] |
| Sept. 3 | Quinnipiac: de Blasio 43, Thompson 20, Quinn 18, Weiner 7, Liu 4. | VERIFIED [q-0903] |
| Sept. 9 | Marist: de Blasio 36, Thompson 20, Quinn 20, Weiner 7, Liu 5. | VERIFIED [m-0909] |
| Sept. 10 | Primary. | VERIFIED [boe-cert] |

## 6. Money

**Limits (Mayor, 2013):** primary spending limit $6,426,000; maximum public funds $3,534,300 per election; $6-to-$1 match on the first $175; contribution limit $4,950. VERIFIED [cfb-limits]

**CFB disclosure periods (2013 cycle)**, as listed on the CFB candidate summary page: statement 6, July 12, 2012 to Jan. 11, 2013; 7, Jan. 12 to Mar. 11; 8, Mar. 12 to May 11; 9, May 12 to July 11; 10, July 12 to Aug. 5; 11, Aug. 6 to Aug. 26; 12, Aug. 27 to Sept. 16; 16, Nov. 29, 2013 to Jan. 11, 2014. VERIFIED [cfb-quinn]. Per-statement totals could not be pulled from the CFB site in this pass (the statement filter did not respond to URL parameters), so interim figures below come from press reports of the filings.

### Interim figures from press reports

| Filing (period) | de Blasio | Quinn | Thompson | Liu | Weiner | Source |
|---|---|---|---|---|---|---|
| Jan. 15 (Jul. 12, 2012 to Jan. 11, 2013) | raised $725,000 in period; total over $5.3M incl. expected matching; spent and cash not stated | raised $457,000; total $6.1M; cash $5.3M | raised over $1M | raised $522,000; spent $345,000; cash just over $2M | not a candidate | VERIFIED [dna-0114] |
| Mar. 15 (Jan. 12 to Mar. 11) | raised $267,000; spent $135,000; total $5.9M incl. expected matching | raised $510,000; spent $240,000; cash $5.53M; total $6.7M | raised $340,000; cash $2.8M | raised $105,775; spent about $94,000; cash over $2M | not a candidate | VERIFIED [dna-0315] |
| May 15 (Mar. 12 to May 11) | raised $240,000 | raised $510,000 | raised $600,000; spent about $300,000; cash about $2.3M | raised $104,231 | $4.8M in account at entry on May 22 | VERIFIED [dna-0514] [cbs-weiner] |
| July 15 (through July 11): net contributions | $4,141,972 | $7,637,577 | $3,943,808 | $3,389,446 | $5,968,061 | VERIFIED [qns-0719]; see note |
| Aug. 9 (through Aug. 5), first filing with public funds | public funds nearly $2.2M; cash about $4M | public funds over $3.3M | not found | none (denied Aug. 5) | public funds over $1.4M | SNIPPET (Queens Chronicle, Aug. 15, 2013); Liu VERIFIED [wnyc-liu] |

Notes and disagreements:

- The Queens Courier article [qns-0719] describes the July figures as collected "from May 12 to July 11". Their size (Quinn $7.6M against the $6.1M total she reported in January) shows they are cumulative net contributions, not two-month totals. Treat as cumulative and mark `estimate`.
- DNAinfo's March article gives de Blasio $267,000 and Quinn $510,000 for the Jan. to Mar. period; its May article gives the "previous period" as $229,000 for de Blasio and $487,480 for Quinn, with cash on hand then of $2.6M (de Blasio) and $5.6M (Quinn). Both sets are recorded; the difference is probably campaign-announced versus filed figures, but no source says so. VERIFIED both [dna-0315] [dna-0514]
- Another report is cited in search results as giving de Blasio $4,092,078 raised at the July filing. SNIPPET.
- By May, de Blasio, Quinn and Liu were reported to have reached the maximum they could claim in primary matching funds. VERIFIED [dna-0514]

### Cycle totals from the CFB database (as of statement 16, filed Jan. 15, 2014)

These cover the whole 2013 cycle. For de Blasio that includes the general election, so they are **not** primary-only figures.

| Candidate | Net contributions | Public funds received | Net expenditures | Estimated balance | Source |
|---|---|---|---|---|---|
| de Blasio | $10,565,063 | $3,994,496 ($22,300 shown as returned) | $13,532,242 | $1,011,405 | VERIFIED [cfb-deblasio] |
| Quinn | $7,905,433 | $3,534,300 (the maximum) | $6,874,183 | $1,139,581 | VERIFIED [cfb-quinn] |
| Thompson | $4,713,961 | $1,852,446 | $6,502,457 | ($2,201) | VERIFIED [cfb-thompson] |
| Liu | $3,512,688 | $0 | $3,441,718 | $82,898 | VERIFIED [cfb-liu] |
| Weiner | $5,626,961 | $1,652,074 ($195,639 returned) | $6,724,876 | $660,799 | VERIFIED [cfb-weiner] |

The CFB notes its "estimated balance" is receipts minus disbursements and may not equal cash on hand. Thompson's and Weiner's expenditures above the $6,426,000 limit are cycle totals that include out-year and exempt spending; no opened source explains the difference.

**Mapping to `Filing`:** the type needs `raised`, `spent` and `cash` together. Only Liu (Jan. and Mar.) and Quinn (Mar.) have all three from one source. Everything else needs `estimate: true` or should be held until per-statement CFB data is extracted.

## 7. Press: what outlets were reporting at each decision point

| Date | Outlet | Summary (paraphrase) | URL | Decision |
|---|---|---|---|---|
| 2013-01-14 | DNAinfo | Mayoral hopefuls reported six-month fundraising; Quinn held the largest cash reserve and de Blasio's campaign said it was nearing the primary spending limit once matching funds were counted. | https://www.dnainfo.com/new-york/20130114/new-york-city/candidates-for-mayor-rake-cash-as-campaigns-heat-up | D1 |
| 2013-01-27 | DNAinfo | De Blasio launched outside his Brooklyn home, saying the Bloomberg years had left the middle class behind and taking indirect shots at Quinn and Thompson. | https://www.dnainfo.com/new-york/20130127/park-slope/bill-de-blasio-launches-run-for-mayor | D1 |
| 2013-05-14 | DNAinfo | Thompson reported a jump in fundraising, out-raising Quinn for the period, while de Blasio's take was less than half of Thompson's. | https://www.dnainfo.com/new-york/20130514/new-york-city/mayoral-hopeful-bill-thompson-reports-major-jump-fundraising | D2 |
| 2013-05-22 | CBS New York | Weiner entered by video with a large war chest; Quinn declined to discuss him, Thompson welcomed him, and de Blasio's spokesman said the race was wide open. | https://www.cbsnews.com/newyork/news/former-rep-anthony-weiner-enters-nyc-mayoral-race | D2 |
| 2013-07-10 | DNAinfo | De Blasio was arrested for disorderly conduct at a protest over the possible sale of Long Island College Hospital, organised with a union that had endorsed him. | https://www.dnainfo.com/new-york/20130710/midtown/mayoral-candidate-bill-de-blasio-arrested-during-protest | D4 |
| 2013-07-11 | Brooklyn Paper | Fifteen people including de Blasio and a Council member were arrested outside the SUNY chancellor's office and released within hours. | https://www.brooklynpaper.com/stories/36/28/dtg_licharrests_2013_07_12_bk.html | D4 |
| 2013-07-15 | Nonprofit Quarterly | Three candidates attended the hospital protest but only de Blasio was arrested; the piece noted the political optics and a pending nurses' union endorsement. | https://nonprofitquarterly.org/mayoral-hopeful-arrested-in-hospital-closing-protest/ | D4 |
| 2013-07-19 | Queens Courier (QNS) | Listed net contributions reported by each mayoral candidate at the July 15 filing; Quinn and Weiner were well ahead of de Blasio and Thompson. | https://qns.com/2013/campaign-contributions-filed/ | D3 |
| 2013-07-24 | DNAinfo | After Weiner's new admissions, de Blasio and Albanese called for him to leave the race; Quinn said that was for Weiner and the voters to decide. | https://www.dnainfo.com/new-york/20130724/civic-center/weiners-rivals-weigh-on-latest-sexting-scandal | D2 |
| 2013-08-08 | VIN News | De Blasio's first television ad, featuring his teenage son, presented him as the one Democrat who would break from Bloomberg and end stop-and-frisk. | https://vinnews.com/2013/08/08/new-york-bill-de-blasios-son-15-appears-on-campaign-ad/ | D5 |
| 2013-08-12 | DNAinfo | A federal judge ruled stop-and-frisk unconstitutional; Quinn, de Blasio and Liu pledged to drop any appeal, and Thompson promised to work with the monitor without endorsing the Council's oversight bills. | https://www.dnainfo.com/new-york/20130812/civic-center/quinn-de-blasio-liu-vow-drop-any-appeal-of-stop-and-frisk-decision | D5, D6 |
| 2013-08-26 | NewsOne | Thompson released an ad accusing de Blasio's stop-and-frisk ad of misrepresenting his position; de Blasio's campaign stood by its ad. | https://newsone.com/2698746/bill-thompson-stop-and-frisk-2/ | D6 |

## 8. Result and aftermath

**Certified citywide result** (Board of Elections in the City of New York, Statement and Return Report for Certification, Democratic Mayor, printed Sept. 30, 2013). VERIFIED [boe-cert]. Shares computed here from the certified counts over total votes of 691,801.

| Candidate | Votes | Share |
|---|---|---|
| Bill de Blasio | 282,344 | 40.81% |
| William C. Thompson Jr. | 180,841 | 26.14% |
| Christine C. Quinn | 108,893 | 15.74% |
| John C. Liu | 47,286 | 6.84% |
| Anthony D. Weiner | 34,192 | 4.94% |
| Erick J. Salgado | 15,914 | 2.30% |
| Randy Credico | 11,530 | 1.67% |
| Sal F. Albanese | 5,843 | 0.84% |
| Neil V. Grimaldi | 4,677 | 0.68% |

**Runoff threshold:** 40 percent [cfb-ao]. De Blasio cleared it by 0.81 points, about 5,600 votes (derived).

**The 40.12% question.** The earlier finding is settled: the certified share is **40.81%**. WNYC's Nov. 5, 2013 article gives 40.12% [wnyc-lucky]; election-night and next-day reports gave 40.2% with 97 percent of precincts [pbs-0911] and 40.3% unofficial [qns-thompson]. Those are pre-certification counts made before about 78,000 paper ballots were tallied [qns-thompson].

**By borough** (certified, same source; shares computed):

| Borough | Total | de Blasio | Thompson | Quinn | Liu | Weiner |
|---|---|---|---|---|---|---|
| Manhattan | 198,457 | 81,197 (40.9%) | 42,720 (21.5%) | 52,102 (26.3%) | 10,191 (5.1%) | 6,858 (3.5%) |
| Bronx | 96,779 | 36,896 (38.1%) | 31,617 (32.7%) | 10,392 (10.7%) | 4,753 (4.9%) | 5,726 (5.9%) |
| Brooklyn | 225,828 | 104,703 (46.4%) | 61,471 (27.2%) | 23,007 (10.2%) | 13,927 (6.2%) | 10,950 (4.8%) |
| Queens | 149,304 | 52,190 (35.0%) | 38,162 (25.6%) | 19,847 (13.3%) | 16,977 (11.4%) | 9,438 (6.3%) |
| Staten Island | 21,433 | 7,358 (34.3%) | 6,871 (32.1%) | 3,545 (16.5%) | 1,438 (6.7%) | 1,220 (5.7%) |

De Blasio placed first in all five boroughs; his best was Brooklyn; Quinn finished second only in Manhattan. Reported patterns: Thompson lost 80 percent of majority-Black precincts to de Blasio (WNYC analysis) [wnyc-thompson]; de Blasio led Quinn among gay and lesbian voters in the exit poll [bf-0911].

**Aftermath.** Thompson waited through several days of counting, then conceded and endorsed de Blasio on September 16 at City Hall, with Governor Cuomo present; the CFB had already decided not to release runoff matching funds [qns-thompson] [wnyc-thompson]. No runoff was held. De Blasio won the November 5 general election against Republican Joe Lhota [wnyc-lucky] [tpm-brand]; the general-election margin (73.15% to 24.31%) is from Wikipedia only and should be checked against the Board of Elections before use.

## 9. Campaign staff as documented

| Role | Name | Mark and source |
|---|---|---|
| Campaign manager | Bill Hyers | VERIFIED [gg-walzak] [spb-hyers] |
| Media consultant and ad maker | John Del Cecato, partner at AKPD Message and Media | VERIFIED [tpm-brand] [bf-0911] |
| Communications director | Phil Walzak | VERIFIED [gg-walzak] |
| Consultant | Jonathan Rosen | VERIFIED [gg-walzak] (role not specified further) |
| Pollster | Greenberg Quinlan Rosner (firm) | Firm's own post claims the win but does not describe its work: VERIFIED [gqr]. Anna Greenberg named as the pollster: SNIPPET (NYT). |
| Campaign representatives at the New School roundtable | John Del Cecato, Rebecca Katz, Jessica Singleton | Names VERIFIED [cnyca-mayoral]; Katz's and Singleton's titles not stated there. Katz as a Hilltop Public Solutions partner who shaped communications strategy: SNIPPET. |
| Communications and research aide | Mahen Gunaratna | SNIPPET |
| Mail director | unnamed | SNIPPET (NYT) |
| Field director | **unknown** | no source found |
| Political director | **unknown** | no source found |
| Press secretary or spokesman | **unknown** | CBS quotes "a spokesman" without a name [cbs-weiner] |
| Firm | Hilltop Public Solutions, described as Hyers's firm | SNIPPET (Gotham Gazette, 2016) |

Outside the campaign but relevant: David Axelrod, former AKPD partner, who previewed the first ad [tpm-brand]; 1199 SEIU president George Gresham, who introduced de Blasio on primary night [bf-0911].

## 10. Sources

| # | id | Title | Publisher | Date | URL | Kind |
|---|---|---|---|---|---|---|
| 1 | boe-cert | Statement and Return Report for Certification, Primary Election 2013, Democratic Mayor, Citywide | Board of Elections in the City of New York | 2013-09-30 | https://www.vote.nyc/sites/default/files/downloads/pdf/results/2013/2013SeptemberPrimaryElection/01011000000Citywide%20Democratic%20Mayor%20Citywide%20Recap.pdf (linked from https://www.vote.nyc/page/election-results-summary-2013) | data |
| 2 | cfb-limits | Limits and Thresholds, 2013 | NYC Campaign Finance Board | n.d. | https://www.nyccfb.info/candidate-services/limits-thresholds/2013/ | filing |
| 3 | cfb-ao | Advisory Opinion 2013-2: runoff in the 2013 Democratic mayoral primary reasonably anticipated | NYC Campaign Finance Board | 2013-06-20 | https://www.nyccfb.info/law/advisory-opinions/2013-2-runoff-2013-democratic-mayoral-primary-reasonably-anticipated | filing |
| 4 | cfb-deblasio | Candidate summary, de Blasio, 2013 | NYC Campaign Finance Board | as of 2014-01-15 | https://www.nyccfb.info/VSApps/CandidateSummary.aspx?as_cand_id=326&as_election_cycle=2013&office=Mayor&report=summ | filing |
| 5 | cfb-quinn | Candidate summary, Quinn, 2013 | NYC Campaign Finance Board | as of 2014-01-15 | https://www.nyccfb.info/VSApps/CandidateSummary.aspx?as_cand_id=204&as_election_cycle=2013&office=Mayor&report=summ | filing |
| 6 | cfb-thompson | Candidate summary, Thompson, 2013 | NYC Campaign Finance Board | as of 2014-01-15 | https://www.nyccfb.info/VSApps/CandidateSummary.aspx?as_cand_id=260&as_election_cycle=2013&office=Mayor&report=summ | filing |
| 7 | cfb-liu | Candidate summary, Liu, 2013 | NYC Campaign Finance Board | as of 2014-01-15 | https://www.nyccfb.info/VSApps/CandidateSummary.aspx?as_cand_id=FI&as_election_cycle=2013&office=Mayor&report=summ | filing |
| 8 | cfb-weiner | Candidate summary, Weiner, 2013 | NYC Campaign Finance Board | as of 2014-01-15 | https://www.nyccfb.info/VSApps/CandidateSummary.aspx?as_cand_id=BB&as_election_cycle=2013&office=Mayor&report=summ | filing |
| 9 | q-0522 | Quinn at 25% in New York City Dem primary (includes trend back to Jan. 16) | Quinnipiac University Poll | 2013-05-22 | https://poll.qu.edu/images/polling/nyc/nyc05222013.pdf | data |
| 10 | q-0626 | Quinn, Thompson, Weiner tied in New York City primary | Quinnipiac University Poll | 2013-06-26 | https://poll.qu.edu/images/polling/nyc/nyc06262013.pdf | data |
| 11 | q-0715 | Black voters lift Weiner, Spitzer in NYC Dem primary | Quinnipiac University Poll | 2013-07-15 | https://poll.qu.edu/images/polling/nyc/nyc07152013.pdf | data |
| 12 | q-0724 | Thompson tops Quinn, Weiner in NYC Dem primary runoff | Quinnipiac University Poll | 2013-07-24 | https://poll.qu.edu/images/polling/nyc/nyc07242013.pdf | data |
| 13 | q-0813 | De Blasio leads see-saw New York City mayoral race (includes July 29 trend) | Quinnipiac University Poll | 2013-08-13 | https://poll.qu.edu/images/polling/nyc/nyc08132013.pdf | data |
| 14 | q-0828 | De Blasio close to 40% in New York City mayoral race | Quinnipiac University Poll | 2013-08-28 | https://poll.qu.edu/images/polling/nyc/nyc08282013.pdf | data |
| 15 | q-0903 | De Blasio surges past 40% in New York City mayoral race | Quinnipiac University Poll | 2013-09-03 | https://poll.qu.edu/images/polling/nyc/nyc09032013_efbna.pdf | data |
| 16 | m-0214 | 2/14: NYC Mayoralty: Quinn leads Democratic field | Marist Poll (NY1) | 2013-02-14 | https://maristpoll.marist.edu/polls/214-nyc-mayoralty-quinn-leads-democratic-fieldlhota-ahead-among-gop/ | data |
| 17 | m-0725 | 7/25: Quinn reclaims lead from Weiner in Democratic primary (includes June comparison) | Marist Poll (NBC 4 New York / Wall Street Journal) | 2013-07-25 | https://maristpoll.marist.edu/polls/725-quinn-reclaims-lead-from-weiner-in-democratic-primary-should-weiner-drop-out-dems-divide/ | data |
| 18 | m-0816 | August 16, 2013 release | Marist Poll (NBC 4 New York / Wall Street Journal) | 2013-08-16 | https://maristpoll.marist.edu/?p=26747 | data |
| 19 | m-0909 | September 9, 2013 release | Marist Poll (NBC 4 New York / Wall Street Journal) | 2013-09-09 | https://maristpoll.marist.edu/?p=26820 | data |
| 20 | tpm-brand | Branding Bill De Blasio: The Message Machine That Made NYC's Next Mayor (Hunter Walker) | Talking Points Memo | 2013-11-06 | https://talkingpointsmemo.com/?p=206375 | reporting |
| 21 | wnyc-lucky | De Blasio's Long, and Lucky, Campaign (Anna Sale) | WNYC | 2013-11-05 | https://wnyc.org/story/de-blasio-long-and-lucky-campaign/ | analysis |
| 22 | wnyc-thompson | The End of Bill Thompson's Long Campaign (Anna Sale) | WNYC | 2013-09-16 | https://wnyc.org/story/end-bill-thompsons-long-campaign/ | reporting |
| 23 | wnyc-liu | Liu Denied Public Matching Funds | WNYC | 2013-08-05 | https://wnyc.org/story/310771-liu-denied-public-matching-funds/ | reporting |
| 24 | dna-launch | Bill de Blasio Launches Run for Mayor | DNAinfo | 2013-01-27 | https://www.dnainfo.com/new-york/20130127/park-slope/bill-de-blasio-launches-run-for-mayor | reporting |
| 25 | dna-0114 | Candidates for Mayor Rake in Cash as Campaigns Heat Up | DNAinfo | 2013-01-14 | https://www.dnainfo.com/new-york/20130114/new-york-city/candidates-for-mayor-rake-cash-as-campaigns-heat-up | reporting |
| 26 | dna-0315 | Liu's Fundraising Lags as He's Set to Formally Announce Mayoral Run | DNAinfo | 2013-03-15 | https://www.dnainfo.com/new-york/20130315/new-york-city/lius-fundraising-lags-as-hes-set-formally-annouce-mayoral-run | reporting |
| 27 | dna-0514 | Mayoral Hopeful Bill Thompson Reports Major Jump in Fundraising | DNAinfo | 2013-05-14 | https://www.dnainfo.com/new-york/20130514/new-york-city/mayoral-hopeful-bill-thompson-reports-major-jump-fundraising | reporting |
| 28 | dna-arrest | Mayoral Candidate Bill de Blasio Arrested During Protest | DNAinfo | 2013-07-10 | https://www.dnainfo.com/new-york/20130710/midtown/mayoral-candidate-bill-de-blasio-arrested-during-protest | reporting |
| 29 | dna-0723 | Anthony Weiner Admits Additional Sexts | DNAinfo | 2013-07-23 | https://www.dnainfo.com/new-york/20130723/civic-center/anthony-weiner-admits-additional-sexts | reporting |
| 30 | dna-0724 | Weiner's Rivals Weigh In on Latest Sexting Scandal | DNAinfo | 2013-07-24 | https://www.dnainfo.com/new-york/20130724/civic-center/weiners-rivals-weigh-on-latest-sexting-scandal | reporting |
| 31 | dna-0812 | Quinn, de Blasio, Liu Vow to Drop Any Appeal of Stop-and-Frisk Decision | DNAinfo | 2013-08-12 | https://www.dnainfo.com/new-york/20130812/civic-center/quinn-de-blasio-liu-vow-drop-any-appeal-of-stop-and-frisk-decision | reporting |
| 32 | bkpaper-lich | Report on the July 10 LICH arrests | Brooklyn Paper | 2013-07-11 | https://www.brooklynpaper.com/stories/36/28/dtg_licharrests_2013_07_12_bk.html | reporting |
| 33 | npq-lich | Mayoral Hopeful Arrested in Hospital Closing Protest (Ruth McCambridge) | Nonprofit Quarterly | 2013-07-15 | https://nonprofitquarterly.org/mayoral-hopeful-arrested-in-hospital-closing-protest/ | analysis |
| 34 | cbs-weiner | Former Rep. Anthony Weiner Enters NYC Mayoral Race | CBS New York | 2013-05-22 | https://www.cbsnews.com/newyork/news/former-rep-anthony-weiner-enters-nyc-mayoral-race | reporting |
| 35 | cbs-exit | Exit polls: De Blasio leads in NYC mayoral primary race (Salvanto, Pinto) | CBS News | 2013-09-10 | https://www.cbsnews.com/news/exit-polls-de-blasio-leads-in-nyc-mayoral-primary-race | data |
| 36 | ap-exit | Exit Polls: NYC Democratic primary voters want a new direction (AP, Jennifer Agiesta; as carried by WBAI) | Associated Press / WBAI | 2013-09-10 | https://wbai.org/news/exit-polls-nyc-democratic-primary-voters-want-a-new-direction | data |
| 37 | qns-0719 | Campaign contributions filed | Queens Courier (QNS) | 2013-07-19 | https://qns.com/2013/campaign-contributions-filed/ | reporting |
| 38 | qns-thompson | Thompson ends mayoral bid | Queens Courier (QNS) | 2013-09-16 | https://qns.com/2013/09/thompson-ends-mayoral-bid/ | reporting |
| 39 | pbs-0911 | De Blasio may still face runoff | PBS NewsHour | 2013-09-11 | https://www.pbs.org/newshour/nation/de-blasio-may-still-face-runoff | reporting |
| 40 | vin-ad | Bill de Blasio's Son, 15, Appears on Campaign Ad | VIN News | 2013-08-08 | https://vinnews.com/2013/08/08/new-york-bill-de-blasios-son-15-appears-on-campaign-ad/ | reporting |
| 41 | db-ad | Dante de Blasio's Killer Ad May Have Won NYC Primary for His Dad (David Freedlander) | The Daily Beast | 2013-09-14 | https://www.thedailybeast.com/dante-de-blasios-killer-ad-may-have-won-nyc-primary-for-his-dad/ | reporting |
| 42 | dk-ad2 | NYC Mayor: Bill de Blasio's (D) New Ad Goes After Stop And Frisk (community post reproducing a campaign email) | Daily Kos | 2013-08-19 | https://www.dailykos.com/stories/2013/8/19/1232226/-NYC-Mayor-Bill-de-Blasio-s-D-New-Ad-Goes-After-Stop-And-Frisk | campaign |
| 43 | dk-mail | Does de Blasio Victory Spell End of Political Direct Mail (Randy Shaw, community post) | Daily Kos | 2013-09-17 | https://www.dailykos.com/stories/2013/9/17/1239512/-Does-de-Blasio-Victory-Spell-End-of-Political-Direct-Mail | analysis |
| 44 | newsone-0826 | Bill Thompson Attacks Rival In New Ad | NewsOne | 2013-08-26 | https://newsone.com/2698746/bill-thompson-stop-and-frisk-2/ | reporting |
| 45 | pw-0827 | Battle for Black Voters in New York City (summary of a New York Times report) | Political Wire | 2013-08-27 | https://politicalwire.com/2013/08/27/battle-for-black-voters-in-new-york-city/ | reporting |
| 46 | bf-0911 | BuzzFeed report on the primary result (Ben Smith, Jacob Fischler, Tony Merevick) | BuzzFeed News | 2013-09-11 | https://www.buzzfeednews.com/article/bensmith/de-blasio-bloomberg-new-york | reporting |
| 47 | nation-0813 | A Populist Insurgency in New York City (Katrina vanden Heuvel) | The Nation | 2013-08-13 | https://www.thenation.com/?p=107906 | analysis |
| 48 | chalk-prek | Public advocate tells city's elite he'd raise taxes to pay for pre-K | Chalkbeat New York | 2012-10-04 | https://www.chalkbeat.org/newyork/2012/10/4/21092903/public-advocate-tells-city-s-elite-he-d-raise-taxes-to-pay-for-pre-k | reporting |
| 49 | spb-hyers | Must-read profile of Charlie Crist's new campaign manager (summary of a Washington Post profile of Bill Hyers) | SaintPetersBlog | n.d. (after 2013-11-24) | https://saintpetersblog.com/must-read-profile-of-charlie-crists-new-campaign-manager | reporting |
| 50 | gg-walzak | In Communications Move, de Blasio Chooses Campaign Over City Hall (Ben Max) | Gotham Gazette | 2016-10-24 | https://www.gothamgazette.com/city/6589-in-communications-move-de-blasio-chooses-campaign-over-city-hall | reporting |
| 51 | gqr | Congratulations to Bill de Blasio | Greenberg Quinlan Rosner | 2013-09-16 | https://www.gqrr.com/news/congratulations-to-bill-de-blasio-2 | campaign |
| 52 | cnyca-mayoral | Mayoral Campaign Roundtable (participants; video link http://youtu.be/FQCVAhY1cN0) | Center for New York City Affairs, The New School | 2014-01-21 | https://centernyc.squarespace.com/cnyca/2014/01/21/mayoral-campaign-roundtable | analysis |
| 53 | cnyca-round | The 2013 Campaign Roundtable (event of 2013-12-04; links the transcript PDF) | Center for New York City Affairs, The New School | 2014-01-21 | https://centernyc.squarespace.com/cnyca/2014/01/21/the-2013-campaign-roundtable | analysis |
| 54 | nyt-barbaro | Luck and a Shrewd Strategy Fueled de Blasio's Ascension (Michael Barbaro). **Not opened.** | The New York Times | 2013-09 | https://www.nytimes.com/2013/09/11/nyregion/luck-and-a-shrewd-strategy-fueled-de-blasios-ascension.html | reporting |
| 55 | cnyca-transcript | 2013 Campaign Roundtable transcript. **Not opened.** | Center for New York City Affairs, The New School | 2014 | http://www.newschool.edu/milano/nycaffairs/documents/RaceforMayor2013.pdf | analysis |

## 11. Weakest points

1. **Decisions D2 and D3 rest on an article that was not read.** Who argued for what over Weiner, the July no-mail meeting and the mail director's agreement all come from the New York Times reconstruction, seen only in search summaries. A person with access should read it and either confirm or cut those claims.
2. **"No mail at all" is contested.** TPM mentions a late family mailer [tpm-brand]; it may belong to the general election. The only opened source for the no-mail claim is an unsourced community post [dk-mail].
3. **No cash-on-hand figure for de Blasio at any decision date is verified.** The $4 million at August 9 and the $2.2 million first public payment are SNIPPET. Television spending totals by candidate were not found. Per-statement CFB data exists but was not extractable.
4. **CFB cycle totals for de Blasio include the general election.** Primary-only spending was not isolated.
5. **The July 15 contribution figures are mislabelled in their source** as two-month totals; they are treated here as cumulative on the evidence of their size.
6. **D4 has no named retrospective judgment** and its "stunt" criticism is SNIPPET. Its poll movement cannot be separated from the Weiner collapse two weeks later.
7. **The exit-poll split among Black voters is disputed** (led, tied, or 44 percent) and no crosstab was opened.
8. **The New School roundtable transcript, the best primary source for staff accounts, was not opened** (rate-limited). The video was not transcribed.
9. **Staff list has gaps:** field director, political director and spokesman unknown; the pollster's name and several roles are SNIPPET.
10. **Housing plank is SNIPPET only**; the "tale of two cities" wording at the January 27 launch is SNIPPET (verified as the campaign's theme through TPM, not through a launch-day report).
11. **Bloomberg's approval at the briefing date and the general-election percentages** were not verified from primary sources.
12. **The first ad's date** is given as Aug. 8, early August, Aug. 9 and mid-August by different sources; Aug. 8 has the only contemporaneous opened source.
