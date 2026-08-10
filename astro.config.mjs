// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	// When you get a custom domain, change this to e.g. 'https://chrisgks.com'
	site: 'https://chrisgks.github.io',
	integrations: [mdx(), sitemap()],
	fonts: [
		// Body — a literary book serif with proper italics (the fable is full of them).
		{
			provider: fontProviders.google(),
			name: 'Newsreader',
			cssVariable: '--font-body',
			weights: [400, 500, 600],
			styles: ['normal', 'italic'],
			fallbacks: ['Georgia', 'Cambria', 'serif'],
		},
		// Display — title and chapter headings.
		{
			provider: fontProviders.google(),
			name: 'Fraunces',
			cssVariable: '--font-display',
			weights: [400, 600, 700],
			styles: ['normal', 'italic'],
			fallbacks: ['Georgia', 'serif'],
		},
	],
});
