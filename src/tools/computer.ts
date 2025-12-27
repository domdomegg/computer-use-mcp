import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
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
import {toKeys} from '../xdotoolStringToKeys.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

// Configure nut-js
mouse.config.autoDelayMs = 100;
mouse.config.mouseSpeed = 1000;
keyboard.config.autoDelayMs = 10;

// The Claude API automatically downsamples images larger than ~1.15MP or 1568px on the long edge.
// We already downsampled screenshots to fit these limits and reported the original screen
// dimensions via display_width_px/display_height_px, but Claude wasn't correctly using those
// reported dimensions - it was using coordinates from the downsampled image space directly.
// As a workaround, we now report the actual image dimensions and scale Claude's coordinates
// back up to logical screen coordinates.
// See: https://docs.anthropic.com/en/docs/build-with-claude/vision#evaluate-image-size
const maxLongEdge = 1568;
const maxPixels = 1.15 * 1024 * 1024; // 1.15 megapixels

/**
 * Calculate the scale factor to downsample an image to fit API limits.
 * Returns a value <= 1 representing how much to shrink the image.
 */
function getSizeToApiScale(width: number, height: number): number {
	const longEdge = Math.max(width, height);
	const totalPixels = width * height;

	const longEdgeScale = longEdge > maxLongEdge ? maxLongEdge / longEdge : 1;
	const pixelScale = totalPixels > maxPixels ? Math.sqrt(maxPixels / totalPixels) : 1;

	return Math.min(longEdgeScale, pixelScale);
}

/**
 * Get the scale factor from API image coordinates to logical screen coordinates.
 * This is the inverse of the downsampling we apply to fit API limits.
 */
async function getApiToLogicalScale(): Promise<number> {
	const logicalWidth = await screen.width();
	const logicalHeight = await screen.height();
	const apiScaleFactor = getSizeToApiScale(logicalWidth, logicalHeight);
	return 1 / apiScaleFactor;
}

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
	'scroll',
	'get_screenshot',
	'get_cursor_position',
]);

const actionDescription = `The action to perform. The available actions are:
* key: Press a key or key-combination on the keyboard.
* type: Type a string of text on the keyboard.
* get_cursor_position: Get the current (x, y) pixel coordinate of the cursor on the screen.
* mouse_move: Move the cursor to a specified (x, y) pixel coordinate on the screen.
* left_click: Click the left mouse button. If coordinate is provided, moves to that position first.
* left_click_drag: Click and drag the cursor to a specified (x, y) pixel coordinate on the screen.
* right_click: Click the right mouse button. If coordinate is provided, moves to that position first.
* middle_click: Click the middle mouse button. If coordinate is provided, moves to that position first.
* double_click: Double-click the left mouse button. If coordinate is provided, moves to that position first.
* scroll: Scroll the screen in a specified direction. Requires coordinate (moves there first) and text parameter with direction: "up", "down", "left", or "right". Optionally append ":N" to scroll N pixels (default 300), e.g. "down:500".
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

export function registerComputer(server: McpServer): void {
	server.registerTool(
		'computer',
		{
			title: 'Computer Control',
			description: toolDescription,
			inputSchema: strictSchemaWithAliases(
				{
					action: ActionEnum.describe(actionDescription),
					coordinate: z.tuple([z.number(), z.number()]).optional().describe('(x, y): The x (pixels from the left edge) and y (pixels from the top edge) coordinates'),
					text: z.string().optional().describe('Text to type or key command to execute'),
				},
				{},
			),
			// Note: No outputSchema because this tool returns varying content types including images
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const {action, coordinate, text} = args as {action: z.infer<typeof ActionEnum>; coordinate?: [number, number]; text?: string};

			// Scale coordinates from API image space to logical screen space
			let scaledCoordinate = coordinate;
			if (coordinate) {
				const scale = await getApiToLogicalScale();
				scaledCoordinate = [
					Math.round(coordinate[0] * scale),
					Math.round(coordinate[1] * scale),
				];

				// Validate coordinates are within display bounds
				const [x, y] = scaledCoordinate;
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

					return jsonResult({ok: true});
				}

				case 'type': {
					if (!text) {
						throw new Error('Text required for type');
					}

					await keyboard.type(text);
					return jsonResult({ok: true});
				}

				case 'get_cursor_position': {
					const pos = await mouse.getPosition();
					const scale = await getApiToLogicalScale();
					// Return coordinates in API image space (scaled down from logical)
					// so Claude can correlate with what it sees in screenshots
					return jsonResult({
						x: Math.round(pos.x / scale),
						y: Math.round(pos.y / scale),
					});
				}

				case 'mouse_move': {
					if (!scaledCoordinate) {
						throw new Error('Coordinate required for mouse_move');
					}

					await mouse.setPosition(new Point(scaledCoordinate[0], scaledCoordinate[1]));
					return jsonResult({ok: true});
				}

				case 'left_click': {
					if (scaledCoordinate) {
						await mouse.setPosition(new Point(scaledCoordinate[0], scaledCoordinate[1]));
					}

					await mouse.leftClick();
					return jsonResult({ok: true});
				}

				case 'left_click_drag': {
					if (!scaledCoordinate) {
						throw new Error('Coordinate required for left_click_drag');
					}

					await mouse.pressButton(Button.LEFT);
					await mouse.setPosition(new Point(scaledCoordinate[0], scaledCoordinate[1]));
					await mouse.releaseButton(Button.LEFT);
					return jsonResult({ok: true});
				}

				case 'right_click': {
					if (scaledCoordinate) {
						await mouse.setPosition(new Point(scaledCoordinate[0], scaledCoordinate[1]));
					}

					await mouse.rightClick();
					return jsonResult({ok: true});
				}

				case 'middle_click': {
					if (scaledCoordinate) {
						await mouse.setPosition(new Point(scaledCoordinate[0], scaledCoordinate[1]));
					}

					await mouse.click(Button.MIDDLE);
					return jsonResult({ok: true});
				}

				case 'double_click': {
					if (scaledCoordinate) {
						await mouse.setPosition(new Point(scaledCoordinate[0], scaledCoordinate[1]));
					}

					await mouse.doubleClick(Button.LEFT);
					return jsonResult({ok: true});
				}

				case 'scroll': {
					if (!scaledCoordinate) {
						throw new Error('Coordinate required for scroll');
					}

					if (!text) {
						throw new Error('Text required for scroll (direction like "up", "down:5")');
					}

					// Parse direction and optional amount from text (e.g. "down" or "down:5")
					const parts = text.split(':');
					const direction = parts[0];
					const amountStr = parts[1];
					const amount = amountStr ? parseInt(amountStr, 10) : 300;

					if (!direction) {
						throw new Error('Scroll direction required');
					}

					if (amountStr !== undefined && (isNaN(amount) || amount <= 0)) {
						throw new Error(`Invalid scroll amount: ${amountStr}`);
					}

					// Move to position first
					await mouse.setPosition(new Point(scaledCoordinate[0], scaledCoordinate[1]));

					// Scroll in the specified direction
					switch (direction.toLowerCase()) {
						case 'up':
							await mouse.scrollUp(amount);
							break;
						case 'down':
							await mouse.scrollDown(amount);
							break;
						case 'left':
							await mouse.scrollLeft(amount);
							break;
						case 'right':
							await mouse.scrollRight(amount);
							break;
						default:
							throw new Error(`Invalid scroll direction: ${direction}. Use "up", "down", "left", or "right"`);
					}

					return jsonResult({ok: true});
				}

				case 'get_screenshot': {
					// Wait a bit to let things load before showing it to Claude
					await setTimeout(1000);

					// Get cursor position in logical coordinates
					const cursorPos = await mouse.getPosition();

					// Capture the entire screen (may be at Retina resolution)
					const image = imageToJimp(await screen.grab());

					// Then resize to fit within API limits
					const apiScaleFactor = getSizeToApiScale(image.getWidth(), image.getHeight());
					if (apiScaleFactor < 1) {
						image.resize(
							Math.floor(image.getWidth() * apiScaleFactor),
							Math.floor(image.getHeight() * apiScaleFactor),
						);
					}

					// Calculate cursor position in API image coordinates
					// cursor is in logical coords, need to convert to API image coords
					const scale = await getApiToLogicalScale();
					const cursorInImageX = Math.floor(cursorPos.x / scale);
					const cursorInImageY = Math.floor(cursorPos.y / scale);

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
									// Report the image dimensions - Claude should use coordinates within this space
									// These may differ from the actual display due to scaling for API limits
									image_width: imageWidth,
									image_height: imageHeight,
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
}
