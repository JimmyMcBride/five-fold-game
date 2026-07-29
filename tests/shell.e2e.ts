import { expect, test } from '@playwright/test';

test('public visitor signs in, creates a character, moves, and resumes the run', async ({
	page
}) => {
	await page.goto('/');

	await expect(page.getByRole('heading', { name: 'Enter St. Bozma’s Tomb' })).toBeVisible();
	const discord = page.getByRole('link', { name: 'Continue with Discord' });
	await expect(discord).toHaveAttribute('href', /\/auth\/discord$/);
	await expect(page.getByText('No invitation required.')).toBeVisible();

	await page.goto('/auth/test');
	await expect(page.getByRole('heading', { name: 'Name the next delver' })).toBeVisible();
	for (const className of ['Warrior', 'Scout', 'Priest', 'Magi', 'Versant']) {
		await expect(page.getByText(className, { exact: true })).toBeVisible();
	}

	await page.getByLabel('Character name').fill('Aster Vale');
	await page.getByLabel('Seed optional').fill('playwright-seed');
	await page.getByText('Magi', { exact: true }).click();
	await page.getByRole('button', { name: 'Begin run' }).click();

	await expect(page.getByRole('heading', { name: 'Monastery Grounds' })).toBeVisible();
	await expect(page.getByText('Magi // Level 1')).toBeVisible();
	await page.getByRole('button', { name: /Climb toward the shrine/ }).click();
	await expect(page.getByText('Hostile //', { exact: false })).toBeVisible();
	await expect(page.getByText('2 / 2 AP')).toBeVisible();
	await expect(page.getByRole('button', { name: /Dodge with Reflex/ })).toBeVisible();

	const roomHeading = await page.locator('#room-title').textContent();
	await page.reload();
	await expect(page.locator('#room-title')).toHaveText(roomHeading ?? '');
	await expect(page.getByText('Magi // Level 1')).toBeVisible();

	await page.getByRole('button', { name: /^Inspect/ }).click();
	await expect(page.getByText(/HP, (Near|Far)/)).toBeVisible();
	await page.getByRole('button', { name: /^Black Cloud/ }).click();
	await expect(page.getByText(/Black Cloud roll/)).toBeVisible();
	await expect(page.getByText('1 / 2 AP')).toBeVisible();
	await expect(page.getByText(/Used: Black Cloud/)).toBeVisible();
	const bolt = page.getByRole('button', { name: /^Bolt/ });
	if (await bolt.isVisible()) {
		await bolt.click();
		await expect(page.getByText(/Bolt roll/)).toBeVisible();
	}

	await page.getByRole('button', { name: 'Log out' }).click();
	await expect(page.getByRole('heading', { name: 'Enter St. Bozma’s Tomb' })).toBeVisible();

	await page.goto('/auth/test');
	await expect(page.locator('#room-title')).toHaveText(roomHeading ?? '');
});
