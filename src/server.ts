import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {z} from 'zod';
import {
	mouse,
	keyboard,
	Point,
	screen,
	Button,
	imageToJimp,
} from '@nut-tree-fork/nut-js';
import {setTimeout} from 'node:timers/promises';
import imageminPngquant from 'imagemin-pngquant';
import {toKeys} from './xdotoolStringToKeys.js';

// Configure nut-js
mouse.config.autoDelayMs = 100;
mouse.config.mouseSpeed = 1000;
keyboard.config.autoDelayMs = 10;

// Create the server
export const server = new Server({
	name: 'computer-use-mcp',
	version: '1.0.0',
}, {
	capabilities: {
		tools: {},
	},
});

// Define the action enum values
const ActionEnum = z.enum([
	'key',
	'type',
	'mouse_move',
	'left_click',
	'left_click_drag',
	'right_click',
	'middle_click',
	'double_click',
	'get_screenshot',
	'get_cursor_position',
]);

// Computer control tool parameters
const computerToolParams = z.object({
	action: ActionEnum,
	coordinate: z.tuple([z.number(), z.number()]).optional(),
	text: z.string().optional(),
});

// Define the computer tool
const computerTool: Tool = {
	name: 'computer',
	description: `Use a mouse and keyboard to interact with a computer, and take screenshots.
* This is an interface to a desktop GUI. You do not have access to a terminal or applications menu. You must click on desktop icons to start applications.
* Always prefer using keyboard shortcuts rather than clicking, where possible.
* If you see boxes with two letters in them, typing these letters will click that element. Use this instead of other shortcuts or clicking, where possible.
* Some applications may take time to start or process actions, so you may need to wait and take successive screenshots to see the results of your actions. E.g. if you click on Firefox and a window doesn't open, try taking another screenshot.
* Whenever you intend to move the cursor to click on an element like an icon, you should consult a screenshot to determine the coordinates of the element before moving the cursor.
* If you tried clicking on a program or link but it failed to load, even after waiting, try adjusting your cursor position so that the tip of the cursor visually falls on the element that you want to click.
* Make sure to click any buttons, links, icons, etc with the cursor tip in the center of the element. Don't click boxes on their edges unless asked.`,
	inputSchema: {
		type: 'object',
		properties: {
			action: {
				type: 'string',
				enum: [
					'key',
					'type',
					'mouse_move',
					'left_click',
					'left_click_drag',
					'right_click',
					'middle_click',
					'double_click',
					'get_screenshot',
					'get_cursor_position',
				],
				description: `The action to perform. The available actions are:
* key: Press a key or key-combination on the keyboard.
* type: Type a string of text on the keyboard.
* get_cursor_position: Get the current (x, y) pixel coordinate of the cursor on the screen.
* mouse_move: Move the cursor to a specified (x, y) pixel coordinate on the screen.
* left_click: Click the left mouse button.
* left_click_drag: Click and drag the cursor to a specified (x, y) pixel coordinate on the screen.
* right_click: Click the right mouse button.
* middle_click: Click the middle mouse button.
* double_click: Double-click the left mouse button.
* get_screenshot: Take a screenshot of the screen.`,
			},
			coordinate: {
				type: 'array',
				items: {type: 'number'},
				minItems: 2,
				maxItems: 2,
				description: '(x, y): The x (pixels from the left edge) and y (pixels from the top edge) coordinates',
			},
			text: {
				type: 'string',
				description: 'Text to type or key command to execute',
			},
		},
		required: ['action'],
	},
};

// Handle tool list requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
	return {
		tools: [computerTool],
	};
});

// Handle tool execution requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const {name, arguments: args} = request.params;

	if (name !== 'computer') {
		throw new Error(`Unknown tool: ${name}`);
	}

	// Validate arguments
	const validatedArgs = computerToolParams.parse(args);

	// Validate coordinates are within display bounds
	if (validatedArgs.coordinate) {
		const [x, y] = validatedArgs.coordinate;
		const [width, height] = [await screen.width(), await screen.height()];
		if (x < 0 || x >= width || y < 0 || y >= height) {
			throw new Error(`Coordinates (${x}, ${y}) are outside display bounds of ${width}x${height}`);
		}
	}

	// Implement system actions using nut-js
	switch (validatedArgs.action) {
		case 'key': {
			if (!validatedArgs.text) {
				throw new Error('Text required for key');
			}

			const keys = toKeys(validatedArgs.text);
			await keyboard.pressKey(...keys);
			await keyboard.releaseKey(...keys);

			return {
				content: [{type: 'text', text: `Pressed key: ${validatedArgs.text}`}],
			};
		}

		case 'type': {
			if (!validatedArgs.text) {
				throw new Error('Text required for type');
			}

			await keyboard.type(validatedArgs.text);
			return {
				content: [{type: 'text', text: `Typed text: ${validatedArgs.text}`}],
			};
		}

		case 'get_cursor_position': {
			const pos = await mouse.getPosition();
			return {
				content: [{type: 'text', text: JSON.stringify({x: pos.x, y: pos.y})}],
			};
		}

		case 'mouse_move': {
			if (!validatedArgs.coordinate) {
				throw new Error('Coordinate required for mouse_move');
			}

			await mouse.setPosition(new Point(validatedArgs.coordinate[0], validatedArgs.coordinate[1]));
			return {
				content: [{type: 'text', text: `Moved cursor to: (${validatedArgs.coordinate[0]}, ${validatedArgs.coordinate[1]})`}],
			};
		}

		case 'left_click': {
			if (validatedArgs.coordinate) {
				await mouse.setPosition(new Point(validatedArgs.coordinate[0], validatedArgs.coordinate[1]));
			}

			await mouse.leftClick();
			return {
				content: [{type: 'text', text: 'Left clicked'}],
			};
		}

		case 'left_click_drag': {
			if (!validatedArgs.coordinate) {
				throw new Error('Coordinate required for left_click_drag');
			}

			await mouse.pressButton(Button.LEFT);
			await mouse.setPosition(new Point(validatedArgs.coordinate[0], validatedArgs.coordinate[1]));
			await mouse.releaseButton(Button.LEFT);
			return {
				content: [{type: 'text', text: `Dragged to: (${validatedArgs.coordinate[0]}, ${validatedArgs.coordinate[1]})`}],
			};
		}

		case 'right_click': {
			if (validatedArgs.coordinate) {
				await mouse.setPosition(new Point(validatedArgs.coordinate[0], validatedArgs.coordinate[1]));
			}

			await mouse.rightClick();
			return {
				content: [{type: 'text', text: 'Right clicked'}],
			};
		}

		case 'middle_click': {
			if (validatedArgs.coordinate) {
				await mouse.setPosition(new Point(validatedArgs.coordinate[0], validatedArgs.coordinate[1]));
			}

			await mouse.click(Button.MIDDLE);
			return {
				content: [{type: 'text', text: 'Middle clicked'}],
			};
		}

		case 'double_click': {
			if (validatedArgs.coordinate) {
				await mouse.setPosition(new Point(validatedArgs.coordinate[0], validatedArgs.coordinate[1]));
			}

			await mouse.doubleClick(Button.LEFT);
			return {
				content: [{type: 'text', text: 'Double clicked'}],
			};
		}

		case 'get_screenshot': {
			// Wait a couple of seconds - helps to let things load before showing it to Claude
			await setTimeout(1000);

			// Capture the entire screen
			const image = imageToJimp(await screen.grab());
			const [originalWidth, originalHeight] = [image.getWidth(), image.getHeight()];

			// Resize if high definition, to fit size limits
			if (originalWidth * originalHeight > 1366 * 768) {
				const scaleFactor = Math.sqrt((1366 * 768) / (originalWidth * originalHeight));
				const newWidth = Math.floor(originalWidth * scaleFactor);
				const newHeight = Math.floor(originalHeight * scaleFactor);
				image.resize(newWidth, newHeight);
			}

			// Get PNG buffer from Jimp
			const pngBuffer = await image.getBufferAsync('image/png');

			// Compress PNG using imagemin, to fit size limits
			const optimizedBuffer = await imageminPngquant()(new Uint8Array(pngBuffer));

			// Convert optimized buffer to base64
			const base64Data = Buffer.from(optimizedBuffer).toString('base64');

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							display_width_px: originalWidth,
							display_height_px: originalHeight,
						}),
					},
					{
						type: 'image',
						data: base64Data,
						mimeType: 'image/png',
					},
				],
			};
		}

		// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
		default: {
			throw new Error(`Unknown action: ${validatedArgs.action satisfies never as string}`);
		}
	}
});

// Error handling
process.on('SIGINT', async () => {
	await server.close();
	process.exit(0);
});

process.on('SIGTERM', async () => {
	await server.close();
	process.exit(0);
});
