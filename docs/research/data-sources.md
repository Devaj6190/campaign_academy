# Data sources for real cases

Research pass of 14 Nov 2026 by a research agent, summarised. "Opened" means the file or page was fetched and inspected; anything else is marked.

## Election results (NYC Board of Elections, vote.nyc)

Index: `https://vote.nyc/page/election-results-summary-YYYY` (2005 to 2025).

| Years | Published as |
|---|---|
| 1999 to 2004 | One PDF per election, by borough and Assembly District |
| 2005 to 2013 | PDF "recap" per contest per borough, totals per **Assembly District**. No CSV |
| 2014 to 2025 | `EDLevel.csv` and `Recap.csv` per contest (opened: 2018 NY-14) |
| Ranked-choice primaries (2021, 2023, 2025) | Round-by-round PDFs only. Election-district numbers come from the cast vote record zips (90 to 109 MB, one spreadsheet per borough) |

- **ED-level CSV format:** no header row. Each line repeats 11 column names then 11 values: AD, ED, County, EDAD Status, Event, Party, Office, District Key, VoteFor, Unit Name, Tally. `Unit Name` is a candidate or a counter (Public Counter, Absentee / Military, Affidavit and so on).
- **2013 mayoral primary:** no machine-readable election-district file was found anywhere public. The recap PDFs extract as text but columns shift, so parsed totals must be checked against the citywide figures.
- **Third parties:** OpenElections has NYC precinct CSVs for some years (not 2013, not the 2021 primary). THE CITY published per-ED 2021 first-round counts as GeoJSON with no licence. Neither replaces the official files.

## Putting results on the map

- **Election-district shapes by year:** `https://s-media.nyc.gov/agencies/dcp/assets/files/zip/data-tools/bytes/election-districts/nyed_{version}.zip`. Versions respond from `09a` to `26d` (opened: `13c`, 5,227 districts, State Plane feet, needs reprojection). Nothing before 2009.
- **Ready-made crosswalk:** City Planning's atomic polygons carry Assembly District, election district and community district together. Archive `nyap_{version}.zip` exists for `15a` to `19d` and `22c` to `26d` only, so **not for 2013 or 2021 vintages**.
- **Method:** assign each election district to the community district holding most of its area, after dropping park codes. About 10% of election districts straddle two community districts. Always check that district sums equal the official recap.
- **For 2013:** the honest options are (a) draw the result on Assembly District shapes of that year as their own layer, which is exact, or (b) apportion Assembly District totals onto the 59 community districts, which is approximate and must be labelled.

## Campaign finance

- **City races (Campaign Finance Board), on NYC Open Data, no key needed:** expenditures `qxzj-vkn2`, contributions `rjkp-yttg`, public funds payments `u69g-mvrb`, cycles 2001 to 2025. Example: `https://data.cityofnewyork.us/resource/qxzj-vkn2.json?election=2013&officecd=1&candid=326`.
- **Expenditure fields (opened):** date, payee, amount, purpose code (TVADS, RADIO, CMAIL, LITER, POLLS, CONSL, WAGES, PETIT, FUNDR, RENTO and more), free-text explanation.
- **Contribution fields:** date, amount, matchable amount, borough, ZIP, occupation, employer.
- **Quality:** some dates are junk and a cycle includes transactions from years earlier. Filter by a date window.
- **Federal races (FEC):** `api.open.fec.gov` schedules A and B per committee. Needs a free key; contributions under $200 are not itemised.

## Demographics of the period

- **Census API now needs a key** for data calls.
- ACS 5-year by PUMA approximates community districts: 55 PUMAs for 59 districts, so four pairs share values. Use detail tables (B25003 tenure, B01002 age, B19013 income, B05002 foreign-born, B03002 race and origin, B08301 commute); profile-table codes change meaning between years.
- Keyless alternative for one period: Open Data `8fje-7v4x` (ACS 2012 to 2016 by PUMA, Excel).

## What cannot be had

- 2013 mayoral primary below Assembly District level, short of a records request.
- Election-district shapes before 2009.
- Turnout as a rate for most years: files give ballots cast, not eligible party members.
- How any group voted. Results describe places; the census describes residents, not voters.
- Where campaign money was aimed. Filings give the payee's address, not the target.

## Terms

Board of Elections, City Planning, Campaign Finance Board, FEC and Census data are public records or public domain; attribute and state that results are certified. Do not ship THE CITY's file (no licence) or the Baruch geodatabase (no-derivatives licence).
