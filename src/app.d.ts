// See https://kit.svelte.dev/docs/types#app

import type { Session } from '@auth/core/types';
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}

	interface Pixel {
		x: number;
		y: number;
		color: string;
	}

	interface ClientToServerEvents {
		setPixel: (data: Pixel, callback: (message: string, success: boolean) => void) => void;
	}

	interface ServerToClientEvents {
		setPixel: (data: Pixel) => void;
		setBoard: (board: { [pos: string]: string }) => void;
		balance: (balance: number) => void;
	}

	interface SocketData {
		session: Session | null;
	}
}

export {};
