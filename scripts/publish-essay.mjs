// Publish canonical essay drafts into the Astro blog content collection.
//
//   node scripts/publish-essay.mjs            # build once
//   node scripts/publish-essay.mjs --watch     # rebuild on every draft save
//
// The draft is the single source of truth. This script is the ONLY thing that
// writes into src/content/blog/, so the two never drift by hand again.

import { readFileSync, writeFileSync, watchFile, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../../../..'); // .../Exocortex

// One entry per published essay. Add more as the blog grows.
const ESSAYS = [
	{
		draft: resolve(repo, 'domains/writing/projects/essays/drafts/on-moths-godel-and-god.md'),
		out: resolve(here, '../src/content/blog/on-moths-godel-and-the-outside.md'),
		frontmatter: {
			title: 'On Moths, Gödel, and the Outside',
			description: 'A closed loop, and the only eye it has to look with is its own.',
			pubDate: '2026-06-16',
			heroImage: '/images/unique_origami_moth.webp',
			ogImage: '/images/og-moths.jpg',
		},
	},
	{
		draft: resolve(repo, 'domains/work/projects/kinnu-blogposts/posts/T2_belief-state-management.md'),
		out: resolve(here, '../src/content/blog/belief-state-management.md'),
		frontmatter: {
			title: 'Belief-State Management for Decision Systems',
			description: 'Why the policy isn’t the centre',
			pubDate: '2026-07-02',
			heroImage: '/images/belief_centre_origami.webp',
			ogImage: '/images/og-belief-state.jpg',
		},
		// Mermaid sources in the draft stay canonical (GitHub renders them);
		// the published page gets these pre-rendered SVGs, in order of appearance.
		mermaidImages: [
			{ src: '/images/figures/T2_belief_star.svg', alt: 'The belief at the centre; policy, projection, scoring, and generation all consume it' },
			{ src: '/images/figures/T2_seven_stage_loop.svg', alt: 'The seven-stage loop: observe, estimate, project, decide, generate, act, validate' },
		],
	},
];

function toFrontmatter(fm) {
	const lines = Object.entries(fm).map(([k, v]) => `${k}: '${String(v).replace(/'/g, "''")}'`);
	return `---\n${lines.join('\n')}\n---\n`;
}

function transform(raw, fm, essay = {}) {
	let lines = raw.split('\n');
	// Drop the leading H1 title (the layout renders the title from frontmatter).
	while (lines.length && lines[0].trim() === '') lines.shift();
	if (lines[0]?.startsWith('# ')) lines.shift();
	// Drop the markdown subtitle line (### *...*); we re-emit it centered below.
	while (lines.length && lines[0].trim() === '') lines.shift();
	if (lines[0]?.startsWith('### ')) lines.shift();
	while (lines.length && lines[0].trim() === '') lines.shift();
	// Drop the working-status italics line and the separator under it.
	if (lines[0]?.startsWith('_Status:')) lines.shift();
	while (lines.length && lines[0].trim() === '') lines.shift();
	if (lines[0]?.trim() === '---') lines.shift();

	let body = lines.join('\n');
	// Drop the trailing draft-notes block (everything from the last `---` if
	// it's followed by an `_Draft notes:` line).
	body = body.replace(/\n---\s*\n+_Draft notes:[\s\S]*$/, '\n');
	// Replace mermaid fences with their pre-rendered SVGs, in order.
	if (essay.mermaidImages?.length) {
		let mmdN = 0;
		body = body.replace(/```mermaid\n[\s\S]*?```/g, () => {
			const img = essay.mermaidImages[mmdN++];
			return img ? `![${img.alt}](${img.src})` : '';
		});
	}
	// Relative draft figure paths -> absolute paths served from /public.
	body = body.replace(/\]\(figures\//g, '](/images/figures/');
	// Relative draft image paths -> absolute paths served from /public.
	body = body.replace(/src="images\//g, 'src="/images/');
	// Serve the web-optimized WebP (full-res PNG masters stay in public/images).
	body = body.replace(/(src="\/images\/[^"]+)\.png"/g, '$1.webp"');
	// Lazy-load every image except the first (the lead moth, above the fold),
	// so the long gallery doesn't block the read.
	let imgN = 0;
	body = body.replace(/<img /g, () => {
		imgN += 1;
		return imgN === 1
			? '<img loading="eager" fetchpriority="high" decoding="async" '
			: '<img loading="lazy" decoding="async" ';
	});

	// The subtitle/description is rendered by the layout (under the title),
	// so it is intentionally not injected into the body here.
	return `${toFrontmatter(fm)}\n${body.replace(/\s*$/, '')}\n`;
}

function publishOne(essay) {
	// On CI (GitHub Actions) the external draft isn't present — the already-synced
	// copy in src/content/blog is committed, so just skip and let astro build it.
	if (!existsSync(essay.draft)) {
		console.log(`draft not found, using committed copy: ${essay.frontmatter.title}`);
		return;
	}
	const raw = readFileSync(essay.draft, 'utf8');
	writeFileSync(essay.out, transform(raw, essay.frontmatter, essay));
	const stamp = new Date().toISOString().slice(11, 19);
	console.log(`[${stamp}] published ${essay.frontmatter.title}`);
}

function publishAll() {
	for (const e of ESSAYS) {
		try {
			publishOne(e);
		} catch (err) {
			console.error(`failed: ${e.frontmatter.title} — ${err.message}`);
		}
	}
}

publishAll();

if (process.argv.includes('--watch')) {
	console.log('watching drafts for changes (polling, survives atomic saves)…');
	for (const e of ESSAYS) {
		// watchFile polls the path itself, so it keeps working even when the
		// editor replaces the file via write-temp-then-rename (Cursor/VS Code).
		watchFile(e.draft, { interval: 400 }, (curr, prev) => {
			if (curr.mtimeMs !== prev.mtimeMs) publishOne(e);
		});
	}
}
