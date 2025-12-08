import {createServer} from '../server.js';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

export function initServer(): McpServer {
	return createServer();
}

export function setupSignalHandlers(cleanup: () => Promise<void>): void {
	process.on('SIGINT', async () => {
		await cleanup();
		process.exit(0);
	});
	process.on('SIGTERM', async () => {
		await cleanup();
		process.exit(0);
	});
}

export function handleStartupError(error: unknown): never {
	console.error('Server startup failed:', error);
	process.exit(1);
}
