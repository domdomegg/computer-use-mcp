#!/usr/bin/env node
import {execSync} from 'node:child_process';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

// Clear macOS quarantine attributes from native binaries before importing them
// This is needed for MCPB packages downloaded from the internet
if (process.platform === 'darwin') {
	try {
		const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
		execSync(`xattr -cr "${projectRoot}/node_modules"`, {stdio: 'ignore'});
	} catch {
		// Ignore errors - xattr may not exist or may fail on some files
	}
}

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
