import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIRECTORY = resolve(ROOT, 'docs/game-rules/sections');
const MANIFEST_PATH = resolve(ROOT, 'docs/game-rules/source-manifest.json');
const PINNED = {
	documentId: '1JTO4JWvfuGg8itgcIA0ffoL_5BAZpKo93J2hgp-Oe3I',
	title: 'Fivefold (v0.8.5 Beta)',
	sourceUrl:
		'https://docs.google.com/document/d/1JTO4JWvfuGg8itgcIA0ffoL_5BAZpKo93J2hgp-Oe3I/edit?tab=t.0',
	tabId: 't.0',
	modifiedTime: '2026-06-30T05:45:19.904Z',
	importedAt: '2026-07-29T17:45:00.000Z',
	byteCount: 217152,
	sha256: '0a2b64f9ad9e83b3916152e6e4928ec6824c594e63987371ec970ee7ea77cadd'
};

const SECTIONS = [
	{
		order: 0,
		title: 'Changelog',
		slug: 'changelog',
		sourceHeading: '# CHANGELOG',
		boundary: '# Fivefold\n\n# CHANGELOG',
		filename: '00-changelog.md'
	},
	{
		order: 1,
		title: 'Basic Rules',
		slug: 'basic-rules',
		sourceHeading: '# **BASIC RULES**',
		boundary: '# Fivefold\n\n# **BASIC RULES**',
		filename: '01-basic-rules.md'
	},
	{
		order: 2,
		title: 'Combat Rules',
		slug: 'combat-rules',
		sourceHeading: '# COMBAT RULES',
		boundary: '# COMBAT RULES',
		filename: '02-combat-rules.md'
	},
	{
		order: 3,
		title: 'Conditions',
		slug: 'conditions',
		sourceHeading: '# **CONDITIONS**',
		boundary: '# **CONDITIONS**',
		filename: '03-conditions.md'
	},
	{
		order: 4,
		title: 'Survival',
		slug: 'survival',
		sourceHeading: '# SURVIVAL',
		boundary: '# SURVIVAL',
		filename: '04-survival.md'
	},
	{
		order: 5,
		title: 'Hexes & Travel',
		slug: 'hexes-and-travel',
		sourceHeading: '# HEXES & TRAVEL',
		boundary: '# HEXES & TRAVEL',
		filename: '05-hexes-and-travel.md'
	},
	{
		order: 6,
		title: 'Character Creation',
		slug: 'character-creation',
		sourceHeading: '# CHARACTER CREATION',
		boundary: '# CHARACTER CREATION',
		filename: '06-character-creation.md'
	},
	{
		order: 7,
		title: 'Species',
		slug: 'species',
		sourceHeading: '# SPECIES',
		boundary: '# SPECIES',
		filename: '07-species.md'
	},
	{
		order: 8,
		title: 'Vices & Sin',
		slug: 'vices-and-sin',
		sourceHeading: '# VICES & SIN',
		boundary: '# VICES & SIN',
		filename: '08-vices-and-sin.md'
	},
	{
		order: 9,
		title: 'Background & Calling',
		slug: 'background-and-calling',
		sourceHeading: '# BACKGROUND & CALLING',
		boundary: '# BACKGROUND & CALLING',
		filename: '09-background-and-calling.md'
	},
	{
		order: 10,
		title: 'Classes, Perks & Advancement',
		slug: 'classes-perks-and-advancement',
		sourceHeading: '# CLASSES, PERKS & ADVANCEMENT',
		boundary: '# CLASSES, PERKS & ADVANCEMENT',
		filename: '10-classes-perks-and-advancement.md'
	},
	{
		order: 11,
		title: 'Perks',
		slug: 'perks',
		sourceHeading: '# PERKS',
		boundary: '# PERKS',
		filename: '11-perks.md'
	},
	{
		order: 12,
		title: 'Triumphs & Fame',
		slug: 'triumphs-and-fame',
		sourceHeading: '# TRIUMPHS & FAME',
		boundary: '# TRIUMPHS & FAME',
		filename: '12-triumphs-and-fame.md'
	},
	{
		order: 13,
		title: 'Items, Gold, & Gear',
		slug: 'items-gold-and-gear',
		sourceHeading: '# ITEMS, GOLD, & GEAR',
		boundary: '# ITEMS, GOLD, & GEAR',
		filename: '13-items-gold-and-gear.md'
	},
	{
		order: 14,
		title: 'The World',
		slug: 'the-world',
		sourceHeading: '# THE WORLD',
		boundary: '# THE WORLD',
		filename: '14-the-world.md'
	},
	{
		order: 15,
		title: 'Bestiary',
		slug: 'bestiary',
		sourceHeading: '# BEASTIARY',
		boundary: '# BEASTIARY',
		filename: '15-bestiary.md'
	},
	{
		order: 16,
		title: 'St Bozma’s Tomb',
		slug: 'st-bozmas-tomb',
		sourceHeading: '# ST BOZMA’S TOMB',
		boundary: '# ST BOZMA’S TOMB',
		filename: '16-st-bozmas-tomb.md'
	}
];

function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

function lineAt(source, byteOffset) {
	return source.subarray(0, byteOffset).toString('utf8').split('\n').length;
}

function locateSections(source) {
	const offsets = SECTIONS.map((section) => {
		const marker = Buffer.from(section.boundary);
		const first = source.indexOf(marker);
		const second = first < 0 ? -1 : source.indexOf(marker, first + marker.length);
		if (first < 0) throw new Error(`Missing required boundary: ${section.boundary}`);
		if (second >= 0) throw new Error(`Duplicate required boundary: ${section.boundary}`);
		return first;
	});

	if (offsets[0] !== 0) throw new Error('The changelog must begin at byte 0.');
	for (let index = 1; index < offsets.length; index += 1) {
		if (offsets[index] <= offsets[index - 1]) {
			throw new Error(`Section boundaries are reordered at ${SECTIONS[index].title}.`);
		}
	}

	return SECTIONS.map((section, index) => {
		const start = offsets[index];
		const end = offsets[index + 1] ?? source.length;
		const bytes = source.subarray(start, end);
		if (bytes.length === 0) throw new Error(`Empty section: ${section.title}`);
		return { ...section, start, end, bytes };
	});
}

async function main() {
	const args = process.argv.slice(2);
	const verifyOnly = args.includes('--verify');
	const sourceArg = args.find((arg) => !arg.startsWith('--'));
	if (!sourceArg) {
		throw new Error('Usage: node scripts/import-game-rules.mjs <export.md> [--verify]');
	}

	const sourcePath = resolve(process.cwd(), sourceArg);
	const source = await readFile(sourcePath);
	if (source.length !== PINNED.byteCount) {
		throw new Error(
			`Export byte count changed: expected ${PINNED.byteCount}, got ${source.length}.`
		);
	}
	const sourceHash = sha256(source);
	if (sourceHash !== PINNED.sha256) {
		throw new Error(`Export SHA-256 changed: expected ${PINNED.sha256}, got ${sourceHash}.`);
	}

	const sections = locateSections(source);
	const manifest = {
		documentId: PINNED.documentId,
		title: PINNED.title,
		sourceUrl: PINNED.sourceUrl,
		modifiedTime: PINNED.modifiedTime,
		importedAt: PINNED.importedAt,
		splitAt: PINNED.importedAt,
		splitStrategy: 'ordered-byte-boundaries',
		export: {
			format: 'text/markdown',
			byteCount: source.length,
			sha256: sourceHash
		},
		tabs: [
			{
				tabId: PINNED.tabId,
				title: 'Fivefold',
				format: 'text/markdown',
				sourceCanonical: true,
				splitOutputDirectory: 'docs/game-rules/sections'
			}
		],
		sections: sections.map((section) => ({
			order: section.order,
			title: section.title,
			slug: section.slug,
			sourceHeading: section.sourceHeading,
			sourceLineStart: lineAt(source, section.start),
			sourceLineEnd: lineAt(source, section.end) - (section.end < source.length ? 1 : 0),
			sourceByteStart: section.start,
			sourceByteEndExclusive: section.end,
			byteCount: section.bytes.length,
			sha256: sha256(section.bytes),
			outputPath: `docs/game-rules/sections/${section.filename}`,
			sourceCanonical: true
		}))
	};
	const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, '\t')}\n`);

	if (verifyOnly) {
		for (const section of sections) {
			const actual = await readFile(resolve(OUTPUT_DIRECTORY, section.filename));
			if (!actual.equals(section.bytes))
				throw new Error(`${section.filename} does not match export.`);
		}
		const actualManifest = await readFile(MANIFEST_PATH);
		if (!actualManifest.equals(manifestBytes)) throw new Error('source-manifest.json is stale.');
		console.log(`Verified ${sections.length} sections against ${sourceHash}.`);
		return;
	}

	await mkdir(OUTPUT_DIRECTORY, { recursive: true });
	for (const section of sections) {
		await writeFile(resolve(OUTPUT_DIRECTORY, section.filename), section.bytes);
	}
	await writeFile(MANIFEST_PATH, manifestBytes);
	console.log(`Imported ${sections.length} sections from ${sourceHash}.`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
