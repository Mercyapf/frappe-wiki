/**
 * Video Block Configuration
 *
 * Provides configuration options for the video block component.
 */

import { $ctx } from '@milkdown/kit/utils';

/**
 * Default configuration for the video block
 */
export const defaultVideoBlockConfig = {
	placeholderText: 'Video',
	showControls: true,
	autoplay: false,
	loop: false,
	muted: false,
	maxWidth: '100%',
};

/**
 * Video block configuration context
 */
export const videoBlockConfig = $ctx(
	defaultVideoBlockConfig,
	'videoBlockConfigCtx',
);
