import { expect, test } from '@playwright/test';

test('player enters the first room encounter', async ({ page }) => {
	await page.goto('/');

	await expect(page.getByRole('heading', { name: "St. Bozma's Threshold" })).toBeVisible();
	await page.getByRole('button', { name: 'North' }).click();

	await expect(page.getByRole('heading', { name: 'The Crooked Ossuary' })).toBeVisible();
	await expect(page.getByText('Chain-starved tomb rat', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: /Attack with knife/ })).toBeVisible();
});
