import { browser } from '$app/environment';

const STORAGE_KEY = 'duitgee:sidebar-collapsed';

function createSidebarState() {
    let collapsed = $state<boolean>(false);

    if (browser) {
        try {
            collapsed = localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            // ignore
        }
    }

    return {
        get collapsed() {
            return collapsed;
        },
        set collapsed(value: boolean) {
            collapsed = value;
            if (browser) {
                try {
                    localStorage.setItem(STORAGE_KEY, String(value));
                } catch {
                    // ignore
                }
            }
        },
        toggle() {
            this.collapsed = !this.collapsed;
        },
    };
}

export const sidebarState = createSidebarState();
