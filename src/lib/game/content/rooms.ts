import type { RoomTemplate } from '../model';

const TOMB_SOURCE = 'docs/game-rules/sections/16-st-bozmas-tomb.md';

export const ENTRY_ROOM: RoomTemplate = {
	id: 'monastery-grounds',
	name: 'Monastery Grounds',
	kicker: 'Blood darkens the snow',
	description:
		'The hilltop shrine stands beneath a colorless sky. Dead monks mark the path between cedar cabins, while smoke crawls from the stained-glass sanctuary.',
	source: TOMB_SOURCE
};

export const FINALE_ROOM: RoomTemplate = {
	id: 'saint-bozmas-resting-chamber',
	name: 'Saint Bozma’s Resting Chamber',
	kicker: 'The third prayer breaks the ward',
	description:
		'Saint Bozma lies untouched beneath glass. Barnabe works at the ward in a fevered whisper, counting syllables while dark fire gathers in his hands.',
	source: TOMB_SOURCE
};

export const MIDDLE_ROOMS: RoomTemplate[] = [
	{
		id: 'cabins',
		name: 'Cabins',
		kicker: 'Cold beds, hurried hands',
		description:
			'Four cedar cabins hold abandoned bowls, fur blankets, and the signs of a search cut short by violence.',
		source: TOMB_SOURCE
	},
	{
		id: 'storage-shack',
		name: 'Storage Shack',
		kicker: 'Jelly frozen in broken casks',
		description:
			'Split barrels of Hellhornet jelly glaze the floor. A red-smoked sensor waits beneath scavenged hides.',
		source: TOMB_SOURCE
	},
	{
		id: 'apiary',
		name: 'Apiary',
		kicker: 'A warning beaten on paper walls',
		description:
			'Cobalt wings hammer the tower hive in unison. Smoking lanterns draw a brittle threshold around the colony.',
		source: TOMB_SOURCE
	},
	{
		id: 'sanctuary',
		name: 'Sanctuary',
		kicker: 'Incense over spilled blood',
		description:
			'Painted saints watch the altar through a haze of sweetness and smoke. A plea for mercy has been carved into the wax.',
		source: TOMB_SOURCE
	},
	{
		id: 'brewery',
		name: 'Brewery',
		kicker: 'Sour honey and hot iron',
		description:
			'Great mead kegs crowd a split-level hall. Bottles roll below the balcony whenever something heavy moves in the dark.',
		source: TOMB_SOURCE
	},
	{
		id: 'cellar',
		name: 'Cellar',
		kicker: 'A library broken open',
		description:
			'Letters and holy commentaries lie under stone dust. Two monks still clutch one another beside a hidden breach.',
		source: TOMB_SOURCE
	},
	{
		id: 'tomb-entry',
		name: 'Tomb Entry',
		kicker: 'Nine coffins and one warning',
		description:
			'Dust seals the handmaidens’ coffins. A frozen well descends into blackness and a narrow hall turns toward the saint.',
		source: TOMB_SOURCE
	},
	{
		id: 'gallery',
		name: 'Gallery',
		kicker: 'Miracles cut into stone',
		description:
			'Tapestries hang above carved miracles. A blood trail crosses the floor toward a lock shaped for a Bozman Sensor.',
		source: TOMB_SOURCE
	},
	{
		id: 'paladins-prayer-room',
		name: 'Paladin’s Prayer Room',
		kicker: 'An unfinished saint',
		description:
			'Loose thread coils around a prayer stool. Half of Saint Bozma emerges from the abandoned tapestry.',
		source: TOMB_SOURCE
	},
	{
		id: 'groundskeepers-storage',
		name: 'Groundskeeper’s Storage',
		kicker: 'An iron-barred promise',
		description:
			'A ruined bed faces an iron cage. Beyond its old lock, a weapon burns with a small, unwavering holy script.',
		source: TOMB_SOURCE
	}
];

export const ROOM_TEMPLATES: Record<string, RoomTemplate> = Object.fromEntries(
	[ENTRY_ROOM, ...MIDDLE_ROOMS, FINALE_ROOM].map((room) => [room.id, room])
);
