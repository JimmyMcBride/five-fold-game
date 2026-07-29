<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="description" content="Fivefold — a text-first, turn-based dungeon crawler." />
</svelte:head>
{@render children()}
