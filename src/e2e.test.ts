import {
	describe, test, expect, beforeEach, afterEach,
} from 'vitest';
import type {
	JSONRPCMessage,
	JSONRPCRequest,
	JSONRPCResponse,
	ListToolsResult,
} from '@modelcontextprotocol/sdk/types.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {execSync, spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {createServer} from './server.js';

type MCPClient = {
	sendRequest: <T>(message: JSONRPCRequest) => Promise<T>;
	close: () => Promise<void>;
};

/**
 * Creates an MCP client that communicates with a spawned process via stdin/stdout
 */
function createProcessBasedClient(
	serverProcess: ReturnType<typeof spawn>,
	cleanup?: () => void,
): MCPClient {
	let requestId = 1;

	const pendingRequests = new Map<string, {resolve: (value: any) => void; reject: (error: any) => void}>();

	// Handle server responses
	serverProcess.stdout?.on('data', (data) => {
		const lines = data.toString().split('\n').filter((line: string) => line.trim());

		for (const line of lines) {
			try {
				const response = JSON.parse(line);
				if (response.id && pendingRequests.has(response.id)) {
					const {resolve, reject} = pendingRequests.get(response.id)!;
					pendingRequests.delete(response.id);
					if ('result' in response) {
						resolve(response.result);
					} else if ('error' in response) {
						reject(new Error(response.error.message || 'Unknown error'));
					}
				}
			} catch {
				// Ignore non-JSON lines
			}
		}
	});

	const sendRequest = async <T>(message: JSONRPCRequest): Promise<T> => {
		return new Promise((resolve, reject) => {
			// eslint-disable-next-line no-plusplus
			const id = (requestId++).toString();
			const requestWithId = {...message, id};

			pendingRequests.set(id, {resolve: resolve as any, reject: reject as any});

			try {
				serverProcess.stdin?.write(`${JSON.stringify(requestWithId)}\n`);
			} catch (e: unknown) {
				pendingRequests.delete(id);
				reject(e instanceof Error ? e : new Error(String(e)));
			}

			// Timeout
			setTimeout(() => {
				if (pendingRequests.has(id)) {
					pendingRequests.delete(id);
					reject(new Error('Request timeout'));
				}
			}, 10_000);
		});
	};

	return {
		sendRequest,
		async close() {
			try {
				serverProcess.kill();
			} catch {
				// Process might already be dead
			}

			// Run any additional cleanup
			if (cleanup) {
				cleanup();
			}
		},
	};
}

/**
 * Main test suite that runs the same tests across different deployment methods
 */
describe.each([
	{
		name: 'InMemory Transport',
		condition: true,
		async createClient(): Promise<MCPClient> {
			const server = createServer();
			const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
			await server.connect(serverTransport);

			const sendRequest = async <T>(message: JSONRPCRequest): Promise<T> => {
				return new Promise((resolve, reject) => {
					clientTransport.onmessage = (response: JSONRPCMessage) => {
						const typedResponse = response as JSONRPCResponse;
						if ('result' in typedResponse) {
							resolve(typedResponse.result as T);
							return;
						}

						reject(new Error('No result in response'));
					};

					clientTransport.onerror = (err: Error) => {
						reject(err);
					};

					clientTransport.send(message).catch((err: unknown) => {
						reject(err instanceof Error ? err : new Error(String(err)));
					});
				});
			};

			return {
				sendRequest,
				close: async () => server.close(),
			};
		},
	},
	{
		name: 'DXT Package',
		condition: process.env.RUN_DXT_TEST,
		async createClient(): Promise<MCPClient> {
			// Build DXT package if it doesn't exist
			if (!existsSync('computer-use-mcp.dxt')) {
				execSync('./build-dxt.sh', {stdio: 'inherit'});
			}

			// Extract DXT package to test directory
			const testDir = 'test-dxt-client';
			execSync(`rm -rf ${testDir}`);
			execSync(`mkdir -p ${testDir} && unzip -q computer-use-mcp.dxt -d ${testDir}`);

			// Start the MCP server from the extracted DXT package
			const serverProcess = spawn('node', [path.join(testDir, 'dist/index.js')], {
				stdio: ['pipe', 'pipe', 'pipe'],
				env: {...process.env},
			});

			return createProcessBasedClient(
				serverProcess,
				() => {
					// Clean up test directory
					if (fs.existsSync(testDir)) {
						execSync(`rm -rf ${testDir}`);
					}
				},
			);
		},
	},
])('MCP Server Tests - $name', ({name, condition, createClient}) => {
	(condition ? describe : describe.skip)(`${name} Integration`, () => {
		let client: MCPClient;

		beforeEach(async () => {
			client = await createClient();
		}, 60_000);

		afterEach(async () => {
			if (client) {
				await client.close();
			}
		});

		test('should list available tools', async () => {
			const result = await client.sendRequest<ListToolsResult>({
				jsonrpc: '2.0',
				id: '1',
				method: 'tools/list',
				params: {},
			});

			expect(result.tools.map((t) => t.name)).toEqual([
				'computer',
			]);
			expect(result.tools[0]).toMatchObject({
				name: 'computer',
				description: expect.any(String),
				inputSchema: expect.objectContaining({
					type: 'object',
				}),
			});
		}, 30_000);
	});
});
