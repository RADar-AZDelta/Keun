import { decodeToken } from '$lib/firebaseAdmin.server';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const securityHeaders = {
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'X-XSS-Protection': '0',
}

const authorizedPages = ["/register"]

const sessionHandle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('token') || '';
	const decodedToken = await decodeToken(token);
	if (decodedToken) {
		const { uid, name, email } = decodedToken;
		const roles: [string] = [decodedToken['role']];
		event.locals.userSession = { uid, name, email, roles };
	}

	const response = await resolve(event);
	// Object.entries(securityHeaders).forEach(([header, value]) => {
	// 	response.headers.set(header, value)
	// })

	return response;
};

const authorizationHandle: Handle = async({ event, resolve}) => {
	if(authorizedPages.includes(event.url.pathname)){
		const token = event.cookies.get('token') || ''
		const decodedToken = await decodeToken(token)
		if(decodedToken) {
			const { email } = decodedToken
			if (!decodedToken['role'].includes('Admin')) {
				console.error(
					`'${email}' tried to perform an unauthorized action in the page ${event.url.pathname}!`
				);
				throw redirect(302, '/');
			}
		}
	}
	
	const response = await resolve(event)
	return response
}

export const handle = sequence(sessionHandle, authorizationHandle)