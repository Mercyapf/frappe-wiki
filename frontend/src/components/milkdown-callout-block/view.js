/**
 * Callout Block View
 *
 * Connects the callout-block schema to the Vue component for rendering.
 */

import { $view } from '@milkdown/kit/utils';
import { createApp, h, shallowRef } from 'vue';
import CalloutBlockComponent from './CalloutBlock.vue';
import { calloutBlockConfig, defaultCalloutBlockConfig } from './config.js';
import { calloutBlockSchema } from './schema.js';

/**
 * Callout block node view
 *
 * Creates a ProseMirror NodeView that renders the Vue component.
 */
export const calloutBlockView = $view(calloutBlockSchema.node, (ctx) => {
	let config = defaultCalloutBlockConfig;
	try {
		config = ctx.get(calloutBlockConfig.key) || defaultCalloutBlockConfig;
	} catch (e) {}

	return (initialNode, view, getPos) => {
		const dom = document.createElement('div');
		dom.className = 'milkdown-callout-block-view';
		dom.setAttribute('data-type', 'callout-block');

		let selected = false;
		let currentNode = initialNode;

		const props = shallowRef({
			type: initialNode.attrs.type || 'note',
			title: initialNode.attrs.title || '',
			content: initialNode.attrs.content || '',
			selected: false,
			config: config,
		});

		const updateNodeAttr = (attr, value) => {
			if (typeof getPos === 'function') {
				const pos = getPos();
				if (pos != null) {
					view.dispatch(
						view.state.tr.setNodeMarkup(pos, undefined, {
							...currentNode.attrs,
							[attr]: value,
						}),
					);
				}
			}
		};

		let app = null;
		let mounted = false;

		const mountComponent = () => {
			if (mounted) return;

			app = createApp({
				render() {
					return h(CalloutBlockComponent, {
						...props.value,
						'onUpdate:type': (newType) => updateNodeAttr('type', newType),
						'onUpdate:title': (newTitle) => updateNodeAttr('title', newTitle),
						'onUpdate:content': (newContent) =>
							updateNodeAttr('content', newContent),
					});
				},
			});
			app.mount(dom);
			mounted = true;
		};

		mountComponent();

		return {
			dom,
			update: (updatedNode) => {
				if (updatedNode.type !== currentNode.type) {
					return false;
				}
				currentNode = updatedNode;
				props.value = {
					...props.value,
					type: currentNode.attrs.type || 'note',
					title: currentNode.attrs.title || '',
					content: currentNode.attrs.content || '',
				};
				if (app) {
					app._instance?.proxy?.$forceUpdate?.();
				}
				return true;
			},
			selectNode: () => {
				selected = true;
				props.value = { ...props.value, selected: true };
				dom.classList.add('ProseMirror-selectednode');
			},
			deselectNode: () => {
				selected = false;
				props.value = { ...props.value, selected: false };
				dom.classList.remove('ProseMirror-selectednode');
			},
			destroy: () => {
				if (app) {
					app.unmount();
					app = null;
				}
				mounted = false;
			},
			stopEvent: (event) => {
				return (
					event.target.tagName === 'TEXTAREA' ||
					event.target.tagName === 'INPUT'
				);
			},
			ignoreMutation: () => true,
		};
	};
});
