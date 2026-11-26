<script module lang="ts">
  export interface ReviewCheck {
    label: string;
    status: 'passed' | 'failed' | 'pending';
  }

  export interface ReviewSummary {
    title: string;
    revision: string;
    change: string;
    checks: readonly ReviewCheck[];
    verificationSource?: string;
    decision:
      | { state: 'pending'; reviewer?: string; nextStep?: string }
      | { state: 'recorded'; result: string }
      | { state: 'unavailable' }
      | { state: 'none' };
  }
</script>

<script lang="ts">
  let { review }: { review: ReviewSummary } = $props();
  const id = $props.id();
  const checkLabels = { passed: 'Passed', failed: 'Failed', pending: 'Pending' } as const;
</script>

<article class="summary" aria-labelledby={id + '-title'}>
  <header>
    <h3 id={id + '-title'}>{review.title}</h3>
    <p>Revision <code>{review.revision}</code></p>
  </header>

  <section>
    <h4>What changed</h4>
    <p>{review.change}</p>
  </section>

  <section>
    <h4>What was verified</h4>
    {#if review.verificationSource}<p>{review.verificationSource}</p>{/if}
    {#if review.checks.length}
      <ul>
        {#each review.checks as check}
          <li><strong>{checkLabels[check.status]}</strong> <span>{check.label}</span></li>
        {/each}
      </ul>
    {:else}
      <p>Verification results are unavailable.</p>
    {/if}
  </section>

  <section aria-live="polite">
    <h4>What needs a decision</h4>
    {#if review.decision.state === 'pending'}
      <p><strong>Decision pending</strong>{review.decision.reviewer ? ' · ' + review.decision.reviewer : ''}</p>
      {#if review.decision.nextStep}<p>{review.decision.nextStep}</p>{/if}
    {:else if review.decision.state === 'recorded'}
      <p><strong>Decision recorded</strong> · {review.decision.result}</p>
    {:else if review.decision.state === 'unavailable'}
      <p>Decision unavailable for this revision.</p>
    {:else}
      <p>No decision requested.</p>
    {/if}
  </section>
</article>

<style>
  .summary {
    border: 1px solid var(--worn-border);
    border-radius: 8px;
    background: var(--worn-surface);
    overflow-wrap: anywhere;
  }
  header, section { padding: .9rem 1rem; }
  section { border-block-start: 1px solid var(--worn-border); }
  h3, h4, p, ul { margin: 0; }
  h3 { font-size: 1.05rem; }
  h4 { font-size: .96rem; }
  p, ul { margin-top: .4rem; color: var(--worn-text-muted); }
  ul { display: grid; gap: .45rem; padding-inline-start: 1.15rem; }
  strong { color: var(--worn-text); }
</style>
