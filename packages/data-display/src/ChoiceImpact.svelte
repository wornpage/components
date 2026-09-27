<script lang="ts">
	import { changePreviewModel, type ChangePreviewField } from './change-preview';

	interface Props {
		label: string;
		outcome: string;
		fields: readonly ChangePreviewField[];
		pressed?: boolean;
		showDetails?: boolean;
		onclick: (event: MouseEvent) => void;
		class?: string;
	}

	let { label, outcome, fields, pressed = false, showDetails = true, onclick, class: extraClass = '' }: Props = $props();
	let model = $derived(changePreviewModel(fields));
</script>

<button type="button" class="worn-choice-impact {extraClass}" aria-pressed={pressed} {onclick}>
	<span class="worn-choice-impact-heading"><strong>{label}</strong>{#if pressed || showDetails}<span aria-hidden="true">{pressed ? 'Selected' : 'Choose'}</span>{/if}</span>
	{#if showDetails}
	<span class="worn-choice-impact-outcome"><span>Button:</span><strong>{outcome}</strong></span>
	<span class="worn-choice-impact-count">
		{model.changedCount} of {model.totalCount} {model.totalCount === 1 ? 'field' : 'fields'} change
	</span>
	{/if}
</button>

<style>
	.worn-choice-impact {
		background: var(--worn-surface, #fdfdfb);
		border: 1px solid var(--worn-border, #d0cac1);
		border-radius: var(--worn-radius, 10px);
		box-sizing: border-box;
		color: var(--worn-text, #21322b);
		cursor: pointer;
		display: grid;
		font: inherit;
		gap: 3px;
		inline-size: 100%;
		min-block-size: 44px;
		min-inline-size: 0;
		padding: 8px 10px;
		text-align: start;
		touch-action: manipulation;
	}
	.worn-choice-impact > span { min-inline-size: 0; overflow-wrap: anywhere; }
	.worn-choice-impact-heading { align-items: baseline; display: flex; flex-wrap: wrap; gap: 4px 12px; justify-content: space-between; }
	.worn-choice-impact-heading strong { font-size: .875rem; }
	.worn-choice-impact-heading > span,
	.worn-choice-impact-outcome > span,
	.worn-choice-impact-count { color: var(--worn-text-secondary, #40564a); font-size: .8125rem; line-height: 1.4; }
	.worn-choice-impact-outcome { display: flex; flex-wrap: wrap; gap: 0 4px; }
	.worn-choice-impact-outcome strong { font-size: .875rem; font-weight: 600; }
	.worn-choice-impact[aria-pressed='true'] {
		background: var(--worn-accent-50, #e6f7f5);
		border-color: var(--worn-accent, #0d9488);
	}
	.worn-choice-impact:hover:not([aria-pressed='true']) { border-color: var(--worn-border-strong, #9eafa5); }
	.worn-choice-impact:focus-visible { outline: 3px solid var(--worn-focus, #005fcc); outline-offset: 2px; }
	@media (max-width: 500px) {
		.worn-choice-impact-heading > span,
		.worn-choice-impact-outcome > span { display: none; }
	}
	@media (forced-colors: active) { .worn-choice-impact[aria-pressed='true'] { border-color: Highlight; } }
</style>
