import { userSessionInitialized, userSessionStore } from '$lib/firebase';
import { redirect } from '@sveltejs/kit';

export const ssr = false;

export const load = async () => {
	await userSessionInitialized;
	userSessionStore.subscribe((session) => {
		if (!session?.uid || !session?.roles?.includes('Admin')) {
			throw redirect(302, '/');
		}
	})(); //immediately unsubcribe

	return {};
};

