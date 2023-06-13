import { SvelteKitAuth } from '@auth/sveltekit';
import type { SvelteKitAuthConfig } from '@auth/sveltekit';
import Twitch from '@auth/core/providers/twitch';
import { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } from '$env/static/private';

export const authConfig: SvelteKitAuthConfig = {
	providers: [
    //@ts-ignore
		Twitch({
			clientId: TWITCH_CLIENT_ID,
			clientSecret: TWITCH_CLIENT_SECRET,
		})
	]
};

export const handle = SvelteKitAuth(authConfig);
