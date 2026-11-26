<script module lang="ts">
  export type ReviewDecision = 'approved' | 'returned';

  export interface ReviewDecisionRequest {
    revision: string;
    decision: ReviewDecision;
    reason: string;
  }

  export type ReviewDecisionState =
    | { kind: 'ready' }
    | { kind: 'approval-blocked' | 'unavailable'; reason: string }
    | { kind: 'recorded'; decision: ReviewDecision; reason: string | null };

  export const reviewDecisionLabels: Record<ReviewDecision, string> = {
    approved: 'Approved',
    returned: 'Returned for changes',
  };
</script>

<script lang="ts">
  import { tick, type Snippet } from 'svelte';
  import { Button } from '@wornpage/button';
  import { Textarea } from '@wornpage/form-fields';

  let {
    revision, state: decisionState, ondecision, busy = false, disabled = false,
    approveLabel = 'Approve this revision', reasonRequiredFor = 'all', reasonLimit = 500, additionalActions,
  }: {
    revision: string;
    state: ReviewDecisionState;
    ondecision: (request: ReviewDecisionRequest) => void | Promise<void>;
    busy?: boolean;
    disabled?: boolean;
    approveLabel?: string;
    reasonRequiredFor?: 'all' | 'return';
    reasonLimit?: number;
    additionalActions?: Snippet<[disabled: boolean]>;
  } = $props();

  const id = $props.id();
  const pendingLabels = {
    ready: 'Decision pending',
    'approval-blocked': 'Approval blocked',
    unavailable: 'Decision unavailable',
  };

  let draft = $state<{ revision: string; value: string }>();
  let failure = $state<{ revision: string; message: string }>();
  let saving = $state(false);
  let status = $state<HTMLParagraphElement>();
  const returnOnly = $derived(reasonRequiredFor === 'return');
  const isReturning = $derived(returnOnly && draft?.revision === revision);
  const reason = $derived(draft?.revision === revision ? draft.value : '');
  const canDecide = $derived(decisionState.kind === 'ready' || decisionState.kind === 'approval-blocked');
  const canAct = $derived(canDecide && !saving && !busy && !disabled);
  const hasReason = $derived(Boolean(reason.trim()) && reason.length <= reasonLimit);
  const canApprove = $derived(canAct && !isReturning && decisionState.kind === 'ready' && (returnOnly || hasReason));
  const canReturn = $derived(canAct && hasReason);
  const statusLabel = $derived(decisionState.kind === 'recorded'
    ? reviewDecisionLabels[decisionState.decision]
    : pendingLabels[decisionState.kind]);

  export function focusStatus() {
    status?.focus();
  }

  function writeReason(event: Event) {
    draft = { revision, value: (event.currentTarget as HTMLTextAreaElement).value };
  }

  async function beginReturn() {
    if (!returnOnly) return decide('returned');
    if (!canAct) return;
    draft = { revision, value: '' };
    await tick();
    document.getElementById(id + '-reason')?.focus();
  }

  async function cancelReturn() {
    draft = undefined;
    await tick();
    const button = document.getElementById(id + '-return');
    if (button instanceof HTMLButtonElement && !button.disabled) button.focus();
    else focusStatus();
  }

  async function decide(decision: ReviewDecision) {
    if (decision === 'approved' ? !canApprove : !canReturn) return;

    const request = { revision, decision, reason: returnOnly && decision === 'approved' ? '' : reason.trim() };
    const submittedStatus = status;
    saving = true;
    failure = undefined;
    try {
      await ondecision(request);
    } catch (error) {
      failure = {
        revision: request.revision,
        message: error instanceof Error ? error.message : 'Could not record the decision.',
      };
    } finally {
      saving = false;
    }

    await tick();
    if (submittedStatus?.isConnected && revision === request.revision && decisionState.kind === 'recorded') {
      draft = undefined;
      submittedStatus.focus();
    }
  }
</script>

<section class="panel" aria-labelledby={id + '-title'}>
  <header>
    <h3 id={id + '-title'}>Review decision</h3>
    <p class="revision">Revision <code>{revision}</code></p>
  </header>

  <div class="decision-status">
    <p role="status" tabindex="-1" bind:this={status}>
      <strong>{saving ? 'Recording decision' : statusLabel}</strong>
    </p>
    {#if decisionState.kind !== 'ready' && decisionState.reason}
      <p class:recorded-reason={decisionState.kind === 'recorded'}>{decisionState.reason}</p>
    {/if}
  </div>

  {#if canDecide}
    {#if !returnOnly || isReturning}
      <div class="reason">
        <label for={id + '-reason'}>{returnOnly ? 'What needs to change?' : 'Decision reason'}</label>
        <Textarea
          id={id + '-reason'}
          aria-describedby={id + '-reason-help'}
          value={reason}
          oninput={writeReason}
          maxlength={reasonLimit}
          rows={2}
          required
          spellcheck
          disabled={saving || busy}
        />
        <p id={id + '-reason-help'}>Required. Up to {reasonLimit} characters.</p>
      </div>
    {/if}
    <div class="actions">
      {#if isReturning}
        <Button type="button" variant="primary" disabled={!canReturn} onclick={() => decide('returned')}>Send back</Button>
        <Button type="button" disabled={saving || busy} onclick={cancelReturn}>Cancel</Button>
      {:else}
        <Button type="button" variant="primary" disabled={!canApprove} onclick={() => decide('approved')}>
          {approveLabel}
        </Button>
        <Button type="button" id={id + '-return'} variant={decisionState.kind === 'approval-blocked' ? 'primary' : undefined}
          disabled={returnOnly ? !canAct : !canReturn} onclick={beginReturn}>
          Return for changes
        </Button>
        {@render additionalActions?.(!canAct)}
      {/if}
    </div>
  {/if}
  {#if failure?.revision === revision}<p role="alert">{failure.message}</p>{/if}
</section>

<style>
  .panel {
    display: grid;
    gap: .85rem;
    min-width: 0;
    padding: .9rem 1rem;
    border: 1px solid var(--worn-border);
    border-radius: 8px;
    background: var(--worn-surface);
    overflow-wrap: anywhere;
  }
  h3, p { margin: 0; }
  h3 { font-size: 1.05rem; }
  .revision, .decision-status p + p, .reason p { color: var(--worn-text-muted); }
  .revision, .decision-status p + p { margin-top: .3rem; }
  .decision-status { padding-block-start: .7rem; border-block-start: 1px solid var(--worn-border); }
  .recorded-reason { white-space: pre-wrap; }
  [role="status"]:focus-visible { outline: 2px solid var(--worn-focus); outline-offset: 3px; }
  .reason { display: grid; gap: .3rem; }
  .reason label { font-weight: 650; }
  .reason p { font-size: .875rem; }
  .actions { display: flex; flex-wrap: wrap; gap: .5rem; }
</style>
