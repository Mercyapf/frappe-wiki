<script setup>
/**
 * CalloutBlockView Component
 *
 * Renders a callout/aside block in the TipTap editor.
 * Supports types: note, tip, caution, danger
 */

import { computed, ref, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { NodeViewWrapper } from '@tiptap/vue-3';

const props = defineProps({
    node: {
        type: Object,
        required: true,
    },
    updateAttributes: {
        type: Function,
        required: true,
    },
    selected: {
        type: Boolean,
        default: false,
    },
});

// Normalize warning to caution
const normalizedType = computed(() => {
    const type = props.node.attrs.type || 'note';
    return type === 'warning' ? 'caution' : type;
});

// Default titles for each type
const defaultTitles = {
    note: 'Note',
    tip: 'Tip',
    caution: 'Caution',
    danger: 'Danger',
};

// Display title (custom or default)
const displayTitle = computed(() => {
    return props.node.attrs.title || defaultTitles[normalizedType.value] || 'Note';
});

// SVG icons for each callout type
const icons = {
    note: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
    tip: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`,
    caution: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    danger: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`,
};

const icon = computed(() => icons[normalizedType.value] || icons.note);

// Editing state
const isEditingContent = ref(false);
const editableContent = ref(props.node.attrs.content || '');
const textareaRef = ref(null);
let isSaving = false;

// Watch for external changes
watch(
    () => props.node.attrs.content,
    (newContent) => {
        if (!isEditingContent.value) {
            editableContent.value = newContent || '';
        }
    }
);

function startEditing() {
    editableContent.value = props.node.attrs.content || '';
    isEditingContent.value = true;
    nextTick(() => {
        if (textareaRef.value) {
            textareaRef.value.focus();
        }
    });
}

function finishEditing() {
    // Don't exit edit mode if we're in a save operation
    if (isSaving) {
        return;
    }
    isEditingContent.value = false;
    syncContent();
}

function syncContent() {
    if (editableContent.value !== props.node.attrs.content) {
        props.updateAttributes({ content: editableContent.value });
    }
}

// Sync content before save so pending edits are not lost
function handleBeforeSave() {
    if (isEditingContent.value) {
        isSaving = true;
        syncContent();
    }
}

// Re-focus textarea after save completes
function handleAfterSave() {
    if (isSaving) {
        isSaving = false;
        // Re-focus the textarea after save
        nextTick(() => {
            if (textareaRef.value) {
                textareaRef.value.focus();
            }
        });
    }
}

onMounted(() => {
    document.addEventListener('wiki-editor-before-save', handleBeforeSave);
    document.addEventListener('wiki-editor-after-save', handleAfterSave);

    // Auto-enter edit mode for new callouts (empty content)
    if (!props.node.attrs.content) {
        startEditing();
    }
});

onUnmounted(() => {
    document.removeEventListener('wiki-editor-before-save', handleBeforeSave);
    document.removeEventListener('wiki-editor-after-save', handleAfterSave);
});
</script>

<template>
    <NodeViewWrapper
        class="callout-block-wrapper"
        :class="[`callout-${normalizedType}`, { 'is-selected': selected }]"
        contenteditable="false"
    >
        <span class="callout-icon" v-html="icon"></span>
        <div class="callout-body">
            <span class="callout-title-text">{{ displayTitle }}</span>
            <div class="callout-content" @dblclick="startEditing">
                <textarea
                    v-if="isEditingContent"
                    ref="textareaRef"
                    v-model="editableContent"
                    class="callout-content-editor"
                    @blur="finishEditing"
                    @keydown.escape="finishEditing"
                ></textarea>
                <div v-else class="callout-content-text">
                    {{ node.attrs.content || 'Double-click to edit...' }}
                </div>
            </div>
        </div>
    </NodeViewWrapper>
</template>

<style scoped>
/* Frappe UI Alert-style callouts */
.callout-block-wrapper {
    margin: 1rem 0;
    padding: 0.875rem 1rem;
    border-radius: 0.375rem;
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.75rem;
    align-items: start;
}

/* Remove the selected outline - it's distracting when editing */
.callout-block-wrapper.is-selected {
    outline: none;
}

.callout-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding-top: 0.125rem;
}

.callout-icon :deep(svg) {
    width: 1rem;
    height: 1rem;
}

.callout-body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.callout-title-text {
    font-weight: 500;
    font-size: 0.875rem;
    line-height: 1.4;
    color: var(--ink-gray-9, #111827);
}

.callout-content {
    font-size: 0.875rem;
    line-height: 1.5;
}

.callout-content-text {
    white-space: pre-wrap;
    color: var(--ink-gray-6, #6b7280);
}

.callout-content-editor {
    width: 100%;
    min-height: 60px;
    resize: vertical;
    padding: 0.5rem;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    border: 1px solid var(--outline-gray-2, #e5e7eb);
    border-radius: 0.375rem;
    background-color: var(--surface-white, #ffffff);
    color: inherit;
    caret-color: var(--ink-gray-9, #111827);
}

.callout-content-editor:focus {
    outline: none;
    border-color: var(--outline-gray-4, #9ca3af);
    box-shadow: 0 0 0 2px rgba(156, 163, 175, 0.25);
}

/* Note - Blue (info style) */
.callout-note {
    background-color: var(--surface-blue-2, #dbeafe);
}

.callout-note .callout-icon {
    color: var(--ink-blue-3, #2563eb);
}

/* Tip - Green (success style) */
.callout-tip {
    background-color: var(--surface-green-2, #dcfce7);
}

.callout-tip .callout-icon {
    color: var(--ink-green-3, #16a34a);
}

/* Caution - Amber (warning style) */
.callout-caution {
    background-color: var(--surface-amber-2, #fef3c7);
}

.callout-caution .callout-icon {
    color: var(--ink-amber-3, #d97706);
}

/* Danger - Red (error style) */
.callout-danger {
    background-color: var(--surface-red-2, #fecaca);
}

.callout-danger .callout-icon {
    color: var(--ink-red-3, #dc2626);
}
</style>
