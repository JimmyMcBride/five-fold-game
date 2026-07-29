<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import type { GameCommand, LegalCommand } from '$lib/game/commands';
	import type { GameEvent } from '$lib/game/events';
	import { CLASS_KITS } from '$lib/game/content/classes';
	import { CLASS_NAMES, STAT_NAMES, type ClassName, type RunSummary } from '$lib/game/model';
	import type { RunProjection } from '$lib/game/projection';

	let { data }: { data: PageData } = $props();
	// svelte-ignore state_referenced_locally
	let projection = $state<RunProjection | null>((data.active as RunProjection | null) ?? null);
	// svelte-ignore state_referenced_locally
	let history = $state<RunSummary[]>((data.history as RunSummary[]) ?? []);
	let log = $state<GameEvent[]>([]);
	let selectedClass = $state<ClassName>('Warrior');
	// svelte-ignore state_referenced_locally
	let characterName = $state(data.session?.displayName ?? '');
	let requestedSeed = $state('');
	let pending = $state(false);
	let errorMessage = $state<string | null>(null);

	const hpPercent = $derived(
		projection ? Math.round((projection.player.hp / Math.max(1, projection.player.maxHp)) * 100) : 0
	);
	const commandGroups = $derived.by(() => {
		const groups: [string, LegalCommand[]][] = [];
		for (const command of projection?.commands ?? []) {
			const key =
				command.command.type === 'move'
					? 'Passages'
					: command.economy
						? `${command.economy}s`
						: command.command.type === 'set-defense'
							? 'Defense'
							: 'Explore';
			const group = groups.find(([name]) => name === key);
			if (group) group[1].push(command);
			else groups.push([key, [command]]);
		}
		return groups;
	});

	async function startRun(event: SubmitEvent) {
		event.preventDefault();
		pending = true;
		errorMessage = null;
		try {
			const response = await fetch('/api/runs', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name: characterName,
					className: selectedClass,
					seed: requestedSeed
				})
			});
			const body = await response.json();
			if (!response.ok) throw new Error(body.message ?? 'The run could not begin.');
			projection = body.projection;
			log = body.projection.events ?? [];
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'The run could not begin.';
		} finally {
			pending = false;
		}
	}

	async function issue(command: GameCommand) {
		if (!projection || pending) return;
		pending = true;
		errorMessage = null;
		try {
			const response = await fetch(`/api/runs/${projection.runId}/commands`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					commandId: crypto.randomUUID(),
					expectedVersion: projection.version,
					command
				})
			});
			const body = await response.json();
			if (response.status === 422 && body.projection) {
				projection = body.projection;
				log = [...log, ...(body.projection.events ?? [])];
				errorMessage = 'That command is no longer legal. Nothing advanced.';
				return;
			}
			if (!response.ok && response.status !== 409) {
				throw new Error(body.message ?? 'The command was rejected.');
			}
			projection = body.projection;
			log = [...log, ...(body.projection.events ?? [])];
			if (body.kind === 'stale') {
				errorMessage = 'The run changed in another request. Current state restored.';
			}
			if (projection?.status !== 'active') await refreshHistory();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'The command failed.';
		} finally {
			pending = false;
		}
	}

	async function refreshHistory() {
		const response = await fetch('/api/runs');
		if (!response.ok) return;
		const body = await response.json();
		history = body.history ?? [];
	}

	function prepareFreshRun() {
		projection = null;
		log = [];
		errorMessage = null;
		requestedSeed = '';
	}

	function statLabel(stat: string) {
		return stat.charAt(0).toUpperCase() + stat.slice(1);
	}
</script>

<svelte:head>
	<title>Fivefold — St. Bozma’s Tomb</title>
</svelte:head>

{#if !data.session}
	<main class="access-shell">
		<section class="access-copy" aria-labelledby="access-title">
			<p class="eyebrow">Fivefold // Public alpha</p>
			<h1 id="access-title">Enter St. Bozma&rsquo;s Tomb</h1>
			<p class="lede">
				A single-player, text-first Fivefold run. Eight rooms. Five ways to face them. One life.
			</p>
			{#if data.authError}
				<p class="notice danger" role="alert">{data.authError}</p>
			{/if}
			<a class="discord-action" href={resolve('/auth/discord')}>
				<span aria-hidden="true">⌁</span>
				Continue with Discord
			</a>
			<p class="access-note">
				No invitation required. Discord creates your alpha account; only run history persists after
				death.
			</p>
		</section>
		<aside class="access-docket" aria-label="Alpha rules">
			<p class="label">The compact</p>
			<dl>
				<div>
					<dt>Mode</dt>
					<dd>Solo roguelike</dd>
				</div>
				<div>
					<dt>Dungeon</dt>
					<dd>Seeded // 8 rooms</dd>
				</div>
				<div>
					<dt>Death</dt>
					<dd>Run erased</dd>
				</div>
				<div>
					<dt>Record</dt>
					<dd>Outcome retained</dd>
				</div>
			</dl>
		</aside>
	</main>
{:else if !data.storageReady}
	<main class="access-shell">
		<section class="access-copy" aria-labelledby="storage-title">
			<p class="eyebrow">Authenticated // {data.session.displayName}</p>
			<h1 id="storage-title">The tomb ledger is sealed</h1>
			<p class="lede">
				Discord sign-in works. The approved PocketBase run migration has not been applied to this
				environment yet.
			</p>
			<p class="notice">
				No schema was changed automatically. Apply the reviewed migration before alpha play.
			</p>
			<form method="POST" action="/auth/logout">
				<button class="ghost-action" type="submit">Log out</button>
			</form>
		</section>
	</main>
{:else if !projection}
	<main class="creation-shell">
		<header class="creation-header">
			<div>
				<p class="eyebrow">Authenticated // {data.session.displayName}</p>
				<h1>Name the next delver</h1>
			</div>
			<form method="POST" action="/auth/logout">
				<button class="ghost-action" type="submit">Log out</button>
			</form>
		</header>

		<form class="creation-form" onsubmit={startRun}>
			<section class="identity-band" aria-labelledby="identity-title">
				<div>
					<p class="label">Run identity</p>
					<h2 id="identity-title">Who enters?</h2>
				</div>
				<label>
					<span>Character name</span>
					<input bind:value={characterName} maxlength="40" required autocomplete="off" />
				</label>
				<label>
					<span>Seed <small>optional</small></span>
					<input
						bind:value={requestedSeed}
						maxlength="64"
						pattern="[a-zA-Z0-9_-]+"
						placeholder="Generated if blank"
						autocomplete="off"
					/>
				</label>
			</section>

			<fieldset class="class-fieldset">
				<legend>Choose one fixed class template</legend>
				<div class="class-grid">
					{#each CLASS_NAMES as className (className)}
						{@const kit = CLASS_KITS[className]}
						<label class:chosen={selectedClass === className} class="class-choice">
							<input type="radio" name="class" value={className} bind:group={selectedClass} />
							<span class="class-heading">
								<strong>{className}</strong>
								<small>{statLabel(kit.primaryStat)} // {kit.originPerk}</small>
							</span>
							<span class="class-stats">
								{#each STAT_NAMES as stat (stat)}
									<span>{statLabel(stat).slice(0, 1)} {kit.stats[stat]}</span>
								{/each}
							</span>
							<span class="class-kit"
								>{kit.armor} // {kit.weapons.map((weapon) => weapon.name).join(' + ')}</span
							>
						</label>
					{/each}
				</div>
			</fieldset>

			{#if errorMessage}
				<p class="notice danger" role="alert">{errorMessage}</p>
			{/if}
			<button class="primary-action" type="submit" disabled={pending}>
				{pending ? 'Opening the ledger…' : 'Begin run'}
			</button>
		</form>

		{#if history.length > 0}
			<section class="history-band" aria-labelledby="history-title">
				<div>
					<p class="label">Previous runs</p>
					<h2 id="history-title">The dead remain counted</h2>
				</div>
				<ul>
					{#each history as record (record.runId)}
						<li>
							<strong>{record.characterName}</strong>
							<span>{record.className} // Level {record.levelReached}</span>
							<span class:success={record.outcome === 'victory'}>{record.outcome}</span>
							<span>Seed {record.seed}</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</main>
{:else}
	<main class="game-shell">
		<svg class="grave-grid" aria-hidden="true">
			<defs>
				<pattern id="grave-lines" width="48" height="48" patternUnits="userSpaceOnUse">
					<path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" stroke-width="1" />
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill="url(#grave-lines)" />
		</svg>

		<header class="masthead">
			<div>
				<p class="eyebrow">Fivefold // {projection.runId}</p>
				<h1>St. Bozma&rsquo;s Tomb</h1>
			</div>
			<div class="run-state" aria-label="Run status">
				<span class:danger={projection.phase === 'combat' || projection.status !== 'active'}>
					{projection.status === 'active' ? projection.phase : projection.status}
				</span>
				<span>Turn {String(projection.turn).padStart(2, '0')}</span>
				<span>Seed {projection.seed}</span>
				<form method="POST" action="/auth/logout">
					<button type="submit">Log out</button>
				</form>
			</div>
		</header>

		{#if errorMessage}
			<p class="global-notice" role="alert">{errorMessage}</p>
		{/if}

		<section class="game-grid" aria-label="Dungeon run">
			<aside class="character-sheet" aria-labelledby="character-title">
				<div class="section-heading">
					<p class="eyebrow">Delver</p>
					<h2 id="character-title">{projection.player.name}</h2>
					<p>{projection.player.className} // Level {projection.player.level}</p>
				</div>

				<div class="vital">
					<div class="vital-label">
						<span>Health</span>
						<strong>{projection.player.hp} / {projection.player.maxHp}</strong>
					</div>
					<div
						class="vital-track"
						role="progressbar"
						aria-label="Health"
						aria-valuenow={projection.player.hp}
						aria-valuemin="0"
						aria-valuemax={projection.player.maxHp}
					>
						<span style={`width: ${hpPercent}%`}></span>
					</div>
					{#if projection.player.temporaryHp > 0}
						<p class="temporary">+{projection.player.temporaryHp} temporary</p>
					{/if}
				</div>

				<dl class="stats five">
					{#each STAT_NAMES as stat (stat)}
						<div>
							<dt>{statLabel(stat)}</dt>
							<dd>{projection.player.stats[stat]}</dd>
						</div>
					{/each}
				</dl>
				<dl class="stats resources">
					<div>
						<dt>XP</dt>
						<dd>{projection.player.experience}</dd>
					</div>
					<div>
						<dt>Momentum</dt>
						<dd>{projection.player.momentum} / 10</dd>
					</div>
					<div>
						<dt>Recovery</dt>
						<dd>{projection.player.recoveryDice} / {projection.player.maxRecoveryDice}</dd>
					</div>
					<div>
						<dt>Rank</dt>
						<dd>{projection.player.rank}</dd>
					</div>
					<div>
						<dt>Defense</dt>
						<dd>{projection.player.defense}</dd>
					</div>
					<div>
						<dt>Rooms</dt>
						<dd>{projection.room.visitedCount} / 8</dd>
					</div>
				</dl>

				<div class="inventory">
					<p class="label">Carried</p>
					<ul>
						{#each projection.player.inventory as item (item)}
							<li>{item}</li>
						{/each}
					</ul>
				</div>
			</aside>

			<section class="scene" aria-labelledby="room-title">
				<div class="room-copy">
					<p class="eyebrow">{projection.room.kicker}</p>
					<h2 id="room-title">{projection.room.name}</h2>
					<p>{projection.room.description}</p>
				</div>

				{#if projection.enemies.length > 0}
					<div class="encounter-list" aria-label="Current encounter">
						{#each projection.enemies as enemy (enemy.id)}
							<div class="encounter">
								<div>
									<p class="eyebrow danger">
										Hostile // {enemy.rank}{enemy.guarded ? ' // Guarded' : ''}
									</p>
									<h3>{enemy.name}</h3>
								</div>
								<p class="enemy-hp">{enemy.hp} / {enemy.maxHp} HP</p>
							</div>
						{/each}
						{#if projection.decodeCount > 0}
							<p class="decode-clock">Decode {projection.decodeCount} / 3</p>
						{/if}
					</div>
				{/if}

				<div class="log-header">
					<p class="label">Tomb record</p>
					<span>{log.length} entries</span>
				</div>
				<ol class="command-log" aria-live="polite">
					{#if log.length === 0}
						<li class="neutral">
							<span class="turn-mark">00</span><span>The ledger waits for a command.</span>
						</li>
					{/if}
					{#each log as entry, index (`${entry.turn}-${entry.kind}-${index}`)}
						<li class={entry.tone}>
							<span class="turn-mark">{String(entry.turn).padStart(2, '0')}</span>
							<span>{entry.text}</span>
						</li>
					{/each}
				</ol>
			</section>

			<aside class="command-panel" aria-labelledby="command-title">
				<div class="section-heading">
					<p class="eyebrow">Choose deliberately</p>
					<h2 id="command-title">Command</h2>
				</div>

				{#if projection.status !== 'active'}
					<div class="terminal-state">
						<p class="label">{projection.status}</p>
						<p>This run is sealed. Its record remains; its power does not.</p>
						<button class="primary-action" type="button" onclick={prepareFreshRun}
							>Start over</button
						>
					</div>
				{:else}
					{#each commandGroups as [group, commands] (group)}
						<div class="command-group">
							<p class="label">{group}</p>
							<div class="action-stack">
								{#each commands as command (command.id)}
									<button
										type="button"
										class:primary={command.command.type === 'attack' ||
											command.command.type === 'move'}
										disabled={pending}
										onclick={() => issue(command.command)}
									>
										<strong>{command.label}</strong>
										<span>{command.detail}</span>
									</button>
								{/each}
							</div>
						</div>
					{/each}
				{/if}

				<p class="rule-note">
					Server-authoritative // v{projection.version} // {projection.contentVersion}
				</p>
			</aside>
		</section>
	</main>
{/if}
