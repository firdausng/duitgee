import { browser } from '$app/environment';

const STORAGE_KEY = 'duitgee:density-compact';
const CLASS_NAME = 'density-compact';

function createDensityState() {
    let compact = $state<boolean>(false);

    if (browser) {
        try {
            compact = localStorage.getItem(STORAGE_KEY) === 'true';
            if (compact) document.documentElement.classList.add(CLASS_NAME);
        } catch {
            // ignore
        }
    }

    return {
        get compact() {
            return compact;
        },
        set compact(value: boolean) {
            compact = value;
            if (browser) {
                try {
                    localStorage.setItem(STORAGE_KEY, String(value));
                    document.documentElement.classList.toggle(CLASS_NAME, value);
                } catch {
                    // ignore
                }
            }
        },
        toggle() {
            this.compact = !this.compact;
        },
    };
}

export const densityState = createDensityState();
