<script lang="ts">
	import { changePreviewModel, type ChangePreviewField } from './change-preview';

	interface Props {
		title: string;
		fields: readonly ChangePreviewField[];
		currentLabel?: string;
		proposedLabel?: string;
		headingLevel?: 2 | 3;
		class?: string;
	}

	let {
		title,
		fields,
		currentLabel = 'Current',
		proposedLabel = 'Proposed',
		headingLevel = 2,
		class: extraClass = ''
	}: Props = $props();

	const headingId = $props.id();
	let showUnchanged = $state(false);
	let model = $derived(changePreviewModel(fields, showUnchanged));
</script>

<section class="worn-change-preview {extraClass}" aria-labelledby={headingId}>
	<svelte:element this={headingLevel === 2 ? 'h2' : 'h3'} id={headingId} class="worn-change-preview-title">{title}</svelte:element>
	<p class="worn-change-preview-count" aria-live="polite" aria-atomic="true">
		{model.changedCount} of {model.totalCount} {model.totalCount === 1 ? 'field' : 'fields'} {model.changedCount === 1 ? 'changes' : 'change'}.
	</p>
	{#if fields.length === 0}
		<p class="worn-change-preview-empty">No fields to compare.</p>
	{:else}
		{#if model.unchangedCount > 0 && model.changedCount > 0}
			<button type="button" class="worn-change-preview-toggle" aria-pressed={showUnchanged} onclick={() => (showUnchanged = !showUnchanged)}>
				{showUnchanged ? 'Hide unchanged fields' : `Show ${model.unchangedCount} unchanged ${model.unchangedCount === 1 ? 'field' : 'fields'}`}
			</button>
		{/if}
		<ul class="worn-change-preview-list">
			{#each model.visibleFields as field (field.id)}
				<li class="worn-change-preview-field" class:is-changed={field.before !== field.after}>
					<div class="worn-change-preview-field-heading">
						<strong>{field.label}</strong>
						<span>{field.before !== field.after ? 'Changed' : 'Unchanged'}</span>
					</div>
					<div class="worn-change-preview-values">
						<div><span>{currentLabel}</span><p>{field.before || 'Not set'}</p></div>
						<div><span>{proposedLabel}</span><p>{field.after || 'Not set'}</p></div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.worn-change-preview {
		box-sizing: border-box;
		color: var(--worn-text, #21322b);
		max-inline-size: 100%;
		min-inline-size: 0;
	}
	.worn-change-preview-title {
		font-size: 1.125rem;
		line-height: 1.35;
		margin: 0;
		overflow-wrap: anywhere;
	}
	.worn-change-preview-count,
	.worn-change-preview-empty {
		color: var(--worn-text-secondary, #40564a);
		font-size: .875rem;
		line-height: 1.5;
		margin: 6px 0 0;
	}
	.worn-change-preview-toggle {
		background: var(--worn-surface, #fdfbf7);
		border: 1px solid var(--worn-border, #9eafa5);
		border-radius: var(--worn-radius-sm, 6px);
		color: var(--worn-text, #21322b);
		cursor: pointer;
		font: inherit;
		font-size: .875rem;
		margin-block: 12px 0;
		min-block-size: 44px;
		padding: 8px 12px;
		text-align: start;
	}
	.worn-change-preview-toggle:focus-visible {
		outline: 2px solid var(--worn-focus, #005fcc);
		outline-offset: 2px;
	}
	.worn-change-preview-list {
		display: grid;
		gap: 8px;
		list-style: none;
		margin: 12px 0 0;
		padding: 0;
	}
	.worn-change-preview-field {
		background: var(--worn-surface, #fdfbf7);
		border: 1px solid var(--worn-border, #9eafa5);
		border-radius: var(--worn-radius-sm, 6px);
		min-inline-size: 0;
		padding: 12px;
	}
	.worn-change-preview-field.is-changed { border-inline-start: 3px solid var(--worn-accent, #0f766e); }
	.worn-change-preview-field-heading {
		align-items: baseline;
		display: flex;
		flex-wrap: wrap;
		gap: 4px 12px;
		justify-content: space-between;
	}
	.worn-change-preview-field-heading strong { font-size: .9375rem; overflow-wrap: anywhere; }
	.worn-change-preview-field-heading span { color: var(--worn-text-secondary, #40564a); font-size: .8125rem; }
	.worn-change-preview-values {
		display: grid;
		gap: 8px;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		margin-block-start: 8px;
	}
	.worn-change-preview-values > div { min-inline-size: 0; }
	.worn-change-preview-values > div + div { border-inline-start: 1px solid var(--worn-border, #9eafa5); padding-inline-start: 8px; }
	.worn-change-preview-values span { color: var(--worn-text-secondary, #40564a); font-size: .8125rem; }
	.worn-change-preview-values p {
		font-size: .9375rem;
		line-height: 1.5;
		margin: 2px 0 0;
		overflow-wrap: anywhere;
		white-space: pre-wrap;
	}
	@media (max-width: 420px) {
		.worn-change-preview-values { grid-template-columns: minmax(0, 1fr); }
		.worn-change-preview-values > div + div { border-block-start: 1px solid var(--worn-border, #9eafa5); border-inline-start: 0; padding-block-start: 8px; padding-inline-start: 0; }
	}
	@media (forced-colors: active) {
		.worn-change-preview-field.is-changed { border-inline-start-color: Highlight; }
	}
</style>
