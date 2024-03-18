import { query, startAt, endAt, orderBy, getCountFromServer } from 'firebase/firestore'
import { getDoc, getDocs, deleteDoc, updateDoc, setDoc } from 'firebase/firestore'
import { DocumentSnapshot, Firestore, QueryConstraint, collection, doc, getFirestore } from 'firebase/firestore'
import Firebase from './Firebase.js'
import type { FirebaseError, FirebaseOptions } from 'firebase/app'
import type { IMessage } from './Types.js'

export default class FirebaseFirestore extends Firebase {
  private firestore: Firestore

  constructor(config: FirebaseOptions) {
    super(config)
    this.firestore = getFirestore(this.firebaseApp)
  }

  async writeToFirestore(collection: string, id: string, data: object) {
    await setDoc(doc(this.firestore, collection, id), data).catch(this.logErrorAndReturn)
  }

  async updateToFirestore(collection: string, id: string, data: object) {
    await updateDoc(doc(this.firestore, collection, id), data).catch(this.logErrorAndReturn)
  }

  async updateToFirestoreIfNotExist(collection: string, id: string, data: object) {
    const refer = doc(this.firestore, collection, id)
    const docSnap = await getDoc(refer).catch(() => {})
    if (!docSnap || !docSnap?.data()) return await this.writeToFirestore(collection, id, data)
    await this.updateToFirestore(collection, id, data)
  }

  async readFirestore(collection: string, id: string) {
    const refer = doc(this.firestore, collection, id)
    const docSnap: DocumentSnapshot | void = await getDoc(refer).catch(this.logErrorAndReturn)
    return docSnap
  }

  async readFirestoreCollection(coll: string) {
    const firestoreQuery = query(collection(this.firestore, coll))
    const querySnapshot = await getDocs(firestoreQuery).catch(this.logErrorAndReturn)
    return querySnapshot
  }

  async executeFilterQueryFirestore(coll: string, filters: QueryConstraint[]) {
    const firestoreQuery = query(collection(this.firestore, coll), ...filters)
    const querySnapshot = await getDocs(firestoreQuery).catch(this.logErrorAndReturn)
    return querySnapshot
  }

  async readFirestoreIndexes(coll: string, orderCol: string, start: number, end: number) {
    const firestoreQuery = query(collection(this.firestore, coll), orderBy(orderCol), startAt(start), endAt(end))
    const querySnapshot = await getDocs(firestoreQuery).catch(this.logErrorAndReturn)
    return querySnapshot
  }

  async getCountCollectionFirestore(coll: string) {
    const snapshot = await getCountFromServer(collection(this.firestore, coll))
    return snapshot.data().count
  }

  async deleteDocumentFirestore(coll: string, id: string) {
    const refer = doc(this.firestore, coll, id)
    await deleteDoc(refer).catch(this.logErrorAndReturn)
  }

  private logErrorAndReturn(error: FirebaseError) {
    const message: IMessage = { result: 'error', title: error.name, message: error.message }
    throw message
  }
}
