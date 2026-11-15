// True while a saved campaign, the demo start or a reset is being put in place (lib/save.ts). The watchers that announce
// new work and have the staff speak up stay quiet then: loading a campaign is not news. Its own module, so the
// watchers can read it without importing the save code.
let on = false;

export const isLoading = () => on;

/** Run `fn` with the watchers quiet. */
export function quietly<T>(fn: () => T): T {
  on = true;
  try {
    return fn();
  } finally {
    on = false;
  }
}
