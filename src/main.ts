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
import {initServer, setupSignalHandlers, handleStartupError} from './transports/shared.js';

const transport = process.env.MCP_TRANSPORT || 'stdio';

if (transport === 'stdio') {
	const server = initServer();
	setupSignalHandlers(async () => server.close());

	const stdioTransport = new StdioServerTransport();
	await server.connect(stdioTransport);
	console.error('Computer Use MCP server running on stdio');
} else if (transport === 'http') {
	const app = express();
	app.use(express.json());

	// Store transports by session ID for session management
	const transports = new Map<string, StreamableHTTPServerTransport>();

	app.all('/mcp', async (req, res) => {
		// Get or create session ID
		const sessionId = req.headers['mcp-session-id'] as string | undefined;

		// Handle session initialization (POST without session ID)
		if (req.method === 'POST' && !sessionId) {
			const server = initServer();
			const httpTransport = new StreamableHTTPServerTransport({sessionIdGenerator: () => crypto.randomUUID()});

			httpTransport.onclose = () => {
				const sid = httpTransport.sessionId;
				if (sid) {
					transports.delete(sid);
				}
			};

			await server.connect(httpTransport);
			transports.set(httpTransport.sessionId!, httpTransport);
			await httpTransport.handleRequest(req, res);
			return;
		}

		// Handle existing session requests
		if (sessionId) {
			const existingTransport = transports.get(sessionId);
			if (existingTransport) {
				await existingTransport.handleRequest(req, res);
				return;
			}
		}

		// No valid session
		res.status(400).json({error: 'Invalid or missing session'});
	});

	const port = parseInt(process.env.PORT || '3000', 10);
	const httpServer = app.listen(port, () => {
		console.error(`Computer Use MCP server running on HTTP port ${port}`);
		console.error('WARNING: HTTP transport has no authentication. Only use behind a reverse proxy or in a secured setup.');
	});

	setupSignalHandlers(async () => {
		// Close all active transports
		await Promise.all([...transports.values()].map(async (t) => t.close()));
		transports.clear();
		httpServer.close();
	});
} else {
	handleStartupError(new Error(`Unknown transport: ${transport}. Use MCP_TRANSPORT=stdio or MCP_TRANSPORT=http`));
}
