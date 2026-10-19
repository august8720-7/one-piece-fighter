import { startGameEntry } from './entryDefaults';

// Static dependencies of main.ts must see the final URL on their very first evaluation.
void startGameEntry(window, () => import('./main'));
