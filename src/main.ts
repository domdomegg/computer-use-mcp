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
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
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

(async () => {
	const transport = process.env.MCP_TRANSPORT || 'stdio';

	if (transport === 'stdio') {
		const server = createServer();
		setupSignalHandlers(async () => server.close());

		const stdioTransport = new StdioServerTransport();
		await server.connect(stdioTransport);
		console.error('Computer Use MCP server running on stdio');
	} else if (transport === 'http') {
		const app = express();
		app.use(express.json());

		// Stateless: fresh server + transport per request — sharing either misroutes responses on concurrent requests with colliding JSON-RPC IDs (GHSA-345p-7cg4-v4c7).
		app.post('/mcp', async (req, res) => {
			const server = createServer();
			const httpTransport = new StreamableHTTPServerTransport({
				sessionIdGenerator: undefined,
				enableJsonResponse: true,
			});
			res.on('close', () => {
				void server.close();
			});
			await server.connect(httpTransport);
			await httpTransport.handleRequest(req, res, req.body);
		});

		const port = parseInt(process.env.PORT || '3000', 10);
		const httpServer = app.listen(port, () => {
			console.error(`Computer Use MCP server running on http://localhost:${port}/mcp`);
			console.error('WARNING: HTTP transport has no authentication. Only use behind a reverse proxy or in a secured setup.');
		});

		setupSignalHandlers(async () => {
			httpServer.close();
		});
	} else {
		console.error(`Unknown transport: ${transport}. Use MCP_TRANSPORT=stdio or MCP_TRANSPORT=http`);
		process.exit(1);
	}
})();
