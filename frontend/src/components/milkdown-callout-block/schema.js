/**
 * Callout Block Schema
 *
 * Defines the ProseMirror node schema for callout/aside blocks.
 * Supports Astro Starlight-style syntax: :::type[title]\ncontent\n:::
 */

import { $nodeSchema } from '@milkdown/kit/utils';

/**
 * Callout block node schema
 *
 * Attributes:
 * - type: The callout type (note, tip, caution, danger, warning)
 * - title: Optional custom title
 * - content: The markdown content inside the callout
 */
export const calloutBlockSchema = $nodeSchema('callout-block', () => ({
	group: 'block',
	atom: true,
	isolating: true,
	marks: '',
	attrs: {
		type: { default: 'note' },
		title: { default: '' },
		content: { default: '' },
	},
	parseDOM: [
		{
			tag: 'aside.callout',
			getAttrs: (dom) => {
				const classList = dom.className.split(' ');
				const typeClass = classList.find((c) => c.startsWith('callout-'));
				const type = typeClass ? typeClass.replace('callout-', '') : 'note';

				const titleEl = dom.querySelector('.callout-title span');
				const title = titleEl ? titleEl.textContent : '';

				const contentEl = dom.querySelector('.callout-content');
				const content = contentEl ? contentEl.textContent : '';

				return { type, title, content };
			},
		},
		{
			tag: 'div[data-type="callout-block"]',
			getAttrs: (dom) => ({
				type: dom.getAttribute('data-callout-type') || 'note',
				title: dom.getAttribute('data-title') || '',
				content: dom.getAttribute('data-content') || '',
			}),
		},
	],
	toDOM: (node) => [
		'aside',
		{
			class: `callout callout-${node.attrs.type}`,
			'data-type': 'callout-block',
			'data-callout-type': node.attrs.type,
		},
		[
			'div',
			{ class: 'callout-title' },
			[
				'span',
				{},
				node.attrs.title ||
					node.attrs.type.charAt(0).toUpperCase() + node.attrs.type.slice(1),
			],
		],
		['div', { class: 'callout-content' }, node.attrs.content],
	],
	parseMarkdown: {
		match: (node) => node.type === 'callout-block',
		runner: (state, node, type) => {
			state.addNode(type, {
				type: node.calloutType || 'note',
				title: node.title || '',
				content: node.content || '',
			});
		},
	},
	toMarkdown: {
		match: (node) => node.type.name === 'callout-block',
		runner: (state, node) => {
			const calloutType = node.attrs.type || 'note';
			const title = node.attrs.title || '';
			const content = node.attrs.content || '';

			let markdown;
			if (title) {
				markdown = `:::${calloutType}[${title}]\n${content}\n:::`;
			} else {
				markdown = `:::${calloutType}\n${content}\n:::`;
			}

			state.openNode('paragraph');
			state.addNode('text', undefined, undefined, { value: markdown });
			state.closeNode();
		},
	},
}));
