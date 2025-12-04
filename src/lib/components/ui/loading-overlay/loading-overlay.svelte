<script lang="ts">
    import { slide,  } from "svelte/transition";
    import {Spinner} from "$lib/components/ui/spinner";
    export let show = false;
</script>

{#if show}
    <div class="absolute inset-0 bg-gray-900/30 z-50 flex items-center justify-center"
         in:slide={{ duration: 300 }}
         out:slide={{ duration: 100 }}
    >
<!--        <div class="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>-->
        <Spinner class="size-8" />
    </div>
{/if}
