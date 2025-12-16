/**
 * Callout Block Configuration
 *
 * Provides configuration options for the callout block component.
 */

import { $ctx } from '@milkdown/kit/utils';

/**
 * Default configuration for the callout block
 */
export const defaultCalloutBlockConfig = {
	// Supported callout types
	types: ['note', 'tip', 'caution', 'danger', 'warning'],
	// Default titles for each type
	defaultTitles: {
		note: 'Note',
		tip: 'Tip',
		caution: 'Caution',
		danger: 'Danger',
		warning: 'Caution',
	},
};

/**
 * Callout block configuration context
 */
export const calloutBlockConfig = $ctx(
	defaultCalloutBlockConfig,
	'calloutBlockConfigCtx',
);
