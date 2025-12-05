import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
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
import sharp from 'sharp';
import {toKeys} from './xdotoolStringToKeys.js';

// Configure nut-js
mouse.config.autoDelayMs = 100;
mouse.config.mouseSpeed = 1000;
keyboard.config.autoDelayMs = 10;

// Create the server
export const server = new McpServer({
	name: 'computer-use-mcp',
	version: '1.0.0',
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

const actionDescription = `The action to perform. The available actions are:
* key: Press a key or key-combination on the keyboard.
* type: Type a string of text on the keyboard.
* get_cursor_position: Get the current (x, y) pixel coordinate of the cursor on the screen.
* mouse_move: Move the cursor to a specified (x, y) pixel coordinate on the screen.
* left_click: Click the left mouse button.
* left_click_drag: Click and drag the cursor to a specified (x, y) pixel coordinate on the screen.
* right_click: Click the right mouse button.
* middle_click: Click the middle mouse button.
* double_click: Double-click the left mouse button.
* get_screenshot: Take a screenshot of the screen.`;

const toolDescription = `Use a mouse and keyboard to interact with a computer, and take screenshots.
* This is an interface to a desktop GUI. You do not have access to a terminal or applications menu. You must click on desktop icons to start applications.
* Always prefer using keyboard shortcuts rather than clicking, where possible.
* If you see boxes with two letters in them, typing these letters will click that element. Use this instead of other shortcuts or clicking, where possible.
* Some applications may take time to start or process actions, so you may need to wait and take successive screenshots to see the results of your actions. E.g. if you click on Firefox and a window doesn't open, try taking another screenshot.
* Whenever you intend to move the cursor to click on an element like an icon, you should consult a screenshot to determine the coordinates of the element before moving the cursor.
* If you tried clicking on a program or link but it failed to load, even after waiting, try adjusting your cursor position so that the tip of the cursor visually falls on the element that you want to click.
* Make sure to click any buttons, links, icons, etc with the cursor tip in the center of the element. Don't click boxes on their edges unless asked.

Using the crosshair:
* Screenshots show a red crosshair at the current cursor position.
* After clicking, check where the crosshair appears vs your target. If it missed, adjust coordinates proportionally to the distance - start with large adjustments and refine. Avoid small incremental changes when the crosshair is far from the target (distances are often further than you expect).
* Consider display dimensions when estimating positions. E.g. if it's 90% to the bottom of the screen, the coordinates should reflect this.`;

// Register the computer tool
server.registerTool(
	'computer',
	{
		title: 'Computer Control',
		description: toolDescription,
		inputSchema: {
			action: ActionEnum.describe(actionDescription),
			coordinate: z.tuple([z.number(), z.number()]).optional().describe('(x, y): The x (pixels from the left edge) and y (pixels from the top edge) coordinates'),
			text: z.string().optional().describe('Text to type or key command to execute'),
		},
	},
	async ({action, coordinate, text}) => {
		// Validate coordinates are within display bounds
		if (coordinate) {
			const [x, y] = coordinate;
			const [width, height] = [await screen.width(), await screen.height()];
			if (x < 0 || x >= width || y < 0 || y >= height) {
				throw new Error(`Coordinates (${x}, ${y}) are outside display bounds of ${width}x${height}`);
			}
		}

		// Implement system actions using nut-js
		switch (action) {
			case 'key': {
				if (!text) {
					throw new Error('Text required for key');
				}

				const keys = toKeys(text);
				await keyboard.pressKey(...keys);
				await keyboard.releaseKey(...keys);

				return {
					content: [{type: 'text', text: `Pressed key: ${text}`}],
				};
			}

			case 'type': {
				if (!text) {
					throw new Error('Text required for type');
				}

				await keyboard.type(text);
				return {
					content: [{type: 'text', text: `Typed text: ${text}`}],
				};
			}

			case 'get_cursor_position': {
				const pos = await mouse.getPosition();
				return {
					content: [{type: 'text', text: JSON.stringify({x: pos.x, y: pos.y})}],
				};
			}

			case 'mouse_move': {
				if (!coordinate) {
					throw new Error('Coordinate required for mouse_move');
				}

				await mouse.setPosition(new Point(coordinate[0], coordinate[1]));
				return {
					content: [{type: 'text', text: `Moved cursor to: (${coordinate[0]}, ${coordinate[1]})`}],
				};
			}

			case 'left_click': {
				if (coordinate) {
					await mouse.setPosition(new Point(coordinate[0], coordinate[1]));
				}

				await mouse.leftClick();
				return {
					content: [{type: 'text', text: 'Left clicked'}],
				};
			}

			case 'left_click_drag': {
				if (!coordinate) {
					throw new Error('Coordinate required for left_click_drag');
				}

				await mouse.pressButton(Button.LEFT);
				await mouse.setPosition(new Point(coordinate[0], coordinate[1]));
				await mouse.releaseButton(Button.LEFT);
				return {
					content: [{type: 'text', text: `Dragged to: (${coordinate[0]}, ${coordinate[1]})`}],
				};
			}

			case 'right_click': {
				if (coordinate) {
					await mouse.setPosition(new Point(coordinate[0], coordinate[1]));
				}

				await mouse.rightClick();
				return {
					content: [{type: 'text', text: 'Right clicked'}],
				};
			}

			case 'middle_click': {
				if (coordinate) {
					await mouse.setPosition(new Point(coordinate[0], coordinate[1]));
				}

				await mouse.click(Button.MIDDLE);
				return {
					content: [{type: 'text', text: 'Middle clicked'}],
				};
			}

			case 'double_click': {
				if (coordinate) {
					await mouse.setPosition(new Point(coordinate[0], coordinate[1]));
				}

				await mouse.doubleClick(Button.LEFT);
				return {
					content: [{type: 'text', text: 'Double clicked'}],
				};
			}

			case 'get_screenshot': {
				// Wait a bit to let things load before showing it to Claude
				await setTimeout(1000);

				// Get logical screen dimensions (what mouse coordinates use)
				const logicalWidth = await screen.width();
				const logicalHeight = await screen.height();

				// Get cursor position in logical coordinates
				const cursorPos = await mouse.getPosition();

				// Capture the entire screen (may be at Retina resolution)
				const image = imageToJimp(await screen.grab());
				const [capturedWidth, capturedHeight] = [image.getWidth(), image.getHeight()];

				// Calculate scale from captured to logical (for cursor positioning)
				const captureToLogicalScale = logicalWidth / capturedWidth;

				// Resize if high definition, to fit size limits
				let imageScaleFactor = 1;
				if (capturedWidth * capturedHeight > 1366 * 768) {
					imageScaleFactor = Math.sqrt((1366 * 768) / (capturedWidth * capturedHeight));
					const newWidth = Math.floor(capturedWidth * imageScaleFactor);
					const newHeight = Math.floor(capturedHeight * imageScaleFactor);
					image.resize(newWidth, newHeight);
				}

				// Calculate cursor position in the resized image coordinates
				// cursor logical -> cursor in captured -> cursor in resized image
				const cursorInImageX = Math.floor((cursorPos.x / captureToLogicalScale) * imageScaleFactor);
				const cursorInImageY = Math.floor((cursorPos.y / captureToLogicalScale) * imageScaleFactor);

				// Draw a crosshair at cursor position (red color)
				const crosshairSize = 20;
				const crosshairColor = 0xFF0000FF; // Red with full opacity (RGBA)
				const imageWidth = image.getWidth();
				const imageHeight = image.getHeight();

				// Draw horizontal line
				for (let x = Math.max(0, cursorInImageX - crosshairSize); x <= Math.min(imageWidth - 1, cursorInImageX + crosshairSize); x++) {
					if (cursorInImageY >= 0 && cursorInImageY < imageHeight) {
						image.setPixelColor(crosshairColor, x, cursorInImageY);
						// Make it thicker
						if (cursorInImageY > 0) {
							image.setPixelColor(crosshairColor, x, cursorInImageY - 1);
						}

						if (cursorInImageY < imageHeight - 1) {
							image.setPixelColor(crosshairColor, x, cursorInImageY + 1);
						}
					}
				}

				// Draw vertical line
				for (let y = Math.max(0, cursorInImageY - crosshairSize); y <= Math.min(imageHeight - 1, cursorInImageY + crosshairSize); y++) {
					if (cursorInImageX >= 0 && cursorInImageX < imageWidth) {
						image.setPixelColor(crosshairColor, cursorInImageX, y);
						// Make it thicker
						if (cursorInImageX > 0) {
							image.setPixelColor(crosshairColor, cursorInImageX - 1, y);
						}

						if (cursorInImageX < imageWidth - 1) {
							image.setPixelColor(crosshairColor, cursorInImageX + 1, y);
						}
					}
				}

				// Get PNG buffer from Jimp
				const pngBuffer = await image.getBufferAsync('image/png');

				// Compress PNG using sharp, to fit size limits
				const optimizedBuffer = await sharp(pngBuffer)
					.png({quality: 80, compressionLevel: 9})
					.toBuffer();

				// Convert optimized buffer to base64
				const base64Data = optimizedBuffer.toString('base64');

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify({
								// Report logical dimensions - these match mouse coordinate space
								display_width_px: logicalWidth,
								display_height_px: logicalHeight,
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
		}
	},
);

// Error handling
process.on('SIGINT', async () => {
	await server.close();
	process.exit(0);
});

process.on('SIGTERM', async () => {
	await server.close();
	process.exit(0);
});
