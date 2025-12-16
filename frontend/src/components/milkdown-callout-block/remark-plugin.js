/**
 * Remark Plugin for Callout Blocks
 *
 * This plugin transforms Astro Starlight-style callout syntax into callout-block nodes.
 *
 * Supported syntax (multiline):
 * :::note
 * Content here
 * :::
 *
 * :::tip[Custom Title]
 * Content with **markdown**
 * :::
 *
 * Supported syntax (inline):
 * :::note Content here :::
 * :::tip[Title] Content here :::
 */

import { $remark } from '@milkdown/kit/utils';
import { visit } from 'unist-util-visit';

/**
 * Callout types that are supported
 */
const CALLOUT_TYPES = ['note', 'tip', 'caution', 'danger', 'warning'];

/**
 * Regex to match complete callout blocks (multiline within text)
 * Matches: :::type[title]\ncontent\n::: or :::type\ncontent\n:::
 * Also handles escaped brackets: :::type\[title]
 */
const CALLOUT_BLOCK_REGEX = /^:::(\w+)(?:\\?\[([^\]]*)\])?\n([\s\S]*?)\n:::$/;

/**
 * Regex to match inline callout: :::type[title] content :::
 * Also handles escaped brackets: :::type\[title]
 */
const CALLOUT_INLINE_REGEX =
	/^:::(\w+)(?:\\?\[([^\]]*)\])?\s+([\s\S]*?)\s*:::$/;

/**
 * Remark plugin that transforms callout syntax into callout-block nodes.
 */
export const remarkCalloutBlockPlugin = $remark(
	'remarkCalloutBlockPlugin',
	() => () => (tree) => {
		visit(tree, 'paragraph', (node, index, parent) => {
			if (!node.children || node.children.length === 0) return;

			// Get the full text content of the paragraph
			const textContent = getFullText(node);

			// Try to match multiline callout pattern
			let match = textContent.match(CALLOUT_BLOCK_REGEX);

			if (!match) {
				// Try inline pattern
				match = textContent.match(CALLOUT_INLINE_REGEX);
			}

			if (match) {
				const rawType = match[1].toLowerCase();

				// Validate the type
				if (!CALLOUT_TYPES.includes(rawType)) {
					return;
				}

				const calloutType = rawType === 'warning' ? 'caution' : rawType;
				// Remove escape backslashes from title (editor escapes special chars)
				const title = (match[2] || '').replace(/\\/g, '');
				const content = match[3] || '';

				// Create the callout-block node
				const calloutNode = {
					type: 'callout-block',
					calloutType: calloutType,
					title: title,
					content: content.trim(),
					data: {
						hName: 'callout-block',
					},
				};

				// Replace the paragraph with the callout node
				if (parent && typeof index === 'number') {
					parent.children.splice(index, 1, calloutNode);
				}
			}
		});
	},
);

/**
 * Get full text content from a paragraph node, preserving structure
 */
function getFullText(node) {
	if (node.type === 'text') {
		return node.value || '';
	}

	if (node.type === 'break') {
		// Handle <br> / soft breaks as newlines
		return '\n';
	}

	if (node.children) {
		return node.children.map(getFullText).join('');
	}

	return node.value || '';
}
