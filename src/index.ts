// Library exports for programmatic usage
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {ListToolsRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {getComputerToolDefinition, registerComputer} from './tools/computer.js';

export function createServer(): McpServer {
	const server = new McpServer({
		name: 'computer-use-mcp',
		version: '1.0.0',
	});

	registerComputer(server);

	// Codex CLI 0.60.1 can start this MCP but fails to convert the generated tool
	// metadata into an OpenAI tool when newer SDK-specific fields are present.
	// Serve a conservative tools/list payload for compatibility.
	server.server.setRequestHandler(ListToolsRequestSchema, () => ({
		tools: [getComputerToolDefinition()],
	}));

	return server;
}
