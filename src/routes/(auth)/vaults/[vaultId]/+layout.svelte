<script lang="ts">
    // Quick-add affordance moved up to (auth)/+layout.svelte:
    //   - Desktop: <DesktopAppBar> with <AddExpenseMenu> in the trailing slot.
    //   - Mobile:  <MobileBottomBar> centered ⊕ → <QuickAddSheet>.
    // This vault layout is now a pure pass-through.
    let { children } = $props();
</script>

<div>
    {@render children?.()}
</div>
