import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { webSocketServer } from './webSocketPluginVite';

export default defineConfig({
	plugins: [sveltekit(), webSocketServer]
});
