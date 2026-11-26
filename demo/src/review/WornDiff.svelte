<script lang="ts">
  import { Button } from '@wornpage/button';
  import { Select } from '@wornpage/form-fields';
  import { changedWords, recordedDiff, splitReviewRows, type DiffCell, type DiffLocation, type DiffSide, type DiffWord } from './recordedDiff';

  let { patch, changedFiles, evidenceLine }: {
    patch: string;
    changedFiles: readonly string[];
    evidenceLine?: DiffLocation;
  } = $props();

  const id = $props.id();
  const model = $derived(recordedDiff(patch, changedFiles));
  const evidenceFileIndex = $derived(model.sections.findIndex((section) => section.path === evidenceLine?.path));
  let selection = $state<{ patch: string; evidenceLine?: DiffLocation; index: number }>();
  let pane = $state<HTMLDivElement>();

  const fileIndex = $derived(selection?.patch === patch &&
    selection.evidenceLine?.path === evidenceLine?.path &&
    selection.evidenceLine?.side === evidenceLine?.side &&
    selection.evidenceLine?.line === evidenceLine?.line
    ? selection.index
    : Math.max(0, evidenceFileIndex));
  const section = $derived(model.sections[fileIndex]);
  const rows = $derived(section ? splitReviewRows(section.rows) : []);
  const evidenceVisible = $derived.by(() => {
    const location = evidenceLine;
    if (!location || section?.path !== location.path) return false;
    return rows.some((row) => row.kind === 'lines' &&
      (location.side === 'old' ? row.before : row.after)?.number === location.line);
  });
  const options = $derived(model.sections.map((file, index) => ({
    value: String(index),
    label: file.path ?? 'Unmapped section ' + (index + 1),
  })));

  function selectFile(event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    selection = { patch, evidenceLine, index: Number(select.value) };
    if (pane) pane.scrollTop = 0;
  }

  function showEvidenceLine() {
    const line = pane?.querySelector('[aria-current="location"]');
    if (!pane || !line) return;
    pane.scrollTop += line.getBoundingClientRect().top - pane.getBoundingClientRect().top - pane.clientHeight / 3;
    pane.focus({ preventScroll: true });
  }
</script>

{#snippet diffCell(line: DiffCell | undefined, side: DiffSide, words: DiffWord[] | undefined)}
  <div
    class="cell"
    class:added={line?.prefix === '+'}
    class:removed={line?.prefix === '-'}
    aria-current={evidenceVisible && evidenceLine?.side === side && line?.number === evidenceLine.line ? 'location' : undefined}
  >
    {#if line}
      <span class="number" aria-hidden="true">{line.number}</span>
      <span class="visually-hidden">
        {line.prefix === '+' ? 'Added line ' + line.number : line.prefix === '-' ? 'Removed line ' + line.number : (side === 'old' ? 'Before line ' : 'After line ') + line.number}
      </span>
      <code><span aria-hidden="true">{line.prefix}</span>{#if words}{#each words as word}{#if word.changed}<mark>{word.text}</mark>{:else}{word.text}{/if}{/each}{:else}{line.text}{/if}</code>
      {#if line.noNewline}<small>No newline at end of file</small>{/if}
    {/if}
  </div>
{/snippet}

<section class="viewer" aria-labelledby={id + '-title'}>
  <h3 id={id + '-title'}>Recorded diff</h3>
  {#if section}
    <div class="file-controls">
      <div>
        <label for={id + '-file'}>Changed file</label>
        <Select id={id + '-file'} value={String(fileIndex)} {options} onchange={selectFile} />
      </div>
      {#if evidenceVisible}
        <Button onclick={showEvidenceLine}>Show evidence line</Button>
      {/if}
    </div>
    <p class="context" role="status">
      File {fileIndex + 1} of {model.sections.length} · {section.added} added, {section.removed} removed
      {#if evidenceVisible && evidenceLine}
        <span> · Evidence on {evidenceLine.side === 'new' ? 'new' : 'original'} line {evidenceLine.line}</span>
      {:else if evidenceLine && (section.path === evidenceLine.path || evidenceFileIndex < 0)}
        <span> · Evidence line unavailable in the recorded diff</span>
      {/if}
    </p>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard access to the scrolling patch.) -->
    <div class="patch" bind:this={pane} role="region" aria-label={'Patch for ' + options[fileIndex].label} tabindex="0">
      <div class="split-row column-headings"><span>Before</span><span>After</span></div>
      {#each rows as row}
        {#if row.kind === 'lines'}
          {@const words = changedWords(row.before, row.after)}
          <div class="split-row">
            {@render diffCell(row.before, 'old', words?.before)}
            {@render diffCell(row.after, 'new', words?.after)}
          </div>
        {:else}
          <div class="patch-marker" class:hunk={row.kind === 'hunk'}><code>{row.text}</code></div>
        {/if}
      {/each}
    </div>
  {:else}
    <p class="context">No recorded diff is available.</p>
  {/if}
  {#if model.missingPaths.length}
    <div class="missing">
      <p>Changed files without a recorded patch</p>
      <ul>{#each model.missingPaths as path}<li><code>{path}</code></li>{/each}</ul>
    </div>
  {/if}
</section>

<style>
  .viewer { min-width: 0; border: 1px solid var(--worn-border); border-radius: 8px; padding: 1rem; }
  h3 { margin: 0 0 .85rem; font-size: 1.05rem; }
  .file-controls { display: flex; flex-wrap: wrap; align-items: end; gap: .65rem; }
  .file-controls > div { display: grid; gap: .3rem; max-width: 100%; }
  label { font-weight: 650; font-size: .9rem; }
  .context { color: var(--worn-text-muted); font-size: .9rem; }
  .patch { background: var(--worn-surface); max-height: 22rem; overflow: auto; border: 1px solid var(--worn-border); border-radius: 5px; }
  .patch:focus-visible { outline: 2px solid var(--worn-focus); outline-offset: 3px; }
  .split-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .column-headings { background: var(--worn-bg-secondary); border-bottom: 1px solid var(--worn-border); font-size: .85rem; font-weight: 650; }
  .column-headings span { padding: .35rem .48rem; }
  .column-headings span + span, .cell + .cell { border-inline-start: 1px solid var(--worn-border); }
  .cell { display: grid; grid-template-columns: minmax(2.4ch, auto) minmax(0, 1fr); gap: 0 .3rem; padding: .2rem .42rem; align-items: baseline; font-size: .82rem; }
  .cell code, .patch-marker code { white-space: pre-wrap; overflow-wrap: anywhere; }
  .cell small { grid-column: 2; color: var(--worn-text-muted); }
  .number { color: var(--worn-text-muted); font-variant-numeric: tabular-nums; }
  .added { background: color-mix(in srgb, var(--worn-surface) 82%, #498a59); }
  .removed { background: color-mix(in srgb, var(--worn-surface) 82%, #ad5652); }
  mark { color: inherit; background: transparent; font-weight: 700; border-bottom: 2px solid currentColor; }
  .patch-marker { padding: .18rem .48rem; color: var(--worn-text-muted); font-size: .82rem; }
  .hunk { background: var(--worn-bg-secondary); }
  .cell[aria-current] { outline: 2px solid var(--worn-focus); outline-offset: -2px; }
  .missing { font-size: .9rem; overflow-wrap: anywhere; }
  .missing ul { padding-inline-start: 1.4rem; }
  .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  @media (max-width: 480px) {
    .viewer { padding: .75rem; }
  }
</style>
