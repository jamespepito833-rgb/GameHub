// Theme: 'light' | 'dark' | 'system' — persisted, respects prefers-color-scheme, eased transitions
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';
export const theme = writable<Theme>('dark');

const STORAGE_KEY = 'gamehub-theme';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

function getSystem(): Theme {
	if (!browser) return 'dark';
	return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
}

function apply(t: Theme) {
	if (!browser) return;
	const root = document.documentElement;
	root.dataset.theme = t;
	// For CSS color-scheme and form controls
	root.style.colorScheme = t;
	// Persist explicit choice
	try {
		localStorage.setItem(STORAGE_KEY, t);
	} catch {}
}

export function initTheme() {
	if (!browser) return;
	const stored = (() => {
		try {
			return localStorage.getItem(STORAGE_KEY) as Theme | null;
		} catch {
			return null;
		}
	})();
	const initial: Theme = stored === 'light' || stored === 'dark' ? stored : getSystem();
	theme.set(initial);
	apply(initial);

	// Follow system if no explicit choice
	if (!stored) {
		const mql = window.matchMedia(MEDIA_QUERY);
		const onChange = (e: MediaQueryListEvent) => {
			const next = e.matches ? 'dark' : 'light';
			theme.set(next);
			apply(next);
		};
		mql.addEventListener?.('change', onChange);
	}

	// Expose for toggle
	return {
		toggle: () => {
			let cur: Theme = 'dark';
			theme.subscribe((v) => (cur = v))();
			const next: Theme = cur === 'dark' ? 'light' : 'dark';
			theme.set(next);
			apply(next);
			// Add class for eased transition, remove after
			document.documentElement.classList.add('theme-transition');
			window.setTimeout(() => document.documentElement.classList.remove('theme-transition'), 400);
		}
	};
}

export function setTheme(t: Theme) {
	theme.set(t);
	apply(t);
}
