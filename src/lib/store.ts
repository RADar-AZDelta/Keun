import { writable } from 'svelte/store'

const mappedTable = writable<any>()

const showPopup = writable<boolean>(false)

export { mappedTable, showPopup }
