export { createDemoBookPack } from './createDemoBookPack';
export { createLanternDemoBookPack } from './createLanternDemoBookPack';

import type { BookPack } from '@soombook/book-schema';

import { createDemoBookPack } from './createDemoBookPack';
import { createLanternDemoBookPack } from './createLanternDemoBookPack';

export const fixtureBookPackFactories: ReadonlyArray<() => BookPack> = [
  createDemoBookPack,
  createLanternDemoBookPack,
];
