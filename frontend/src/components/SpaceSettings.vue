<template>
    <div class="flex flex-col items-center justify-center py-16">
        <LucideSettings class="size-12 text-ink-gray-4 mb-4" />
        <h3 class="text-lg font-medium text-ink-gray-7 mb-2">{{ __('Settings') }}</h3>
        <p class="text-sm text-ink-gray-5">{{ __('Space settings coming soon') }}</p>
    </div>
</template>

<script setup>
import LucideSettings from '~icons/lucide/settings';

defineProps({
    spaceId: {
        type: String,
        required: true,
    },
});
</script>
