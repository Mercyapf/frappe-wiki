import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import ImageNodeView from './ImageNodeView.vue';

// Markdown image regex: ![alt](src "title")
const inputRegex = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/;

/**
 * Custom Image extension with caption support
 * Captions are stored in the alt attribute and displayed below the image
 */
export const WikiImage = Node.create({
	name: 'image',

	group: 'block',

	draggable: true,

	addOptions() {
		return {
			inline: false,
			allowBase64: true,
			HTMLAttributes: {},
		};
	},

	addAttributes() {
		return {
			src: {
				default: null,
			},
			alt: {
				default: null,
			},
			title: {
				default: null,
			},
			width: {
				default: null,
			},
			height: {
				default: null,
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'img[src]',
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'img',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
		];
	},

	// Parse markdown image syntax: ![alt](src "title")
	parseMarkdown: (token, helpers) => {
		return helpers.createNode('image', {
			src: token.href,
			title: token.title,
			alt: token.text,
		});
	},

	// Render to markdown: ![alt](src "title") or ![alt](src)
	renderMarkdown: (node) => {
		const src = node.attrs?.src ?? '';
		const alt = node.attrs?.alt ?? '';
		const title = node.attrs?.title ?? '';
		return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
	},

	addNodeView() {
		return VueNodeViewRenderer(ImageNodeView);
	},

	addCommands() {
		return {
			setImage:
				(options) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs: options,
					});
				},
		};
	},

	addInputRules() {
		return [
			nodeInputRule({
				find: inputRegex,
				type: this.type,
				getAttributes: (match) => {
					const [, , alt, src, title] = match;
					return { src, alt, title };
				},
			}),
		];
	},
});

export default WikiImage;
