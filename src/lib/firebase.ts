import {
	PUBLIC_FIREBASE_API_KEY,
	PUBLIC_FIREBASE_AUTH_DOMAIN,
	PUBLIC_FIREBASE_PROJECT_ID,
	PUBLIC_FIREBASE_STORAGE_BUCKET,
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	PUBLIC_FIREBASE_APP_ID,
	PUBLIC_FIREBASE_DATABASE_URL
} from '$env/static/public';
import { getApp, type FirebaseApp, type FirebaseOptions, initializeApp } from "firebase/app";
import { GithubAuthProvider, GoogleAuthProvider, getAuth, type AuthProvider, signInWithPopup, signOut, type User, type IdTokenResult, onAuthStateChanged } from 'firebase/auth';
import { DataSnapshot, child, get, getDatabase, off, onValue, push, ref, remove, set } from 'firebase/database'
import { QueryEndAtConstraint, QueryFieldFilterConstraint, QueryOrderByConstraint, QueryStartAtConstraint, collection, deleteDoc, doc, endAt, getDoc, getDocs, getFirestore, limit, onSnapshot, orderBy, query, setDoc, startAt, updateDoc } from 'firebase/firestore'
import type { UserSession } from '../app';
import { sleep } from './utils';
import { writable } from 'svelte/store';
import { dev } from '$app/environment';

const firebaseConfig: FirebaseOptions = {
    apiKey: PUBLIC_FIREBASE_API_KEY,
	authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
	databaseURL: PUBLIC_FIREBASE_DATABASE_URL,
	projectId: PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: PUBLIC_FIREBASE_APP_ID
}

// Initialize Firebase
let firebaseApp: FirebaseApp;
try {
	firebaseApp = getApp('POC');
} catch (e) {
	firebaseApp = initializeApp(firebaseConfig, 'POC');
}

// Auth
const firebaseAuth = getAuth(firebaseApp);
// Realtime Database
const firebaseDatabase = getDatabase(firebaseApp);
// Firestore
const firestore = getFirestore(firebaseApp)

// Analytics
//const firebaseAnalytics = getAnalytics(firebaseApp)

// Providers
const googleAuthProvider = new GoogleAuthProvider();
const githubAuthProvider = new GithubAuthProvider();

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

		const userCred = await signInWithPopup(firebaseAuth, authProvider!);
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
	await signOut(firebaseAuth);
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

const onlyReadableUserSessionStore = { subscribe: userSessionStore.subscribe };

async function writeToDatabase(path: string, data: Object) {
	const reference = ref(firebaseDatabase, path);
	await set(reference, data)
}

async function pushToDatabase(path: string, data: any) {
    const reference = ref(firebaseDatabase, path)
    await push(reference, data)
}

async function readDatabase(path: string) {
	let receivedData: any;
	const reference = ref(firebaseDatabase);
	await get(child(reference, path))
		.then((snapshot: DataSnapshot) => {
			receivedData = snapshot.val();
		})
		.catch((error: any) => {
			console.error(error);
		});
	return receivedData;
}

async function deleteDatabase(path: string) {
	remove(ref(firebaseDatabase, path))
}

async function writeToFirestore(collection: string, id: string, data: Object) {
	return new Promise(async(resolve, reject) => {
		try {
			await setDoc(doc(firestore, collection, id), data)
			resolve(true)
		} catch(e: any) {
			console.error(e)
			resolve(false)
		}
	})
}

async function updateToFirestore(collection: string, id: string, data: any) {
	await updateDoc(doc(firestore, collection, id), data)
}

async function deleteCollectionFirestore(coll: string) {
	return new Promise(async (resolve, reject) => {
		const allSubCollections = await readCollectionFirestore(coll)
		for(let sub of Object.keys(allSubCollections)) {
			await deleteDoc(doc(firestore, coll, sub))
		}
		resolve(true)
	})
}

async function readFirestore(collection: string, id: string) {
	const refer = doc(firestore, collection, id)
	const docSnap = await getDoc(refer)
	return docSnap.data()
}

async function readCollectionFirestore(coll: string) {
    let data: Record<string, Record<any, any>> = {}
    const snapshot = await getDocs(collection(firestore, coll))
    snapshot.forEach((doc) => {
		data[doc.id] = doc.data()
    })
    return data
}

async function checkIfCollectionExists(coll: string): Promise<boolean> {
	const q = query(collection(firestore, coll), limit(1))
	const querySnapshot = await getDocs(q)
	if(querySnapshot.empty) return false
	else return true
}

async function watchCollectionFirestore(collection: string, id: string) {
	const unsub = onSnapshot(doc(firestore, collection, id), (doc) => {
		console.log("WATCHED ", doc.data)
	})
}

async function watchCollectionWithQueryFirestore(coll: string, filter: QueryFieldFilterConstraint) {
	const q = query(collection(firestore, coll), filter)
	const unsub = onSnapshot(q, (querySnapshot) => {
		const values: any[] = []
		querySnapshot.forEach((doc) => {
			values.push(doc.data())
		})
		console.log("WATCHED WITH QUERY ", values)
	})
}

async function executeFilterQueryFirestore(coll: string, filter: QueryFieldFilterConstraint) {
	const q = query(collection(firestore, coll), filter)
	const querySnapshot = await getDocs(q)
	let queriedData: Record<string, any> = {}
	querySnapshot.forEach((doc) => {
		queriedData[doc.id as keyof Object] = doc.data()
	})

	return queriedData
}

async function executeOrderQueryFirestore(coll: string, order: QueryOrderByConstraint, start?: QueryStartAtConstraint, end?: QueryEndAtConstraint){
	let q
	if(start || end) q = query(collection(firestore, 'countries.csv'), orderBy('sourceCode'), startAt(0), endAt(5))
	else q = query(collection(firestore, coll), order)
	const querySnapshot = await getDocs(q)
	let queriedData: Record<string, any> = {}
	querySnapshot.forEach((doc) => {
		queriedData[doc.id as keyof Object] = doc.data()
	})

	return queriedData
}

export {
	logIn,
	logOut,
	onlyReadableUserSessionStore as userSessionStore,
	userSessionInitialized,
	writeToDatabase,
    pushToDatabase,
	readDatabase,
	deleteDatabase,
    readCollectionFirestore,
	writeToFirestore,
	updateToFirestore,
    deleteCollectionFirestore,
	readFirestore,
	checkIfCollectionExists,
	executeFilterQueryFirestore,
	executeOrderQueryFirestore,
	watchCollectionFirestore,
	watchCollectionWithQueryFirestore
};