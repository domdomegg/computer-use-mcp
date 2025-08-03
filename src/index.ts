#!/usr/bin/env node
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {server} from './server.js';

// Start the server
async function main(): Promise<void> {
	try {
		const transport = new StdioServerTransport();
		await server.connect(transport);
		console.error('Computer Use MCP server running on stdio');
	} catch (error) {
		console.error('Failed to start server:', error);
		process.exit(1);
	}
}

main().catch((error: unknown) => {
	console.error('Server startup failed:', error);
	process.exit(1);
});
