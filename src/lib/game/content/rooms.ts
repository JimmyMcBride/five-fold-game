import type { Direction, RoomId } from '../state';

export interface Room {
	id: RoomId;
	name: string;
	kicker: string;
	description: string;
	exits: Partial<Record<Direction, RoomId>>;
}

export const ROOMS: Record<RoomId, Room> = {
	threshold: {
		id: 'threshold',
		name: "St. Bozma's Threshold",
		kicker: 'The first seal',
		description:
			'Basalt doors lean open beneath the weight of the hill. Melted votive wax clots the floor; every flame points north, though no wind reaches this place.',
		exits: { north: 'ossuary' }
	},
	ossuary: {
		id: 'ossuary',
		name: 'The Crooked Ossuary',
		kicker: 'A room that remembers teeth',
		description:
			'Ribs and finger bones have been wired into narrow shelves. Something small moves behind the reliquary, dragging a length of funeral chain.',
		exits: { south: 'threshold' }
	}
};
