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
import {createServer} from './server.js';
import {setupSignalHandlers} from './transports/shared.js';

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

	const httpTransport = new StreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
	});

	app.post('/mcp', async (req, res) => {
		await httpTransport.handleRequest(req, res, req.body);
	});

	const handleSessionRequest = (_req: express.Request, res: express.Response) => {
		res.status(405).set('Allow', 'POST').json({error: 'Method Not Allowed'});
	};

	app.get('/mcp', handleSessionRequest);
	app.put('/mcp', handleSessionRequest);
	app.patch('/mcp', handleSessionRequest);
	app.delete('/mcp', handleSessionRequest);

	const server = createServer();
	await server.connect(httpTransport);

	const port = parseInt(process.env.PORT || '3000', 10);
	const httpServer = app.listen(port, () => {
		console.error(`Computer Use MCP server running on http://localhost:${port}/mcp`);
		console.error('WARNING: HTTP transport has no authentication. Only use behind a reverse proxy or in a secured setup.');
	});

	setupSignalHandlers(async () => {
		await server.close();
		httpServer.close();
	});
} else {
	console.error(`Unknown transport: ${transport}. Use MCP_TRANSPORT=stdio or MCP_TRANSPORT=http`);
	process.exit(1);
}
