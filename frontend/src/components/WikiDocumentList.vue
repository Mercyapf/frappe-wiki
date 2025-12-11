<template>
    <p>{{ __('Wiki Document List') }}</p>
    <Button variant="solid">{{ __('New Page') }}
        <template #prefix>
            <LucideAdd class="size-4" />
        </template>
    </Button>
</template>

<script setup>
import LucideAdd from "~icons/lucide/plus";
</script>