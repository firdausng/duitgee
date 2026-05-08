import { pushState, replaceState } from '$app/navigation';
import { page } from '$app/state';

/**
 * Shallow-routing helper for modals/drawers/dialogs that should close when the
 * user hits the browser back button. Wires `pushState` for open and
 * `history.back()` for close so all paths (back button, swipe-down, tap-outside,
 * Esc) converge on the same close mechanism.
 *
 * Usage:
 *   const dialog = shallowModal('quickAdd');
 *   <Drawer.Root open={dialog.open} onOpenChange={(o) => dialog.bind(o)}>
 *
 *   // Boolean modal:
 *   onclick={() => dialog.push()}
 *
 *   // Value-bearing modal (e.g. lightbox with id+index):
 *   const lightbox = shallowModal('lightbox');
 *   onclick={() => lightbox.push({ id, index })}
 *   {#if lightbox.value}<Lightbox {...lightbox.value} />{/if}
 */
export function shallowModal<K extends keyof App.PageState>(key: K) {
    function push(value?: App.PageState[K]) {
        // Dedupe rapid taps and avoid leaving a phantom history entry behind.
        if (page.state[key]) return;
        const next = (value ?? true) as App.PageState[K];
        pushState('', { ...page.state, [key]: next });
    }

    /**
     * Mutate the value of an already-open shallow modal without adding a new
     * history entry. Useful for in-modal navigation (e.g. lightbox prev/next)
     * where each step shouldn't be its own back-button stop.
     */
    function replace(value: App.PageState[K]) {
        replaceState('', { ...page.state, [key]: value });
    }

    function close() {
        // Guard prevents popping unrelated history entries (e.g. when something
        // else already closed the modal between user action and this call).
        if (page.state[key]) history.back();
    }

    /**
     * Bind directly to shadcn Drawer/Sheet/Dialog's `onOpenChange` callback.
     * Vaul/Bits-UI fires this for tap-outside, Esc, and swipe-down — all of
     * which become a back-pop, matching the browser-back path.
     */
    function bind(open: boolean) {
        if (open && !page.state[key]) push();
        else if (!open && page.state[key]) history.back();
    }

    return {
        get open() {
            return Boolean(page.state[key]);
        },
        get value() {
            return page.state[key];
        },
        push,
        replace,
        close,
        bind,
    };
}
