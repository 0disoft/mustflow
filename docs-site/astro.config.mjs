// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { starlightOptions } from './src/config/starlight.mjs';
import { site } from './src/config/site.mjs';

// https://astro.build/config
export default defineConfig({
	site: site.url,
	base: site.base,
	integrations: [starlight(starlightOptions)],
});
