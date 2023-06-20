import { SvelteKitAuth } from '@auth/sveltekit';
import type { SvelteKitAuthConfig } from '@auth/sveltekit';
import Twitch from '@auth/core/providers/twitch';
import { HOSTNAME, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } from '$env/static/private';
import type { Provider } from '@auth/core/providers';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

export const handle = SvelteKitAuth(authConfig);
