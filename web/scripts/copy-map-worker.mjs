// MapLibre runs its tile work in a web worker that the bundler does not serve, so it is copied into public/
// on every install (and loaded from there by MapCanvas via setWorkerUrl). Kept out of git: see .gitignore.
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync(new URL('../public/maplibre/', import.meta.url), { recursive: true });
copyFileSync(new URL('../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url), new URL('../public/maplibre/maplibre-gl-worker.mjs', import.meta.url));
