import { writable } from 'svelte/store'
import type ITableData from './interfaces/ITableData'

const workerMess = writable<boolean>(false)

const mappedTable = writable<ITableData>()

const showPopup = writable<boolean>(false)

export { workerMess, mappedTable, showPopup }