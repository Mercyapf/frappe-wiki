<template>
	<div ref="wrapper" class="diff-viewer" />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { DEFAULT_THEMES, FileDiff } from '@pierre/diffs';

const props = defineProps({
	oldContent: {
		type: String,
		default: '',
	},
	newContent: {
		type: String,
		default: '',
	},
	fileName: {
		type: String,
		default: 'changes.md',
	},
	language: {
		type: String,
		default: 'markdown',
	},
	diffStyle: {
		type: String,
		default: 'split',
	},
});

const wrapper = ref(null);
let diffInstance = null;

function normalizeContent(content) {
	const normalized = (content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	if (!normalized) {
		return '';
	}
	return normalized.endsWith('\n') ? normalized : `${normalized}\n`;
}

function renderDiff() {
	if (!wrapper.value) return;
	if (!diffInstance) {
		diffInstance = new FileDiff({
			theme: DEFAULT_THEMES,
			diffStyle: props.diffStyle,
			lineDiffType: 'word',
			themeType: 'light',
		});
	}

	diffInstance.render({
		oldFile: {
			name: props.fileName,
			contents: normalizeContent(props.oldContent),
			lang: props.language,
		},
		newFile: {
			name: props.fileName,
			contents: normalizeContent(props.newContent),
			lang: props.language,
		},
		containerWrapper: wrapper.value,
	});
}

onMounted(renderDiff);

watch(
	() => [props.oldContent, props.newContent, props.fileName, props.language, props.diffStyle],
	() => {
		renderDiff();
	},
);

onBeforeUnmount(() => {
	diffInstance?.cleanUp();
	diffInstance = null;
});
</script>

<style scoped>
.diff-viewer {
	width: 100%;
	overflow: auto;
}
</style>
