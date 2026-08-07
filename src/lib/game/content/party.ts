import { CLASS_KITS } from './classes';
import type { ClassName, Rank } from '../model';

export const PARTY_TEMPLATE_IDS = [
	'warrior-corren',
	'scout-nyra',
	'priest-odelle',
	'magi-sevrin',
	'versant-mara'
] as const;

export type PartyTemplateId = (typeof PARTY_TEMPLATE_IDS)[number];

export interface PartyTemplate {
	templateId: PartyTemplateId;
	name: string;
	identity: string;
	role: string;
	className: ClassName;
	defaultRank: Rank;
	signatureFeature: string;
	source: string;
	classification: 'canonical' | 'adaptation';
}

export const PARTY_TEMPLATES: Record<PartyTemplateId, PartyTemplate> = {
	'warrior-corren': {
		templateId: 'warrior-corren',
		name: 'Corren Vey',
		identity: 'A scarred shrine-guard who refuses to yield ground.',
		role: 'Front-line protection and control',
		className: 'Warrior',
		defaultRank: 'near',
		signatureFeature: 'Threatening Strike',
		source: 'docs/game-rules/sections/10-classes-perks-and-advancement.md',
		classification: 'adaptation'
	},
	'scout-nyra': {
		templateId: 'scout-nyra',
		name: 'Nyra Pell',
		identity: 'A tomb-runner who reads broken trails like scripture.',
		role: 'Mobile precision',
		className: 'Scout',
		defaultRank: 'far',
		signatureFeature: 'Surprise Attack',
		source: 'docs/game-rules/sections/10-classes-perks-and-advancement.md',
		classification: 'adaptation'
	},
	'priest-odelle': {
		templateId: 'priest-odelle',
		name: 'Sister Odelle',
		identity: 'A grave-priest carrying mercy into unquiet places.',
		role: 'Recovery and support',
		className: 'Priest',
		defaultRank: 'far',
		signatureFeature: 'Prayer of Healing',
		source: 'docs/game-rules/sections/10-classes-perks-and-advancement.md',
		classification: 'adaptation'
	},
	'magi-sevrin': {
		templateId: 'magi-sevrin',
		name: 'Sevrin Ash',
		identity: 'An occult scholar counting every omen twice.',
		role: 'Occult control and damage',
		className: 'Magi',
		defaultRank: 'far',
		signatureFeature: 'Black Cloud',
		source: 'docs/game-rules/sections/10-classes-perks-and-advancement.md',
		classification: 'adaptation'
	},
	'versant-mara': {
		templateId: 'versant-mara',
		name: 'Mara Vey',
		identity: 'A fire-tongued pilgrim who makes courage contagious.',
		role: 'Momentum, support, and damage',
		className: 'Versant',
		defaultRank: 'far',
		signatureFeature: 'Tongues of Fire',
		source: 'docs/game-rules/sections/10-classes-perks-and-advancement.md',
		classification: 'adaptation'
	}
};

export const PARTY_TEMPLATE_LIST = PARTY_TEMPLATE_IDS.map((id) => PARTY_TEMPLATES[id]);

export interface PartySelection {
	templateId: string;
	startingRank: Rank;
}

export function validatePartySelections(value: unknown): PartySelection[] {
	if (!Array.isArray(value) || value.length < 1 || value.length > 3) {
		throw new Error('Choose between one and three adventurers.');
	}
	const seenTemplates = new Set<string>();
	const seenClasses = new Set<ClassName>();
	return value.map((entry) => {
		if (!entry || typeof entry !== 'object') throw new Error('Invalid party selection.');
		const { templateId, startingRank } = entry as Record<string, unknown>;
		if (typeof templateId !== 'string' || !(templateId in PARTY_TEMPLATES)) {
			throw new Error('Choose only known adventurers.');
		}
		if (startingRank !== 'near' && startingRank !== 'far') {
			throw new Error('Every adventurer needs a legal starting rank.');
		}
		const template = PARTY_TEMPLATES[templateId as PartyTemplateId];
		if (seenTemplates.has(templateId) || seenClasses.has(template.className)) {
			throw new Error('Each adventurer and class may appear only once.');
		}
		seenTemplates.add(templateId);
		seenClasses.add(template.className);
		return { templateId, startingRank };
	});
}

export function partyTemplateKit(templateId: PartyTemplateId) {
	return CLASS_KITS[PARTY_TEMPLATES[templateId].className];
}
