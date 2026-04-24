<script lang="ts">
    import { Select as SelectPrimitive } from 'bits-ui';

    // Widen to `any` on pass-through to sidestep the bits-ui union-type
    // complexity (single vs multiple variants). Callers specify `type`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { ...restProps }: any = $props();
</script>

<SelectPrimitive.Root {...restProps} />
