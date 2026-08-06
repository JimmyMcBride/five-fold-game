import { expect, test } from '@playwright/test';
import type { LegalCommand } from '../src/lib/game/commands';
import { getLegalCommands, resolveCommand } from '../src/lib/game/engine';
import type { GameEvent } from '../src/lib/game/events';
import { createRng } from '../src/lib/game/rng';
import { CONTENT_VERSION, createInitialState } from '../src/lib/game/state';
import type { RunProjection } from '../src/lib/game/projection';

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
	await expect(page.locator('.class-fieldset legend')).toHaveCSS('padding-top', '24px');
	for (const className of ['Warrior', 'Scout', 'Priest', 'Magi', 'Versant']) {
		await expect(page.getByText(className, { exact: true })).toBeVisible();
	}

	await page.getByLabel('Character name').fill('Aster Vale');
	await page.getByLabel('Seed optional').fill('playwright-seed');
	await page.getByText('Magi', { exact: true }).click();
	await page.getByRole('button', { name: 'Begin run' }).click();

	await page.setViewportSize({ width: 1920, height: 1080 });
	await expect(page.getByRole('heading', { name: 'Monastery Grounds' })).toBeVisible();
	await expect(page.getByText('Magi // Level 1')).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(() => ({
				documentHeight: document.documentElement.scrollHeight,
				bodyHeight: document.body.scrollHeight,
				viewportHeight: window.innerHeight
			}))
		)
		.toEqual({ documentHeight: 1080, bodyHeight: 1080, viewportHeight: 1080 });
	await expect(page.locator('.game-shell')).toHaveCSS('width', '1920px');
	await expect(page.locator('.game-shell')).toHaveCSS('height', '1080px');
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

test('multi-enemy targeting and Tomb Record scrolling preserve player intent', async ({
	context,
	page
}) => {
	await context.addCookies([
		{
			name: 'ff_test_user',
			value: 'targeting-test-user',
			domain: '127.0.0.1',
			path: '/'
		}
	]);
	await page.goto('/');
	await page.getByLabel('Character name').fill('Rook Ash');
	await page.getByLabel('Seed optional').fill('targeting-scroll-seed');
	await page.getByText('Magi', { exact: true }).click();
	await page.getByRole('button', { name: 'Begin run' }).click();
	await page.getByRole('button', { name: /Climb toward the shrine/ }).click();

	let projection: Record<string, unknown> | null = null;
	let submittedTargetId: string | null = null;
	let syntheticEvent = 0;
	let releaseAttack = () => {};
	const attackGate = new Promise<void>((resolve) => {
		releaseAttack = resolve;
	});

	await page.route('**/api/runs/*/commands', async (route) => {
		const requestBody = route.request().postDataJSON() as {
			command: { type: string; targetId?: string };
		};

		if (!projection) {
			const response = await route.fetch();
			const body = (await response.json()) as {
				kind: string;
				projection: Record<string, unknown>;
			};
			projection = {
				...body.projection,
				enemies: [
					{
						id: 'enemy-far',
						name: 'Ash Warden',
						hp: 18,
						maxHp: 44,
						rank: 'far',
						guarded: false
					},
					{
						id: 'enemy-near',
						name: 'Grave Hound',
						hp: 12,
						maxHp: 20,
						rank: 'near',
						guarded: false
					},
					{
						id: 'enemy-distant',
						name: 'Distant Cantor',
						hp: 9,
						maxHp: 18,
						rank: 'far',
						guarded: false
					},
					{
						id: 'enemy-guarded',
						name: 'Veiled Saint',
						hp: 30,
						maxHp: 30,
						rank: 'far',
						guarded: true
					}
				],
				commands: [
					{
						id: 'inspect',
						label: 'Inspect',
						detail: 'Read the current room or threat.',
						command: { type: 'inspect' }
					},
					{
						id: 'attack:enemy-near',
						label: 'Attack Grave Hound',
						detail: 'Wand // Mind // Far',
						command: { type: 'attack', targetId: 'enemy-near', economy: 'action' },
						economy: 'action'
					},
					{
						id: 'attack:enemy-far',
						label: 'Attack Ash Warden',
						detail: 'Wand // Mind // Far',
						command: { type: 'attack', targetId: 'enemy-far', economy: 'action' },
						economy: 'action'
					},
					{
						id: 'feature:guidance',
						label: 'Guidance',
						detail: 'Utility // self',
						command: { type: 'use-feature', featureId: 'guidance' },
						economy: 'ability'
					},
					{
						id: 'end-turn',
						label: 'End turn',
						detail: 'Yield to the tomb.',
						command: { type: 'end-turn' }
					}
				],
				events: Array.from({ length: 36 }, (_, index) => ({
					kind: 'inspection',
					text: `Ledger line ${String(index + 1).padStart(2, '0')} records the hostile watch.`,
					tone: 'neutral',
					turn: index + 1
				}))
			};
			await route.fulfill({
				response,
				json: { ...body, projection }
			});
			return;
		}

		if (requestBody.command.type === 'attack') {
			submittedTargetId = requestBody.command.targetId ?? null;
			await attackGate;
		}
		syntheticEvent += 1;
		projection = {
			...projection,
			version: Number(projection.version) + 1,
			events: [
				{
					kind: requestBody.command.type === 'attack' ? 'attack-resolved' : 'inspection',
					text:
						requestBody.command.type === 'attack'
							? `Alternate target ${requestBody.command.targetId} receives the attack.`
							: `Unseen ledger entry ${syntheticEvent} arrives.`,
					tone: requestBody.command.type === 'attack' ? 'command' : 'neutral',
					turn: 50 + syntheticEvent
				}
			]
		};
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ kind: 'accepted', projection })
		});
	});

	await page.getByRole('button', { name: /^Inspect/ }).click();

	const nearTarget = page.getByRole('radio', { name: 'Target Grave Hound' });
	const farTarget = page.getByRole('radio', { name: 'Target Ash Warden' });
	await expect(nearTarget).toBeChecked();
	await expect(farTarget).not.toBeChecked();
	await expect(page.getByRole('radio', { name: 'Target Distant Cantor' })).toBeDisabled();
	await expect(page.getByRole('radio', { name: 'Target Veiled Saint' })).toBeDisabled();
	await expect(page.getByText('Unavailable', { exact: true })).toBeVisible();
	await expect(page.getByText('Guarded', { exact: true })).toBeVisible();
	await expect(page.getByRole('progressbar', { name: 'Ash Warden health' })).toHaveAttribute(
		'aria-valuenow',
		'18'
	);
	await expect(page.getByRole('progressbar', { name: 'Ash Warden health' })).toHaveAttribute(
		'aria-valuetext',
		'18 / 44 HP'
	);
	await expect(page.getByText('18 / 44 HP', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: /^Attack Grave Hound/ })).toBeVisible();
	await expect(page.getByRole('button', { name: /^Attack Ash Warden/ })).toHaveCount(0);
	await expect(page.getByRole('button', { name: /^Guidance/ })).toBeVisible();

	await nearTarget.focus();
	await page.keyboard.press('ArrowUp');
	await expect(farTarget).toBeChecked();
	await expect(page.getByRole('button', { name: /^Attack Ash Warden/ })).toBeVisible();
	await expect(page.getByRole('button', { name: /^Attack Grave Hound/ })).toHaveCount(0);
	const selectedAttack = page.getByRole('button', { name: /^Attack Ash Warden/ });
	await selectedAttack.click();
	await expect.poll(() => submittedTargetId).toBe('enemy-far');
	await expect(farTarget).toBeDisabled();
	await expect(selectedAttack).toBeDisabled();
	await expect(farTarget.locator('xpath=ancestor::label')).toHaveClass(/target-unavailable/);
	releaseAttack();
	await expect(farTarget).toBeChecked();

	const tombRecord = page.locator('.command-log');
	await expect(tombRecord.locator('li').first()).toContainText(
		'Alternate target enemy-far receives the attack.'
	);
	await tombRecord.evaluate((element) => {
		element.scrollTop = element.scrollHeight;
		element.dispatchEvent(new Event('scroll'));
	});
	const reviewedBottomGap = await tombRecord.evaluate(
		(element) => element.scrollHeight - element.scrollTop - element.clientHeight
	);
	await page.getByRole('button', { name: /^Inspect/ }).click();
	await expect(page.getByRole('button', { name: 'Jump to latest tomb record' })).toBeVisible();
	await expect(tombRecord.locator('li').first()).toContainText('Unseen ledger entry');
	await expect
		.poll(() =>
			tombRecord.evaluate(
				(element) => element.scrollHeight - element.scrollTop - element.clientHeight
			)
		)
		.toBe(reviewedBottomGap);

	await page.getByRole('button', { name: 'Jump to latest tomb record' }).click();
	await expect(page.getByRole('button', { name: 'Jump to latest tomb record' })).toHaveCount(0);
	await expect
		.poll(() => tombRecord.evaluate((element) => element.scrollTop))
		.toBeLessThanOrEqual(24);

	await page.getByRole('button', { name: /^Inspect/ }).click();
	await expect
		.poll(() => tombRecord.evaluate((element) => element.scrollTop))
		.toBeLessThanOrEqual(24);
	await expect(page.getByRole('button', { name: 'Jump to latest tomb record' })).toHaveCount(0);

	await page.emulateMedia({ reducedMotion: 'reduce' });
	await tombRecord.evaluate((element) => {
		element.scrollTop = element.scrollHeight;
		element.dispatchEvent(new Event('scroll'));
	});
	await page.getByRole('button', { name: /^Inspect/ }).click();
	await expect(page.getByRole('button', { name: 'Jump to latest tomb record' })).toBeVisible();
	await expect(tombRecord).toHaveCSS('scroll-behavior', 'auto');
	await page.getByRole('button', { name: 'Jump to latest tomb record' }).click();

	await page.setViewportSize({ width: 390, height: 844 });
	await expect(farTarget).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(
				() => document.documentElement.scrollWidth <= document.documentElement.clientWidth
			)
		)
		.toBe(true);
});

test('combat reserve-weapon swap costs 1 AP and updates available actions', async ({
	context,
	page
}) => {
	await context.addCookies([
		{
			name: 'ff_test_user',
			value: 'combat-equip-test-user',
			domain: '127.0.0.1',
			path: '/'
		}
	]);
	await page.goto('/');
	await page.getByLabel('Character name').fill('Nettle Vane');
	await page.getByLabel('Seed optional').fill('combat-equip-seed');
	await page.getByText('Scout', { exact: true }).click();
	await page.getByRole('button', { name: 'Begin run' }).click();
	await page.getByRole('button', { name: /Climb toward the shrine/ }).click();

	await expect(page.getByText('2 / 2 AP')).toBeVisible();
	await expect(page.getByText('near', { exact: true }).first()).toBeVisible();
	const equip = page.getByRole('button', { name: /^Equip Dagger/ });
	await expect(equip).toContainText('Spend 1 AP');
	await equip.click();

	await expect(page.getByText('1 / 2 AP')).toBeVisible();
	await expect(page.getByText('Used: Equip')).toBeVisible();
	await expect(page.getByText('Dagger', { exact: true }).first()).toBeVisible();
	await expect(page.getByRole('button', { name: /^Equip Shortbow/ })).toHaveCount(0);
	await expect(page.getByRole('button', { name: /^Attack/ })).toContainText(
		'Dagger // Reflex // Near'
	);
	await expect(page.getByText('near', { exact: true }).first()).toBeVisible();
});

test('noisy ambush victory grants 5 XP through the persisted browser flow', async ({
	context,
	page
}) => {
	await context.addCookies([
		{
			name: 'ff_test_user',
			value: 'ambush-xp-test-user',
			domain: '127.0.0.1',
			path: '/'
		}
	]);
	const seed = 'v3-Scout-22';
	await page.goto('/');
	await page.getByLabel('Character name').fill('Vesper Flint');
	await page.getByLabel('Seed optional').fill(seed);
	await page.getByText('Scout', { exact: true }).click();
	await page.getByRole('button', { name: 'Begin run' }).click();

	let local = createInitialState({
		name: 'Vesper Flint',
		className: 'Scout',
		seed,
		contentVersion: CONTENT_VERSION
	});
	const rng = createRng(`${seed}:commands`, local.rngCursor);
	const riskyRoomId = local.graph.middleTemplateIds[2];
	let version = 0;
	let ambushTriggered = false;
	let xpBeforeAmbush = 0;
	let ambushVictoryEvents: GameEvent[] = [];

	for (let step = 0; step < 300 && local.status === 'active'; step += 1) {
		const legal = getLegalCommands(local);
		let selected: LegalCommand | undefined;
		if (local.phase === 'exploration') {
			selected =
				legal.find(
					(candidate) =>
						candidate.command.type === 'buy' && candidate.command.stockId === 'stock:blue-hive-wax'
				) ??
				legal.find((candidate) => candidate.command.type === 'use-item') ??
				legal.find((candidate) => candidate.command.type === 'search') ??
				legal.find(
					(candidate) =>
						candidate.command.type === 'patch-up' && local.player.hp < local.player.maxHp
				) ??
				legal.find((candidate) => {
					const command = candidate.command;
					if (command.type !== 'move') return false;
					return local.graph.nodes[local.roomId].exits.some(
						(exit) => exit.id === command.exitId && exit.to === riskyRoomId
					);
				}) ??
				legal.find((candidate) => candidate.command.type === 'move');
		} else if (local.phase === 'combat') {
			selected =
				legal.find(
					(candidate) =>
						candidate.command.type === 'use-feature' &&
						candidate.command.featureId === 'sharpshooter'
				) ??
				legal.find(
					(candidate) =>
						candidate.command.type === 'use-feature' &&
						candidate.command.featureId === 'surprise-attack'
				) ??
				legal.find(
					(candidate) => candidate.command.type === 'attack' && candidate.economy !== 'maneuver'
				) ??
				legal.find((candidate) => candidate.command.type === 'close-distance') ??
				legal.find((candidate) => candidate.command.type === 'end-turn');
		}
		if (!selected) throw new Error(`No deterministic command for ${local.phase}.`);

		const response = await page.evaluate(
			async ({ command, expectedVersion, commandId }) => {
				const active = await fetch('/api/runs').then((result) => result.json());
				const result = await fetch(`/api/runs/${active.active.runId}/commands`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ command, expectedVersion, commandId })
				});
				return result.json();
			},
			{
				command: selected.command,
				expectedVersion: version,
				commandId: `ambush-flow-${String(step).padStart(4, '0')}`
			}
		);
		expect(response.kind).toBe('accepted');
		version = Number(response.projection.version);

		const resolution = resolveCommand(local, selected.command, rng);
		if (resolution.events.some((event) => event.kind === 'ambush-triggered')) {
			ambushTriggered = true;
			xpBeforeAmbush = local.player.experience;
		}
		local = resolution.state;
		if (ambushTriggered && resolution.events.some((event) => event.kind === 'experience-gained')) {
			ambushVictoryEvents = response.projection.events;
			break;
		}
	}

	expect(ambushTriggered).toBe(true);
	expect(local.player.experience).toBe(xpBeforeAmbush + 5);
	expect(ambushVictoryEvents).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ kind: 'experience-gained', text: 'Victory grants 5 XP.' })
		])
	);
	await page.reload();
	await expect(
		page.getByText(String(local.player.experience), { exact: true }).first()
	).toBeVisible();
});

test('expedition merchant, inventory, warnings, item use, and relic replacement remain accessible', async ({
	context,
	page
}) => {
	await context.addCookies([
		{
			name: 'ff_test_user',
			value: 'expedition-ui-user',
			domain: '127.0.0.1',
			path: '/'
		}
	]);
	await page.goto('/');
	await page.getByLabel('Character name').fill('Sable Reed');
	await page.getByLabel('Seed optional').fill('expedition-ui-seed');
	await page.getByText('Warrior', { exact: true }).click();
	await page.getByRole('button', { name: 'Begin run' }).click();

	const weaponInventory = page.locator('.inventory-weapons');
	await expect(
		weaponInventory.locator('div').filter({ hasText: 'Equipped' }).getByText('Longsword')
	).toBeVisible();
	await expect(
		weaponInventory.locator('div').filter({ hasText: 'Reserve' }).getByText('Shield')
	).toBeVisible();
	await page.getByRole('button', { name: /^Equip Shield/ }).click();
	await expect(
		weaponInventory.locator('div').filter({ hasText: 'Equipped' }).getByText('Shield')
	).toBeVisible();
	await expect(
		weaponInventory.locator('div').filter({ hasText: 'Reserve' }).getByText('Longsword')
	).toBeVisible();

	let projection: RunProjection | null = null;
	const submitted: Record<string, unknown>[] = [];
	await page.route('**/api/runs/*/commands', async (route) => {
		const request = route.request().postDataJSON() as { command: Record<string, unknown> };
		submitted.push(request.command);
		if (!projection) {
			const response = await route.fetch();
			const body = (await response.json()) as { kind: string; projection: RunProjection };
			projection = {
				...body.projection,
				version: Number(body.projection.version) + 1,
				phase: 'exploration',
				room: {
					...body.projection.room,
					id: 'gallery',
					name: 'Gallery Quartermaster',
					kicker: 'Safe stores behind a barred vestry',
					description: 'Sister Caldrin inventories what survived the raid.'
				},
				player: {
					...body.projection.player,
					gold: 20,
					hp: Math.max(1, Number(body.projection.player.maxHp) - 10)
				},
				enemies: [],
				combat: null,
				expedition: {
					inventory: {
						consumables: [
							{
								id: 'healing-potion',
								name: 'Healing Potion',
								quantity: 1,
								classification: 'canonical',
								description: 'Restore health as if Patching Up.'
							}
						],
						questItems: [
							{
								id: 'bozman-sensor',
								name: 'Bozman Sensor',
								description: 'Opens and protects authored routes.'
							}
						],
						relics: [
							{
								id: 'hushglass-rosary',
								name: 'Hushglass Rosary',
								benefit: 'Suppress first noisy ambush.',
								drawback: 'Halve successful-search gold.'
							},
							{
								id: 'pilgrims-red-thread',
								name: "Pilgrim's Red Thread",
								benefit: 'First rank switch grants defense advantage.',
								drawback: 'Hostiles gain momentum.'
							}
						],
						reserveWeapon: null,
						pendingRelic: {
							id: 'grave-tappers-bell',
							name: "Grave-Tapper's Bell",
							benefit: 'Search with advantage.',
							drawback: 'Noisy failure adds a hostile.'
						},
						waxCoated: false
					},
					merchant: {
						name: 'Sister Caldrin, Shrine Quartermaster',
						introduction: 'A wounded quartermaster offers the stores she saved.',
						stock: [
							{
								id: 'stock:healing-potion',
								itemId: 'healing-potion',
								name: 'Healing Potion',
								description: 'Restore health as if Patching Up.',
								classification: 'canonical',
								price: 50,
								quantity: 1,
								affordable: false,
								capacityConflict: false,
								soldOut: false
							},
							{
								id: 'stock:blue-hive-wax',
								itemId: 'blue-hive-wax',
								name: 'Blue Hive Wax',
								description: 'Next weapon hit gains Poison.',
								classification: 'adaptation',
								price: 20,
								quantity: 1,
								affordable: true,
								capacityConflict: false,
								soldOut: false
							},
							{
								id: 'stock:grave-tappers-bell',
								itemId: 'grave-tappers-bell',
								name: "Grave-Tapper's Bell",
								description: 'Clearer searches make louder mistakes.',
								benefit: 'Search with advantage.',
								drawback: 'Noisy failure adds a hostile.',
								classification: 'adaptation',
								price: 40,
								quantity: 1,
								affordable: false,
								capacityConflict: true,
								soldOut: false
							}
						]
					},
					pendingOutcome: false
				},
				commands: [
					{
						id: 'inspect',
						label: 'Inspect',
						detail: 'Read the room.',
						command: { type: 'inspect' }
					},
					{
						id: 'search:gallery:cache',
						label: 'Disturb the echoing cache',
						detail: 'Reflex // Hard',
						warning: 'Noise here may draw an ambush.',
						command: { type: 'search', interactionId: 'search:gallery:cache' }
					},
					{
						id: 'buy:stock:blue-hive-wax',
						label: 'Buy Blue Hive Wax',
						detail: '20gp // 1 remaining',
						command: { type: 'buy', stockId: 'stock:blue-hive-wax' }
					},
					{
						id: 'use:healing-potion',
						label: 'Use Healing Potion',
						detail: 'Restore health.',
						command: { type: 'use-item', itemId: 'healing-potion' }
					},
					{
						id: 'replace:pending:hushglass-rosary',
						label: 'Replace Hushglass Rosary',
						detail: "Destroy it and take Grave-Tapper's Bell.",
						command: {
							type: 'replace-relic',
							incomingRelicId: 'grave-tappers-bell',
							outgoingRelicId: 'hushglass-rosary'
						}
					}
				],
				events: [
					{
						kind: 'inspection',
						text: 'The safe vestry opens for trade.',
						tone: 'neutral',
						turn: 1
					}
				]
			};
			await route.fulfill({ response, json: { ...body, projection } });
			return;
		}

		projection = {
			...projection,
			version: Number(projection.version) + 1,
			events: [
				{
					kind:
						request.command.type === 'buy'
							? 'purchase-resolved'
							: request.command.type === 'replace-relic'
								? 'relic-replaced'
								: 'item-used',
					text: `${String(request.command.type)} accepted.`,
					tone: 'command',
					turn: Number(projection.turn) + submitted.length
				}
			]
		};
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ kind: 'accepted', projection })
		});
	});

	await page.getByRole('button', { name: /^Inspect/ }).click();
	await expect(
		page.getByRole('heading', { name: 'Sister Caldrin, Shrine Quartermaster' })
	).toBeVisible();
	await expect(page.getByText('20gp', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('Insufficient gold', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('Benefit // Search with advantage.').first()).toBeVisible();
	await expect(page.getByText('Cost // Noisy failure adds a hostile.').first()).toBeVisible();
	await expect(page.getByText('Warning // Noise here may draw an ambush.')).toBeVisible();
	await expect(page.getByText("Grave-Tapper's Bell awaits replacement")).toBeVisible();

	await page.getByRole('button', { name: 'Buy', exact: true }).click();
	await expect.poll(() => submitted.at(-1)?.type).toBe('buy');
	await expect(submitted.at(-1)).toEqual({
		type: 'buy',
		stockId: 'stock:blue-hive-wax'
	});

	await page.getByRole('button', { name: /^Replace Hushglass Rosary/ }).click();
	await expect.poll(() => submitted.at(-1)?.type).toBe('replace-relic');
	await page.getByRole('button', { name: /^Use Healing Potion/ }).click();
	await expect.poll(() => submitted.at(-1)?.type).toBe('use-item');

	await page.setViewportSize({ width: 390, height: 844 });
	await expect(page.getByText('Blue Hive Wax', { exact: true })).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(
				() => document.documentElement.scrollWidth <= document.documentElement.clientWidth
			)
		)
		.toBe(true);
});
