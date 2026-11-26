<script lang="ts">
  import { Select } from '@wornpage/form-fields';
  import { Button } from '@wornpage/button';
  import WornDiff from './WornDiff.svelte';
  import WornReviewDecisionPanel, {
    reviewDecisionLabels,
    type ReviewDecisionRequest,
    type ReviewDecisionState,
  } from './WornReviewDecisionPanel.svelte';
  import WornReviewSummary, { type ReviewSummary } from './WornReviewSummary.svelte';
  import type { DiffLocation } from './recordedDiff';

  const sampleId = $props.id();
  const patch = [
    'diff --git a/review/handoff.ts b/review/handoff.ts',
    '--- a/review/handoff.ts',
    '+++ b/review/handoff.ts',
    '@@ -10,5 +10,5 @@',
    ' export function handoff() {',
    '   return {',
    "-    state: 'complete',",
    "+    state: 'awaiting-review',",
    '   };',
    ' }',
    'diff --git a/review/checks.ts b/review/checks.ts',
    '--- a/review/checks.ts',
    '+++ b/review/checks.ts',
    '@@ -1,3 +1,4 @@',
    ' export const checks = [',
    "+  'Review is explicit',",
    "   'Revision is retained',",
    ' ];',
  ].join('\n');

  const changedFiles = ['review/handoff.ts', 'review/checks.ts'];
  const evidenceLine: DiffLocation = { path: 'review/handoff.ts', side: 'new', line: 12 };
  const sample = {
    title: 'Review the handoff state',
    revision: 'sample-42',
    change: 'A build now waits for a review decision after its checks finish.',
  };
  const verified = {
    verificationSource: 'Checks from the sample run for this revision.',
    checks: [
      { label: 'Review is explicit', status: 'passed' },
      { label: 'Revision is retained', status: 'passed' },
    ],
  } satisfies Pick<ReviewSummary, 'checks' | 'verificationSource'>;
  const samples = {
    'awaiting-decision': {
      verified: true,
      decision: { kind: 'ready' },
    },
    'awaiting-evidence': {
      verified: false,
      decision: { kind: 'approval-blocked', reason: 'Approval requires verification for this revision.' },
    },
    'stale-revision': {
      verified: true,
      decision: { kind: 'unavailable', reason: 'A newer revision is available. Review its diff and checks before deciding.' },
    },
    'decision-recorded': {
      verified: true,
      decision: { kind: 'recorded', decision: 'approved', reason: 'The patch keeps the handoff pending until someone reviews it.' },
    },
  } satisfies Record<string, { verified: boolean; decision: ReviewDecisionState }>;
  const options = [
    { value: 'awaiting-decision', label: 'Checks passed, decision pending' },
    { value: 'awaiting-evidence', label: 'Evidence unavailable, decision pending' },
    { value: 'stale-revision', label: 'Newer revision available' },
    { value: 'decision-recorded', label: 'Decision recorded' },
  ];
  let example = $state<keyof typeof samples>('awaiting-decision');
  let recorded = $state<Extract<ReviewDecisionState, { kind: 'recorded' }>>();
  let decisionSession = $state(0);
  const currentSample = $derived(samples[example]);
  const decision = $derived(recorded ?? currentSample.decision);
  const review = $derived.by<ReviewSummary>(() => {
    let summaryDecision: ReviewSummary['decision'];
    if (decision.kind === 'recorded') {
      summaryDecision = { state: 'recorded', result: reviewDecisionLabels[decision.decision] };
    } else if (decision.kind === 'unavailable') {
      summaryDecision = { state: 'unavailable' };
    } else {
      summaryDecision = {
        state: 'pending',
        reviewer: 'Casey',
        nextStep: currentSample.verified ? 'Inspect the marked line in the diff.' : 'Wait for verification results.',
      };
    }
    return {
      ...sample,
      ...(currentSample.verified ? verified : { checks: [] }),
      decision: summaryDecision,
    };
  });

  function resetSample() {
    recorded = undefined;
    decisionSession++;
  }

  function recordDecision(request: ReviewDecisionRequest) {
    const allowed = decision.kind === 'ready' ||
      (decision.kind === 'approval-blocked' && request.decision === 'returned');
    if (request.revision !== sample.revision || !allowed) {
      throw new Error('This revision is no longer available for that decision.');
    }
    recorded = { kind: 'recorded', decision: request.decision, reason: request.reason };
  }
</script>

<div class="sample-controls">
  <div class="sample">
    <label for={sampleId}>Sample review state</label>
    <Select id={sampleId} {options} bind:value={example} onchange={resetSample} />
  </div>
  <Button type="button" onclick={resetSample}>Reset sample</Button>
</div>
<div class="review-layout">
  <WornDiff {patch} {changedFiles} {evidenceLine} />
  <div class="review-sidebar">
    <WornReviewSummary {review} />
    {#key decisionSession}
      <WornReviewDecisionPanel revision={sample.revision} state={decision} ondecision={recordDecision} />
    {/key}
  </div>
</div>

<style>
  .sample-controls { display: flex; flex-wrap: wrap; align-items: end; gap: .5rem 1rem; margin-bottom: 1rem; }
  .sample { display: grid; gap: .35rem; min-width: 0; max-width: 100%; }
  label { font-weight: 650; font-size: .9rem; }
  .review-layout { display: grid; grid-template-columns: minmax(0, 1.18fr) minmax(0, 1fr); align-items: start; gap: .85rem; }
  .review-sidebar { display: grid; gap: .85rem; min-width: 0; }
  @media (max-width: 1080px) {
    .review-layout { grid-template-columns: minmax(0, 1fr); }
  }
</style>
