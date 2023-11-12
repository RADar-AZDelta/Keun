export class IndexedDB {
    dbName: string
    storeName: string
    db: Promise<IDBDatabase>

    constructor(dbName: string, storeName: string) {
        this.dbName = dbName
        this.storeName = storeName
        this.db = new Promise((resolve, reject) => {
            const openReq = indexedDB.open(this.dbName)
            openReq.onerror = () => reject(openReq.error)
            openReq.onsuccess = () => resolve(openReq.result)
            openReq.onupgradeneeded = () => openReq.result.createObjectStore(this.storeName)
        })
    }

    async get (key: IDBValidKey, single: boolean = false, autoClose?: boolean): Promise<any> {
        return new Promise(async (resolve, reject) => {
            const db = await this.db
            let getReq: IDBRequest<any>
            const transaction = db.transaction(this.storeName, 'readonly')
            transaction.oncomplete = () => {
                if(autoClose) db.close()
                resolve(getReq ? getReq.result : undefined)
            }
            transaction.onabort = transaction.onerror = () => {
                reject(transaction.error)
            }
            if(!key) return
            if(single) getReq = transaction.objectStore(this.storeName).get(key)
            else getReq = transaction.objectStore(this.storeName).getAll(key)
        })
    }

    async getAll(autoClose?: boolean): Promise<any> {
        return new Promise(async (resolve, reject) => {
            const db = await this.db
            let getReq: IDBRequest<any>
            const transaction = db.transaction(this.storeName, 'readonly')
            transaction.oncomplete = () => {
                if(autoClose) db.close()
                resolve(getReq ? getReq.result : undefined)
            }
            transaction.onabort = transaction.onerror = () => {
                reject(transaction.error)
            }
            getReq = transaction.objectStore(this.storeName).getAll()
        })
    }

    async set (value: any, key: IDBValidKey, autoClose?: boolean): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const db = await this.db
            const transaction = db.transaction(this.storeName, 'readwrite')
            transaction.oncomplete = () => {
                if(autoClose) db.close()
                resolve()
            }
            transaction.onabort = transaction.onerror = () => {
                reject(transaction.error)
            }
            transaction.objectStore(this.storeName).put(value, key)
        })
    }

    async add (value: any, key?: IDBValidKey, autoClose?: boolean): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const db = await this.db
            const transaction = db.transaction(this.storeName, 'readwrite')
            transaction.oncomplete = () => {
                if(autoClose) db.close()
                resolve()
            }
            transaction.onabort = transaction.onerror = () => {
                reject(transaction.error)
            }
            if(key) transaction.objectStore(this.storeName).add(value, key)
            else transaction.objectStore(this.storeName).add(value)
        })
    }

    async remove (key: IDBValidKey, autoClose?: boolean): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const db = await this.db
            const transaction = db.transaction(this.storeName, 'readwrite')
            transaction.oncomplete = () => {
                if(autoClose) db.close()
                resolve()
            }
            transaction.onabort = transaction.onerror = () => {
                reject(transaction.error)
            }
            transaction.objectStore(this.storeName).delete(key)
        })
    }

    async clear (autoClose?: boolean): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const db = await this.db
            const transaction = db.transaction(this.storeName, 'readwrite')
            transaction.oncomplete = () => {
                if(autoClose) db.close()
                resolve()
            }
            transaction.onabort = transaction.onerror = () => {
                reject(transaction.error)
            }
            transaction.objectStore(this.storeName).clear()
        })
    }

    async keys (autoClose?: boolean): Promise<any[]> {
        return new Promise(async (resolve, reject) => {
            const db = await this.db
            let getReq: IDBRequest<any>
            const transaction = db.transaction(this.storeName, 'readonly')

            transaction.oncomplete = () => {
                if(autoClose) db.close()
                resolve(getReq ? getReq.result : undefined)
            }

            transaction.onabort = transaction.onerror = () => {
                reject(transaction.error)
            }

            getReq = transaction.objectStore(this.storeName).getAllKeys()
        })
    }

    async close(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const db = await this.db
            db.close()
            resolve()
        })
    }
}