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
import type {Transport} from '@modelcontextprotocol/sdk/shared/transport.js';
import {createServer} from './index.js';

function setupSignalHandlers(cleanup: () => Promise<void>): void {
	process.on('SIGINT', async () => {
		await cleanup();
		process.exit(0);
	});
	process.on('SIGTERM', async () => {
		await cleanup();
		process.exit(0);
	});
}

const transport = process.env.MCP_TRANSPORT || 'stdio';

if (transport !== 'stdio') {
	console.error(`Unsupported transport: ${transport}. computer-use-mcp only supports stdio. HTTP transport was removed because it exposed full control of the computer without authentication; to serve it over HTTP, put a stdio-to-HTTP proxy with authentication in front of it.`);
	process.exit(1);
}

(async () => {
	const server = createServer();
	setupSignalHandlers(async () => server.close());

	const stdioTransport = new StdioServerTransport();
	await server.connect(stdioTransport as Transport);
	console.error('Computer Use MCP server running on stdio');
})();
