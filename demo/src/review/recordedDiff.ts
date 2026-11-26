/*
 * Section mapping adapted from Projects Git public/review-diff.js at
 * 0a3df64f254b78f7bb708131645bc701af43f5a0. The original MIT notice
 * is in ../../public/review-components-notices.txt.
 */

import { diffWordsWithSpace } from 'diff';

export type DiffSide = 'old' | 'new';

export interface DiffLocation {
  path: string;
  side: DiffSide;
  line: number;
}

type DiffRow =
  | { text: string; kind: 'meta' | 'hunk' }
  | { text: string; kind: 'context'; old: number; new: number }
  | { text: string; kind: 'addition'; new: number }
  | { text: string; kind: 'deletion'; old: number };

export interface DiffCell {
  text: string;
  number: number;
  prefix: ' ' | '+' | '-';
  noNewline?: boolean;
}

type SideBySideRow = { kind: 'lines'; before?: DiffCell; after?: DiffCell };
type SplitRow = SideBySideRow | { kind: 'meta' | 'hunk'; text: string };

export interface DiffWord {
  text: string;
  changed: boolean;
}

interface DiffSection {
  path: string | null;
  rows: DiffRow[];
  added: number;
  removed: number;
}

function quotedPath(path: string) {
  const bytes = new TextEncoder().encode(path);
  return '"' + Array.from(bytes, (byte) => {
    if (byte === 34) return '\\"';
    if (byte === 92) return '\\\\';
    if (byte < 32 || byte >= 127) return '\\' + byte.toString(8).padStart(3, '0');
    return String.fromCharCode(byte);
  }).join('') + '"';
}

export function recordedDiff(patch: string, changedFiles: readonly string[]) {
  const headers = new Map<string, string>();
  const markers = new Map<string, string>();
  for (const path of changedFiles) {
    headers.set('diff --git a/' + path + ' b/' + path, path);
    headers.set('diff --git ' + quotedPath('a/' + path) + ' ' + quotedPath('b/' + path), path);
    for (const [marker, side] of [['--- ', 'a/'], ['+++ ', 'b/']]) {
      markers.set(marker + side + path, path);
      markers.set(marker + quotedPath(side + path), path);
    }
  }

  const lines = patch.split('\n');
  if (lines.at(-1) === '') lines.pop();
  const sections: DiffSection[] = [];
  let section: DiffSection | undefined;
  let inHunk = false;
  let oldLine = 0;
  let newLine = 0;

  for (const text of lines) {
    if (!section || text.startsWith('diff --git ')) {
      section = { path: headers.get(text) ?? null, rows: [], added: 0, removed: 0 };
      sections.push(section);
      inHunk = false;
    }

    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/u.exec(text);
    if (hunk) {
      inHunk = true;
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      section.rows.push({ text, kind: 'hunk' });
    } else if (inHunk && text.startsWith('+')) {
      section.added += 1;
      section.rows.push({ text, kind: 'addition', new: newLine++ });
    } else if (inHunk && text.startsWith('-')) {
      section.removed += 1;
      section.rows.push({ text, kind: 'deletion', old: oldLine++ });
    } else if (inHunk && text.startsWith(' ')) {
      section.rows.push({ text, kind: 'context', old: oldLine++, new: newLine++ });
    } else {
      const markedPath = inHunk ? undefined : markers.get(text.split('\t')[0]);
      if (markedPath) section.path = markedPath;
      section.rows.push({ text, kind: 'meta' });
    }
  }

  const present = new Set(sections.map(({ path }) => path));
  return { sections, missingPaths: changedFiles.filter((path) => !present.has(path)) };
}

// Pair runs of removed and added lines using Workshop's split review model.
export function splitReviewRows(rows: readonly DiffRow[]): SplitRow[] {
  const result: SplitRow[] = [];
  const removed: DiffCell[] = [];
  const added: DiffCell[] = [];
  let preceding: SideBySideRow | undefined;

  function appendChanges() {
    for (let index = 0; index < Math.max(removed.length, added.length); index++) {
      result.push({ kind: 'lines', before: removed[index], after: added[index] });
    }
    removed.length = 0;
    added.length = 0;
  }

  for (const row of rows) {
    if (row.kind === 'deletion') {
      const before: DiffCell = { number: row.old, prefix: '-', text: row.text.slice(1) };
      removed.push(before);
      preceding = { kind: 'lines', before };
    } else if (row.kind === 'addition') {
      const after: DiffCell = { number: row.new, prefix: '+', text: row.text.slice(1) };
      added.push(after);
      preceding = { kind: 'lines', after };
    } else if (row.kind === 'context') {
      appendChanges();
      const text = row.text.slice(1);
      preceding = {
        kind: 'lines',
        before: { number: row.old, prefix: ' ', text },
        after: { number: row.new, prefix: ' ', text },
      };
      result.push(preceding);
    } else if (row.text === '\\ No newline at end of file' && preceding) {
      if (preceding.before) preceding.before.noNewline = true;
      if (preceding.after) preceding.after.noNewline = true;
      preceding = undefined;
    } else {
      appendChanges();
      result.push(row);
      preceding = undefined;
    }
  }
  appendChanges();
  return result;
}

export function changedWords(before?: DiffCell, after?: DiffCell) {
  if (before?.prefix !== '-' || after?.prefix !== '+' ||
    before.text === after.text || Math.max(before.text.length, after.text.length) > 4096) return;
  const pieces = diffWordsWithSpace(before.text, after.text, { maxEditLength: 128 });
  if (!pieces) return;
  return {
    before: pieces.filter((piece) => !piece.added).map((piece): DiffWord => ({ text: piece.value, changed: Boolean(piece.removed) })),
    after: pieces.filter((piece) => !piece.removed).map((piece): DiffWord => ({ text: piece.value, changed: Boolean(piece.added) })),
  };
}
