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
	// Get config from context, fallback to defaults
	let config = defaultCalloutBlockConfig;
	try {
		config = ctx.get(calloutBlockConfig.key) || defaultCalloutBlockConfig;
	} catch (e) {
		// Config context not available, use defaults
	}

	return (initialNode, view, getPos) => {
		const dom = document.createElement('div');
		dom.className = 'milkdown-callout-block-view';
		dom.setAttribute('data-type', 'callout-block');

		// Track selection state and current node
		let selected = false;
		let currentNode = initialNode;

		// Create reactive props
		const props = shallowRef({
			type: initialNode.attrs.type || 'note',
			title: initialNode.attrs.title || '',
			content: initialNode.attrs.content || '',
			selected: false,
			config: config,
		});

		// Helper to update node attributes
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

		// Use Vue's createApp for rendering
		let app = null;
		let mounted = false;

		const mountComponent = () => {
			if (mounted) return;

			// Use Vue 3's render function approach
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

		// Mount the component
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
				// Force re-render
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
				// Allow interactions within the callout (like textarea editing)
				return (
					event.target.tagName === 'TEXTAREA' ||
					event.target.tagName === 'INPUT'
				);
			},
			ignoreMutation: () => true,
		};
	};
});
