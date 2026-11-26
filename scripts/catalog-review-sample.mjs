import assert from 'node:assert/strict';

export async function verifyReviewSample(page, catalogUrl, capture) {
  const url = new URL('#review-components-preview', catalogUrl).href;
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  assert.ok(response?.ok(), `Review sample did not load at ${url}`);

  const sample = page.getByRole('region', { name: 'Review components preview', exact: true });
  const summary = sample.getByRole('article', { name: 'Review the handoff state' });
  const decision = sample.getByRole('region', { name: 'Review decision' });
  const file = sample.getByLabel('Changed file', { exact: true });
  const state = sample.getByLabel('Sample review state');
  const reason = decision.getByLabel('Decision reason');
  const approve = decision.getByRole('button', { name: 'Approve this revision' });
  const returnForChanges = decision.getByRole('button', { name: 'Return for changes' });
  const handoff = sample.getByRole('region', { name: 'Patch for review/handoff.ts' });

  await handoff.waitFor();
  await file.press('ArrowDown');
  const checks = sample.getByRole('region', { name: 'Patch for review/checks.ts' });
  await checks.waitFor();
  assert.match(await checks.innerText(), /Review is explicit/u);
  await file.press('ArrowUp');
  await handoff.waitFor();
  await sample.getByRole('button', { name: 'Show evidence line' }).press('Enter');
  assert.ok(await handoff.evaluate(node => node === document.activeElement));
  assert.match(await handoff.locator('[aria-current="location"]').innerText(), /awaiting-review/u);

  for (const name of ['What changed', 'What was verified', 'What needs a decision']) {
    await summary.getByRole('heading', { name, exact: true }).waitFor();
  }
  await summary.getByText('Revision sample-42', { exact: true }).waitFor();
  await summary.getByText('Decision pending', { exact: true }).waitFor();
  assert.equal(await summary.getByText('Passed', { exact: true }).count(), 2);
  assert.ok(await approve.isDisabled());
  assert.ok(await returnForChanges.isDisabled());
  await capture?.('pending', sample);

  await reason.fill('The handoff waits for a reviewer after the checks finish.');
  await approve.click();
  await decision.getByRole('status').getByText('Approved', { exact: true }).waitFor();
  assert.match(await summary.innerText(), /Decision recorded · Approved/u);
  await capture?.('approved', sample);

  await state.selectOption('awaiting-evidence');
  await summary.getByText('Verification results are unavailable.', { exact: true }).waitFor();
  await reason.fill('Run the checks again so the next reviewer can verify this revision.');
  assert.ok(await approve.isDisabled());
  await returnForChanges.click();
  await decision.getByRole('status').getByText('Returned for changes', { exact: true }).waitFor();
  assert.match(await summary.innerText(), /Decision recorded · Returned for changes/u);
  await capture?.('returned', sample);

  await state.selectOption('stale-revision');
  await decision.getByRole('status').getByText('Decision unavailable', { exact: true }).waitFor();
  assert.equal(await approve.count(), 0);
  assert.equal(await returnForChanges.count(), 0);

  return {
    url, revision: 'sample-42', keyboardFiles: ['review/handoff.ts', 'review/checks.ts'],
    checksPassed: 2, approved: true, returned: true, staleDecisionBlocked: true,
  };
}
