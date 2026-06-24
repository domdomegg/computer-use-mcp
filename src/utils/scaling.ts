import {screen} from '@nut-tree-fork/nut-js';

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
export function getSizeToApiScale(width: number, height: number): number {
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
export async function getApiToLogicalScale(): Promise<number> {
	const logicalWidth = await screen.width();
	const logicalHeight = await screen.height();
	const apiScaleFactor = getSizeToApiScale(logicalWidth, logicalHeight);
	return 1 / apiScaleFactor;
}
