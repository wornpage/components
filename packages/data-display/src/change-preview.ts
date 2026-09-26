export interface ChangePreviewField {
	id: string;
	label: string;
	before: string;
	after: string;
}

/** Keep the denominator intact while optionally revealing unchanged rows. */
export function changePreviewModel(fields: readonly ChangePreviewField[], showUnchanged = false) {
	const changedFields = fields.filter((field) => field.before !== field.after);
	return {
		totalCount: fields.length,
		changedCount: changedFields.length,
		unchangedCount: fields.length - changedFields.length,
		visibleFields: showUnchanged || changedFields.length === 0 ? fields : changedFields
	};
}
