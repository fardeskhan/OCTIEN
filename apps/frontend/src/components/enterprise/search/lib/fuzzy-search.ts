/**
 * Lightweight fuzzy matcher — the ONE ranking implementation for the whole search platform (command
 * palette, global search, navigation search). No dependencies. Scores prefix > substring >
 * subsequence so the best matches float to the top.
 */

/** Score how well `query` matches `text` (0 = no match, higher = better). */
export function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const t = text.toLowerCase();

  if (t === q) return 1000;
  const idx = t.indexOf(q);
  if (idx === 0) return 200 - t.length * 0.1; // prefix
  if (idx > 0) return 120 - idx * 0.5; // substring (earlier = better)

  // subsequence (all query chars appear in order)
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length ? 50 : 0;
}

/** Best score of `query` across several haystacks (title + keywords + group). */
export function fuzzyBest(query: string, haystacks: (string | undefined)[]): number {
  let best = 0;
  for (const h of haystacks) {
    if (!h) continue;
    const s = fuzzyScore(query, h);
    if (s > best) best = s;
  }
  return best;
}
