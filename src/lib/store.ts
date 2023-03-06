import { writable } from 'svelte/store'
import type ITableData from './interfaces/ITableData'

const mappedTable = writable<ITableData>()

const showPopup = writable<boolean>(false)

export { mappedTable, showPopup }
