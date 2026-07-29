<script lang="ts">
	import type { GameCommand } from '$lib/game/commands';
	import { ROOMS } from '$lib/game/content/rooms';
	import { resolveCommand } from '$lib/game/engine';
	import type { GameEvent } from '$lib/game/events';
	import { createRng } from '$lib/game/rng';
	import { createInitialState } from '$lib/game/state';

	const rng = createRng('bozma-bootstrap');
	let game = $state(createInitialState());
	let log = $state<GameEvent[]>([
		{
			kind: 'room-entered',
			text: "You wake at St. Bozma's Threshold with ash on your tongue.",
			tone: 'neutral',
			turn: 0
		}
	]);

	const room = $derived(ROOMS[game.roomId]);
	const hpPercent = $derived(Math.round((game.player.hp / game.player.maxHp) * 100));

	function issue(command: GameCommand) {
		const result = resolveCommand(game, command, rng);
		game = result.state;
		log = [...log, ...result.events];
	}
</script>

<svelte:head>
	<title>Fivefold — St. Bozma's Threshold</title>
</svelte:head>

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
			<p class="eyebrow">Fivefold // Run 001</p>
			<h1>St. Bozma&rsquo;s Tomb</h1>
		</div>
		<div class="run-state" aria-label="Run status">
			<span class:danger={game.phase === 'combat' || game.phase === 'defeat'}>
				{game.phase === 'combat' ? 'Danger' : game.phase === 'defeat' ? 'Run ended' : 'Exploring'}
			</span>
			<span>Turn {String(game.turn).padStart(2, '0')}</span>
			<span>Seed bozma-bootstrap</span>
		</div>
	</header>

	<section class="game-grid" aria-label="Dungeon run">
		<aside class="character-sheet" aria-labelledby="character-title">
			<div class="section-heading">
				<p class="eyebrow">Delver</p>
				<h2 id="character-title">{game.player.name}</h2>
				<p>{game.player.className} // Level {game.player.level}</p>
			</div>

			<div class="vital">
				<div class="vital-label">
					<span>Heart</span>
					<strong>{game.player.hp} / {game.player.maxHp}</strong>
				</div>
				<div
					class="vital-track"
					role="progressbar"
					aria-label="Health"
					aria-valuenow={game.player.hp}
					aria-valuemin="0"
					aria-valuemax={game.player.maxHp}
				>
					<span style={`width: ${hpPercent}%`}></span>
				</div>
			</div>

			<dl class="stats">
				<div>
					<dt>Reflex</dt>
					<dd>{game.player.reflex}</dd>
				</div>
				<div>
					<dt>XP</dt>
					<dd>{game.player.experience}</dd>
				</div>
				<div>
					<dt>Gold</dt>
					<dd>{game.player.gold}</dd>
				</div>
				<div>
					<dt>Rooms</dt>
					<dd>{game.visitedRooms.length}</dd>
				</div>
			</dl>

			<div class="inventory">
				<p class="label">Carried</p>
				<ul>
					{#each game.player.inventory as item (item)}
						<li>{item}</li>
					{/each}
				</ul>
			</div>
		</aside>

		<section class="scene" aria-labelledby="room-title">
			<div class="room-copy">
				<p class="eyebrow">{room.kicker}</p>
				<h2 id="room-title">{room.name}</h2>
				<p>{room.description}</p>
			</div>

			{#if game.enemy}
				<div class="encounter" aria-label="Current encounter">
					<div>
						<p class="eyebrow danger">Hostile // Near</p>
						<h3>{game.enemy.name}</h3>
					</div>
					<p class="enemy-hp">{game.enemy.hp} / {game.enemy.maxHp} HP</p>
				</div>
			{/if}

			<div class="log-header">
				<p class="label">Tomb record</p>
				<span>{log.length} entries</span>
			</div>
			<ol class="command-log" aria-live="polite">
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

			<div class="command-group">
				<p class="label">Passages</p>
				<div class="direction-pad">
					<button
						type="button"
						class="north"
						onclick={() => issue({ type: 'move', direction: 'north' })}
						disabled={game.phase === 'combat' || !room.exits.north}>North</button
					>
					<button
						type="button"
						class="west"
						onclick={() => issue({ type: 'move', direction: 'west' })}
						disabled={game.phase === 'combat' || !room.exits.west}>West</button
					>
					<span class="position" aria-hidden="true">✦</span>
					<button
						type="button"
						class="east"
						onclick={() => issue({ type: 'move', direction: 'east' })}
						disabled={game.phase === 'combat' || !room.exits.east}>East</button
					>
					<button
						type="button"
						class="south"
						onclick={() => issue({ type: 'move', direction: 'south' })}
						disabled={game.phase === 'combat' || !room.exits.south}>South</button
					>
				</div>
			</div>

			<div class="command-group">
				<p class="label">{game.phase === 'combat' ? 'Combat' : 'Actions'}</p>
				<div class="action-stack">
					{#if game.phase === 'combat'}
						<button type="button" class="primary" onclick={() => issue({ type: 'attack' })}>
							Attack with knife
							<span>d100 under Reflex</span>
						</button>
						<button type="button" onclick={() => issue({ type: 'brace' })}>
							Brace
							<span>Reduce next strike</span>
						</button>
					{/if}
					<button type="button" onclick={() => issue({ type: 'inspect' })}>
						Inspect
						<span>Read the room</span>
					</button>
				</div>
			</div>

			<p class="rule-note">
				Local specimen. Commands resolve deterministically. Persistence remains
				server-authoritative.
			</p>
		</aside>
	</section>
</main>
