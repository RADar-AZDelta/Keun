import type { FirebaseApp } from "firebase/app";
import { GithubAuthProvider, GoogleAuthProvider, getAuth, type AuthProvider, signInWithPopup, signOut, type User, type IdTokenResult, onAuthStateChanged, type Auth } from 'firebase/auth';
import { DataSnapshot, Database, child, get, getDatabase, off, onValue, push, ref, remove, set, update } from 'firebase/database'
import { deleteObject, getBlob, getStorage, ref as storageRef, uploadBytes, type FirebaseStorage } from 'firebase/storage'
import type { UserSession } from '../app';
import { sleep } from './utils';
import { writable } from 'svelte/store';
import { browser, dev } from '$app/environment';

// Initialize Firebase
let firebaseApp: FirebaseApp | undefined, firebaseAuth: Auth | undefined, firebaseDatabase: Database | undefined, firebaseStorage: FirebaseStorage | undefined

async function getFirebaseApp() {
	const res = await fetch('/api/firebase');
	const body = await res.json()
	firebaseApp = body.app
}

// Providers
const googleAuthProvider = new GoogleAuthProvider();
const githubAuthProvider = new GithubAuthProvider();

// Auth
async function setAuth() {
	if(!firebaseApp) await getFirebaseApp()
	firebaseAuth = getAuth(firebaseApp);
	return firebaseAuth
}
// Realtime Database
async function setDatabase() {{
	if(!firebaseApp) await getFirebaseApp()
	firebaseDatabase = getDatabase(firebaseApp);
}}
// Storage
async function setStorage() {
	if(!firebaseApp) await getFirebaseApp()
	firebaseStorage = getStorage(firebaseApp);
}

// Methods
async function logIn(provider: string) {
	try {
		let authProvider: AuthProvider;

		switch (provider) {
			case 'google':
				authProvider = googleAuthProvider;
				break;
			case 'github':
				authProvider = githubAuthProvider;
				break;
		}
		if(!firebaseAuth) await setAuth()
		const userCred = await signInWithPopup(firebaseAuth!, authProvider!);
		const token = await userCred.user.getIdTokenResult(true);
		await setToken(token.token);
		return userCred
	} catch (error: any) {
		throw {
			code: error.code,
			message: error.message,
			email: error.customData.email
		};
	}
}

async function logOut() {
	if(!firebaseAuth) await setAuth()
	await signOut(firebaseAuth!);
	await setToken();
}

// Set the token in the cookies
async function setToken(token?: string) {
	const options = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json;charset=utf-8'
		},
		body: JSON.stringify({ token })
	};

	await fetch('/api/token', options);
}

const decodeToken = (user: User, token: IdTokenResult): UserSession => {
	return {
		uid: user.uid,
		name: user.displayName,
		email: user.email ?? undefined,
		roles: token.claims['role'],
		token: token.token
	};
};

const refreshTokenTrigger = (
	user: User,
	token: IdTokenResult,
	set: (value: UserSession) => void
) => {
	let callback = null;
	let metadataRef = null;
	// Remove previous listener.
	if (callback && metadataRef) {
		off(metadataRef, 'value', callback);
	}
	// On user login add new listener.
	if (user) {
		// Check if refresh is required.
		const db = getDatabase(firebaseApp);
		if (db) {
			metadataRef = ref(db, 'metadata/' + user.uid + '/refreshTime');
			callback = (snapshot: DataSnapshot) => {
				user.getIdTokenResult(true).then((token) => set(decodeToken(user, token)));
			};
			// Subscribe new listener to changes on that node.
			onValue(metadataRef, callback);
		} else {
			//no firebase DB so we use a simple sleep
			// @ts-ignore
			const ms = (token.claims.exp - token.claims.iat) * 1000 - 10 * 1000; //refresh token 10 sec before expiration
			sleep(ms).then(() => {
				user.getIdTokenResult(true).then((token) => set(decodeToken(user, token)));
			});
		}
	}
};

// Store
const userSessionStore = writable<UserSession>({});
let _resolve: any;
const userSessionInitialized = new Promise((resolve) => (_resolve = resolve));

if(browser && firebaseAuth) {
	onAuthStateChanged(firebaseAuth, async (user) => {
		if (user) {
			const token = await user.getIdTokenResult(false);
			refreshTokenTrigger(user, token, userSessionStore.set);
			if (dev) console.log(token.claims);
			userSessionStore.set(decodeToken(user, token));
			await setToken(token.token);
		} else {
			userSessionStore.set({ uid: undefined, name: undefined, email: undefined, roles: undefined });
		}
		_resolve();
	});
}

const onlyReadableUserSessionStore = { subscribe: userSessionStore.subscribe };

async function writeToDatabase(path: string, data: Object) {
	if (dev) console.log("writeToDatabase: Write data to the path ", path)
	if(!firebaseDatabase) await setDatabase()
	const reference = ref(firebaseDatabase!, path);
	await set(reference, data)
}

async function pushToDatabase(path: string, data: any) {
	if (dev) console.log("writeToDatabase: Push data to the path ", path)
	if(!firebaseDatabase) await setDatabase()
    const reference = ref(firebaseDatabase!, path)
    await push(reference, data)
}

async function readDatabase(path: string) {
	if (dev) console.log('readDatabase: Read data from the path ', path)
	let receivedData: any;
	if(!firebaseDatabase) await setDatabase()
	const reference = ref(firebaseDatabase!);
	await get(child(reference, path))
		.then((snapshot: DataSnapshot) => {
			receivedData = snapshot.val();
		})
		.catch((error: any) => {
			console.error(error);
		});
	return receivedData;
}

async function watchValueDatabase(path: string, callback: (snapshot: DataSnapshot) => unknown, remove: boolean = false) {
	if(!firebaseDatabase) await setDatabase()
	const reference = ref(firebaseDatabase!, path)
	if (dev) console.log('watchValueDatabase: Watching the value at path ', path)
	const valueCheck = onValue(reference, callback)
	if(remove) {
		// Close twice because it will create the listener twice
		valueCheck()
		valueCheck()
	}
}
async function deleteDatabase(path: string) {
	if (dev) console.log('deleteDatabase: Delete the data at the path ', path)
	if(!firebaseDatabase) await setDatabase()
	remove(ref(firebaseDatabase!, path))
}

async function updateDatabase(path: string, data: Object) {
	if (dev) console.log('updateDatabase: Update the database with data at the path ', path)
	if(!firebaseDatabase) await setDatabase()
	const reference = ref(firebaseDatabase!, path)
	await update(reference, data)
}

async function uploadFileToStorage(reference: string, file: File): Promise<string | void> {
	return new Promise(async (resolve, reject) => {
		if (dev) console.log('uploadFileToStorage: Upload the file to the storage at reference ', reference)
		if(!firebaseStorage) await setStorage()
		const storageReference = storageRef(firebaseStorage!, reference)
		await uploadBytes(storageReference, file).catch((e) => {resolve(e.message)}).finally(() => resolve())
	})
}

async function readFileStorage(reference: string): Promise<Blob | undefined> {
	return new Promise(async(resolve, reject) => {
		if (dev) console.log('readFileStorage: Read the file from storage at reference ', reference)
		if(!firebaseStorage) await setStorage()
	const storageReference = storageRef(firebaseStorage!, reference)
		await getBlob(storageReference).then((blob: Blob) => resolve(blob)).catch(() => resolve(undefined))
	})
}

async function deleteFileStorage(reference: string): Promise<string | void> {
	return new Promise(async(resolve, reject) => {
		if (dev) console.log('deleteFileStorage: Delete the file at reference ', reference)
		if(!firebaseStorage) await setStorage()
		const storageReference = storageRef(firebaseStorage!, reference)
		deleteObject(storageReference).catch((e: Error) => resolve(e.message)).finally(() => resolve())
	})
}

export {
	logIn,
	logOut,
	onlyReadableUserSessionStore as userSessionStore,
	userSessionInitialized,
	writeToDatabase,
    pushToDatabase,
	readDatabase,
	watchValueDatabase,
	deleteDatabase,
	updateDatabase,
	uploadFileToStorage,
	readFileStorage,
	deleteFileStorage
};