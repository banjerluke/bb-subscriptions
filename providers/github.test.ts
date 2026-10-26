import { describe, expect, it } from 'vitest';
import { toSnapshot } from './github';
import { ignoredAuthors } from './types';
/** A PR whose comments are `[login, updatedAt]` pairs, oldest first, as `comments(last: 100)` returns them. */
const pr = (comments: [string, string][], totalCount = comments.length) => ({
  title: 'Example', state: 'OPEN', isDraft: false, updatedAt: '2026-01-01', headRefOid: 'abcdef1234567890', reviewDecision: null,
  assignees: { nodes: [] }, labels: { nodes: [] },
  comments: { totalCount, nodes: comments.map(([login, updatedAt]) => ({ updatedAt, author: { login } })) },
  reviews: { totalCount: 0, nodes: [] }, commits: { nodes: [] },
});
describe('github provider', () => {
  it('reports the latest comment of any author when none are ignored', () => {
    const snapshot = toSnapshot('o/r#1', pr([['luke', 't1'], ['linear-code', 't2']]));
    expect(snapshot.fields.comments).toBe('2 (latest by linear-code at t2)');
    expect(snapshot).not.toHaveProperty('ignored');
  });
  it('leaves ignored authors out, so their comments and edits change nothing', () => {
    const ignored = ignoredAuthors({ ignoredCommentAuthors: ' Linear-Code, lukes-clanker,,LINEAR-CODE ' });
    expect(ignored).toEqual(['linear-code', 'lukes-clanker']);
    const before = toSnapshot('o/r#1', pr([['luke', 't1'], ['linear-code', 't2']]), ignored);
    expect(before.fields.comments).toBe('1 (latest by luke at t1)');
    expect(before.ignored).toBe('linear-code, lukes-clanker');
    expect(toSnapshot('o/r#1', pr([['luke', 't1'], ['linear-code', 't3'], ['Lukes-Clanker', 't4']]), ignored)).toEqual(before);
    // A person's comment still shows when a bot comments after it within the same interval.
    expect(toSnapshot('o/r#1', pr([['luke', 't1'], ['linear-code', 't2'], ['tyler', 't5'], ['lukes-clanker', 't6']]), ignored).fields.comments).toBe('2 (latest by tyler at t5)');
    // Past the last 100 comments the ignored ones can't be counted, so no count is given.
    expect(toSnapshot('o/r#1', pr([['luke', 't1'], ['linear-code', 't2']], 150), ignored).fields.comments).toBe('(latest by luke at t1)');
  });
});
