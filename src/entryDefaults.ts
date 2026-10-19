/** Apply only absent defaults; importing this module never initializes game dependencies. */
export function defaultEntryUrl(href: string): URL {
  const url = new URL(href);
  if (!url.searchParams.has('art')) {
    url.searchParams.set('art', 'anime');
    if (!url.searchParams.has('scope')) url.searchParams.set('scope', 'full');
    if (!url.searchParams.has('quality')) url.searchParams.set('quality', 'high');
  }
  return url;
}

export function startGameEntry(browser: { location: Pick<Location, 'href'>; history: Pick<History, 'state' | 'replaceState'> }, loadGame: () => Promise<unknown>): Promise<unknown> {
  const entry = defaultEntryUrl(browser.location.href);
  if (entry.href !== browser.location.href) browser.history.replaceState(browser.history.state, '', entry.href);
  return loadGame();
}
