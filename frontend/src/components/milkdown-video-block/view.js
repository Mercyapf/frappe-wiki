/**
 * Video Block View
 *
 * Connects the video-block schema to the Vue component for rendering.
 */

import { $view } from '@milkdown/kit/utils';
import { createApp, h, shallowRef } from 'vue';
import VideoBlockComponent from './VideoBlock.vue';
import { defaultVideoBlockConfig, videoBlockConfig } from './config.js';
import { videoBlockSchema } from './schema.js';

/**
 * Video block node view
 *
 * Creates a ProseMirror NodeView that renders the Vue component.
 */
export const videoBlockView = $view(videoBlockSchema.node, (ctx) => {
	let config = defaultVideoBlockConfig;
	try {
		config = ctx.get(videoBlockConfig.key) || defaultVideoBlockConfig;
	} catch (e) {}

	return (initialNode, view, getPos) => {
		const dom = document.createElement('div');
		dom.className = 'milkdown-video-block-view';
		dom.setAttribute('data-type', 'video-block');

		let selected = false;
		let currentNode = initialNode;

		const props = shallowRef({
			src: initialNode.attrs.src || '',
			selected: false,
			config: config,
		});

		let app = null;
		let mounted = false;

		const mountComponent = () => {
			if (mounted) return;

			app = createApp({
				render() {
					return h(VideoBlockComponent, {
						...props.value,
						'onUpdate:src': (newSrc) => {
							if (typeof getPos === 'function') {
								const pos = getPos();
								if (pos != null) {
									view.dispatch(
										view.state.tr.setNodeMarkup(pos, undefined, {
											...currentNode.attrs,
											src: newSrc,
										}),
									);
								}
							}
						},
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
					src: currentNode.attrs.src || '',
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
				return event.target.tagName === 'VIDEO';
			},
			ignoreMutation: () => true,
		};
	};
});
