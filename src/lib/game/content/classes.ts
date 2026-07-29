import type { ClassKit, ClassName, Weapon } from '../model';

const longsword: Weapon = {
	id: 'longsword',
	name: 'Longsword',
	stat: 'heart',
	rank: 'near',
	momentum: 2,
	damageDice: 0,
	damageBonus: 'modifier'
};

const shortbow: Weapon = {
	id: 'shortbow',
	name: 'Shortbow',
	stat: 'reflex',
	rank: 'far',
	momentum: 2,
	damageDice: 1,
	damageBonus: 'modifier'
};

const prayerBook: Weapon = {
	id: 'prayer-book',
	name: 'Prayer Book',
	stat: 'soul',
	rank: 'far',
	momentum: 1,
	damageDice: 0,
	damageBonus: 'modifier'
};

const serpentStaff: Weapon = {
	id: 'serpent-staff',
	name: 'Serpent Staff',
	stat: 'mind',
	rank: 'far',
	momentum: 2,
	damageDice: 1,
	damageBonus: 'modifier'
};

export const CLASS_KITS: Record<ClassName, ClassKit> = {
	Warrior: {
		id: 'warrior',
		name: 'Warrior',
		primaryStat: 'heart',
		stats: { heart: 70, reflex: 50, soul: 40, mind: 10, voice: 30 },
		originPerk: 'Iron Resolve',
		armor: 'heavy',
		weapons: [
			longsword,
			{
				id: 'shield',
				name: 'Shield',
				stat: 'heart',
				rank: 'near',
				momentum: 1,
				damageDice: 0,
				damageBonus: 'half-modifier'
			}
		],
		features: [
			{
				id: 'threatening-strike',
				name: 'Threatening Strike',
				economy: 'action',
				description: 'A light weapon strike that stuns the target.'
			},
			{
				id: 'eye-for-an-eye',
				name: 'Eye for an Eye',
				economy: 'ability',
				description: 'A retaliatory weapon attack.'
			},
			{
				id: 'aegis-raised',
				name: 'Aegis Raised',
				economy: 'ability',
				description: 'Gain temporary health equal to half Heart once per combat.'
			}
		],
		passives: ['Iron Resolve', 'Know thy Weapon (Longsword)', 'Live for Battle'],
		deferredFeatures: [
			'Divination (interactive d10 digit replacement needs a dedicated roll-interception command)'
		]
	},
	Scout: {
		id: 'scout',
		name: 'Scout',
		primaryStat: 'reflex',
		stats: { heart: 40, reflex: 70, soul: 10, mind: 50, voice: 30 },
		originPerk: 'Steady Aim',
		armor: 'light',
		weapons: [
			shortbow,
			{
				id: 'dagger',
				name: 'Dagger',
				stat: 'reflex',
				rank: 'near',
				momentum: 3,
				damageDice: 0,
				damageBonus: 'half-modifier'
			}
		],
		features: [
			{
				id: 'sneak',
				name: 'Sneak',
				economy: 'action',
				description: 'Roll Reflex to become hidden.'
			},
			{
				id: 'surprise-attack',
				name: 'Surprise Attack',
				economy: 'maneuver',
				description: 'Make a weapon attack with advantage.'
			},
			{
				id: 'sharpshooter',
				name: 'Sharpshooter',
				economy: 'ability',
				description: 'Ranged weapon attacks have advantage through the next turn.'
			}
		],
		passives: ['Steady Aim', 'Expertise (Shortbow)', 'Ambusher'],
		deferredFeatures: []
	},
	Priest: {
		id: 'priest',
		name: 'Priest',
		primaryStat: 'soul',
		stats: { heart: 40, reflex: 10, soul: 70, mind: 30, voice: 50 },
		originPerk: 'No Weapon Formed Against Me',
		armor: 'cloth',
		weapons: [
			prayerBook,
			{
				id: 'mace',
				name: 'Mace',
				stat: 'heart',
				rank: 'near',
				momentum: 2,
				damageDice: 0,
				damageBonus: 'modifier'
			}
		],
		features: [
			{
				id: 'shield-of-faith',
				name: 'Shield of Faith',
				economy: 'action',
				description: 'Gain temporary health equal to the Soul modifier.'
			},
			{
				id: 'sacred-light',
				name: 'Sacred Light',
				economy: 'ability',
				description: 'Create holy motes that strike on later turns.'
			},
			{
				id: 'restorative-prayer',
				name: 'Restorative Prayer',
				economy: 'maneuver',
				description: 'Heal for the Soul modifier.'
			},
			{
				id: 'prayer-of-healing',
				name: 'Prayer of Healing',
				economy: 'ability',
				description: 'Roll Soul to heal for 1d10 plus Soul modifier.'
			}
		],
		passives: ['No Weapon Formed Against Me', 'Divinity'],
		deferredFeatures: ['Rebuke']
	},
	Magi: {
		id: 'magi',
		name: 'Magi',
		primaryStat: 'mind',
		stats: { heart: 10, reflex: 40, soul: 50, mind: 70, voice: 30 },
		originPerk: 'Divination',
		armor: 'cloth',
		weapons: [
			{
				id: 'wand',
				name: 'Wand',
				stat: 'mind',
				rank: 'far',
				momentum: 1,
				damageDice: 0,
				damageBonus: 'half-modifier'
			},
			serpentStaff
		],
		features: [
			{
				id: 'bolt',
				name: 'Bolt',
				economy: 'action',
				description: 'Roll Mind for 1d10 plus Mind modifier damage.'
			},
			{
				id: 'guidance',
				name: 'Guidance',
				economy: 'action',
				description: 'Lower your rolls through the next turn.'
			},
			{
				id: 'shooting-star',
				name: 'Shooting Star',
				economy: 'maneuver',
				description: 'Cash in hard and critical successes for damage.'
			},
			{
				id: 'black-cloud',
				name: 'Black Cloud',
				economy: 'ability',
				description: 'Roll Mind for dark damage and possible blindness.'
			}
		],
		passives: ['Divination', 'Inspired Brilliance'],
		deferredFeatures: []
	},
	Versant: {
		id: 'versant',
		name: 'Versant',
		primaryStat: 'voice',
		stats: { heart: 50, reflex: 30, soul: 40, mind: 10, voice: 70 },
		originPerk: 'Firebrand',
		armor: 'light',
		weapons: [
			{ ...shortbow, id: 'flame-scroll-shortbow', name: 'Flame-scroll Shortbow' },
			{
				id: 'shortsword',
				name: 'Shortsword',
				stat: 'reflex',
				rank: 'near',
				momentum: 2,
				damageDice: 0,
				damageBonus: 'modifier'
			}
		],
		features: [
			{
				id: 'hushing-flame',
				name: 'Hushing Flame',
				economy: 'action',
				description: 'Roll Voice to deal Flame damage.'
			},
			{
				id: 'bless',
				name: 'Bless',
				economy: 'ability',
				description: 'Lower your rolls through the next turn.'
			},
			{
				id: 'encouragement',
				name: 'Encouragement',
				economy: 'maneuver',
				description: 'Gain fallback momentum when no ally can use it.'
			},
			{
				id: 'tongues-of-fire',
				name: 'Tongues of Fire',
				economy: 'ability',
				description: 'Deal Voice modifier damage now and next turn.'
			}
		],
		passives: ['Firebrand', 'Tough Crowd'],
		deferredFeatures: ['Curse (GM momentum pool is deferred)']
	}
};

export function getClassKit(className: ClassName): ClassKit {
	return CLASS_KITS[className];
}
