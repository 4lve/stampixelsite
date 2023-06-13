import type { PluginOption } from 'vite';
import injectSocketIO from './src/lib/server/socket';

export const webSocketServer: PluginOption = {
	name: 'webSocketServer',
	configureServer(server) {
		if (!server.httpServer) {
			throw new Error('No httpServer found');
		}
		injectSocketIO(server.httpServer);
	}
};
