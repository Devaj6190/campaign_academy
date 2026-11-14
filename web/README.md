# Ballot to Bill: web app

The UI for the campaign sim described in the repo's root `README.md`.

```bash
npm install
npm run dev
```

- `src/lib/store.ts` holds the one shared world state every screen reads and writes.
- `src/lib/data.ts` is the seed content for the demo candidate (fiction).
- `src/lib/nyc.json` is real NYC Open Data (district boundaries, names, 311 counts). Refresh it with `node scripts/build-data.mjs`.
- Staff replies and manifesto suggestions are placeholders. Search the code for `agent:` and `model:` to find where real calls go.
