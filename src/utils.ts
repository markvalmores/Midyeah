/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Returns a random anime-style avatar URL using DiceBear API.
 * Uses 'adventurer' style which has a clean anime/manga aesthetic.
 * @param seed - Optional seed for deterministic avatar generation (e.g. username)
 */
export function getRandomAnimeAvatar(seed?: string): string {
  const s = seed || Math.random().toString(36).substring(7);
  // We use the 'adventurer' style as it looks most like modern anime characters.
  // Other options: 'lorelei', 'notionists', 'avataaars'
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(s)}`;
}
