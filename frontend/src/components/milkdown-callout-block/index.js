/**
 * Milkdown Callout Block Plugin
 *
 * This plugin provides a custom callout/aside block component for Milkdown editor.
 * It transforms Astro Starlight-style callout syntax into styled callout blocks.
 *
 * Markdown syntax:
 * :::note
 * Content here
 * :::
 *
 * :::tip[Custom Title]
 * Content here
 * :::
 *
 * Supported types: note, tip, caution, danger, warning (alias for caution)
 */

import { calloutBlockConfig } from './config.js';
import { remarkCalloutBlockPlugin } from './remark-plugin.js';
import { calloutBlockSchema } from './schema.js';
import { calloutBlockView } from './view.js';

export { calloutBlockConfig, defaultCalloutBlockConfig } from './config.js';
export { remarkCalloutBlockPlugin } from './remark-plugin.js';
export { calloutBlockSchema } from './schema.js';
export { calloutBlockView } from './view.js';

/**
 * Callout types that are supported
 */
export const CALLOUT_TYPES = ['note', 'tip', 'caution', 'danger', 'warning'];

/**
 * Default titles for each callout type
 */
export const DEFAULT_TITLES = {
	note: 'Note',
	tip: 'Tip',
	caution: 'Caution',
	danger: 'Danger',
	warning: 'Caution',
};

/**
 * Check if a string is a valid callout type
 */
export function isValidCalloutType(type) {
	return CALLOUT_TYPES.includes(type?.toLowerCase());
}

/**
 * All plugins for the callout block component
 * Use with: editor.use(calloutBlockComponent)
 */
export const calloutBlockComponent = [
	remarkCalloutBlockPlugin,
	calloutBlockSchema,
	calloutBlockView,
	calloutBlockConfig,
].flat();
