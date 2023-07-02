import { SvelteKitAuth } from '@auth/sveltekit';
import type { SvelteKitAuthConfig } from '@auth/sveltekit';
import Twitch from '@auth/core/providers/twitch';
import { HOSTNAME, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } from '$env/static/private';
import type { Provider } from '@auth/core/providers';
import { PrismaAdapter } from '@auth/prisma-adapter';
import type { PrismaClient } from '@prisma/client';
import { getSession } from '@auth/sveltekit';

declare namespace global {
	let prisma: PrismaClient;
	let getSes: typeof getSession
	let authConfig: SvelteKitAuthConfig
}


const prisma = global.prisma

export const authConfig: SvelteKitAuthConfig = {
	adapter: PrismaAdapter(prisma),
	providers: [
		Twitch({
			clientId: TWITCH_CLIENT_ID,
			clientSecret: TWITCH_CLIENT_SECRET,
		}) as Provider
	],
	trustHost: true,
	redirectProxyUrl: `https://${HOSTNAME}/auth`,
};

global.getSes = getSession;
global.authConfig = authConfig;

export const handle = SvelteKitAuth(authConfig);
