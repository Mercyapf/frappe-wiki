/**
 * Remark Plugin for Media Blocks (Images and Videos)
 *
 * This is a unified remark plugin that handles both images and videos.
 * It transforms paragraphs containing a single image into either:
 * - video-block nodes (for video URLs like .mp4, .webm, etc.)
 * - image-block nodes (for image URLs)
 *
 * This plugin REPLACES Milkdown's built-in remarkImageBlockPlugin to avoid
 * conflicts between video and image handling.
 */

import { $remark } from '@milkdown/kit/utils';
import { visit } from 'unist-util-visit';

/**
 * Video extensions that should be rendered as video players
 */
const VIDEO_EXTENSIONS = [
	'.mp4',
	'.webm',
	'.ogg',
	'.mov',
	'.avi',
	'.mkv',
	'.m4v',
];

/**
 * Check if a URL points to a video file
 */
function isVideoUrl(url) {
	if (!url || typeof url !== 'string') return false;
	const lowerUrl = url.toLowerCase();
	return VIDEO_EXTENSIONS.some((ext) => lowerUrl.endsWith(ext));
}

/**
 * Remark plugin that transforms paragraphs containing a single image
 * with a video URL into video-block nodes.
 *
 * This allows using the standard image syntax for videos:
 * ![My Video](./path/to/video.mp4)
 */
export const remarkVideoBlockPlugin = $remark(
	'remarkVideoBlockPlugin',
	() => () => (tree) => {
		visit(tree, 'paragraph', (node, index, parent) => {
			// Only process paragraphs with exactly one child
			if (!node.children || node.children.length !== 1) {
				return;
			}

			const firstChild = node.children[0];

			// Check if the single child is an image
			if (!firstChild || firstChild.type !== 'image') {
				return;
			}

			// Check if it's a video URL - only transform videos here
			if (!firstChild.url || !isVideoUrl(firstChild.url)) {
				return;
			}

			// Replace the paragraph with a video-block node
			const videoBlockNode = {
				type: 'video-block',
				url: firstChild.url,
				alt: firstChild.alt || '',
				title: firstChild.title || '',
				data: {
					hName: 'video-block',
				},
			};

			// Replace the paragraph node in the parent's children array
			if (parent && typeof index === 'number') {
				parent.children.splice(index, 1, videoBlockNode);
			}
		});
	},
);

/**
 * Unified remark plugin that handles BOTH images and videos.
 * This replaces Milkdown's remarkImageBlockPlugin to prevent conflicts.
 *
 * - Video URLs (.mp4, .webm, etc.) → video-block nodes
 * - Image URLs → image-block nodes
 */
export const remarkMediaBlockPlugin = $remark(
	'remarkMediaBlockPlugin',
	() => () => (tree) => {
		visit(tree, 'paragraph', (node, index, parent) => {
			// Only process paragraphs with exactly one child
			if (!node.children || node.children.length !== 1) {
				return;
			}

			const firstChild = node.children[0];

			// Check if the single child is an image
			if (!firstChild || firstChild.type !== 'image') {
				return;
			}

			const url = firstChild.url || '';
			const alt = firstChild.alt || '';
			const title = firstChild.title || '';

			let newNode;

			if (isVideoUrl(url)) {
				// Create a video-block node for video URLs
				newNode = {
					type: 'video-block',
					url: url,
					alt: alt,
					title: title,
					data: {
						hName: 'video-block',
					},
				};
			} else {
				// Create an image-block node for image URLs
				// This mirrors Milkdown's remarkImageBlockPlugin behavior
				newNode = {
					type: 'image-block',
					url: url,
					alt: alt,
					title: title,
				};
			}

			// Replace the paragraph node in the parent's children array
			if (parent && typeof index === 'number') {
				parent.children.splice(index, 1, newNode);
			}
		});
	},
);
