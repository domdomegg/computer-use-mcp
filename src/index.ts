// Library exports for programmatic usage
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerAll} from './tools/index.js';

export function createServer(): McpServer {
	const server = new McpServer({
		name: 'computer-use-mcp',
		version: '1.0.0',
	});

	registerAll(server);

	return server;
}
