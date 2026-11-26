import { describe, expect, test } from 'bun:test';
import { changedWords, recordedDiff, splitReviewRows } from './recordedDiff';

describe('recordedDiff', () => {
  test('preserves declared file order in the patch and locates the original and new lines', () => {
    const patch = [
      'diff --git a/handoff.ts b/handoff.ts',
      '--- a/handoff.ts',
      '+++ b/handoff.ts',
      '@@ -3,3 +6,3 @@',
      ' before',
      '-old',
      '+new',
      '\\ No newline at end of file',
      ' after',
      'diff --git a/checks.ts b/checks.ts',
      '@@ -0,0 +1 @@',
      '+add a check',
    ].join('\n');
    const { sections, missingPaths } = recordedDiff(patch, ['checks.ts', 'handoff.ts']);
    expect(sections.map(({ path }) => path)).toEqual(['handoff.ts', 'checks.ts']);
    expect(sections[0].added).toBe(1);
    expect(sections[0].removed).toBe(1);
    expect(sections[0].rows.slice(4)).toEqual([
      { text: ' before', kind: 'context', old: 3, new: 6 },
      { text: '-old', kind: 'deletion', old: 4 },
      { text: '+new', kind: 'addition', new: 7 },
      { text: '\\ No newline at end of file', kind: 'meta' },
      { text: ' after', kind: 'context', old: 5, new: 8 },
    ]);
    expect(sections[1].rows.at(-1)).toEqual({ text: '+add a check', kind: 'addition', new: 1 });
    expect(missingPaths).toEqual([]);
  });

  test('recognizes Git-quoted paths and reports unmatched files without inventing names', () => {
    const patch = [
      'diff --git "a/caf\\303\\251.ts" "b/caf\\303\\251.ts"',
      'diff --git a/undeclared.ts b/undeclared.ts',
      '--- a/undeclared.ts',
      '+++ b/undeclared.ts',
    ].join('\n');
    const diff = recordedDiff(patch, ['café.ts', 'missing.ts']);
    expect(diff.sections.map(({ path }) => path)).toEqual(['café.ts', null]);
    expect(diff.missingPaths).toEqual(['missing.ts']);
    expect(recordedDiff('', ['missing.ts'])).toEqual({ sections: [], missingPaths: ['missing.ts'] });
  });

  test('aligns replacements and carries the missing newline marker on its original side', () => {
    const patch = [
      'diff --git a/handoff.ts b/handoff.ts',
      '@@ -2,2 +4 @@',
      '-const state = "complete";',
      '-extra line',
      '\\ No newline at end of file',
      '+const state = "awaiting-review";',
    ].join('\n');
    const { sections } = recordedDiff(patch, ['handoff.ts']);
    const rows = splitReviewRows(sections[0].rows).filter((row) => row.kind === 'lines');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      kind: 'lines',
      before: { number: 2, prefix: '-', text: 'const state = "complete";' },
      after: { number: 4, prefix: '+', text: 'const state = "awaiting-review";' },
    });
    expect(rows[1].before).toEqual({ number: 3, prefix: '-', text: 'extra line', noNewline: true });
    expect(rows[1].after).toBeUndefined();

    const words = changedWords(rows[0].before, rows[0].after);
    expect(words?.before.filter((word) => word.changed).map((word) => word.text).join('')).toContain('complete');
    expect(words?.after.filter((word) => word.changed).map((word) => word.text).join('')).toContain('awaiting-review');
    expect(words?.after.map((word) => word.text).join('')).toBe(rows[0].after?.text);
  });
});
