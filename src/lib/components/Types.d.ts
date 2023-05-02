import type { IColumnMetaData, SortDirection } from 'svelte-radar-datatable'

export interface CustomOptionsEvents {
  generalVisibilityChanged: VisibilityChangedEventDetail
  filterOptionsChanged: FilterOptionsChangedEventDetail
  singleMapping: SingleMappingEventDetail
  multipleMapping: MultipleMappingEventDetail
  actionPerformed: ActionPerformedEventDetail
  autoMapping: AutoMappingEventDetail
  deleteRow: DeleteRowEventDetail
}

export interface VisibilityChangedEventDetail {
  visibility: boolean
  data?: any
}

export interface FilterOptionsChangedEventDetail {
  filters: Map<string, string[]>
}

export interface SingleMappingEventDetail {
  originalRow: Record<string, any>
  row: Record<string, any>
}

export interface MultipleMappingEventDetail {
  originalRow: Record<string, any>
  row: Record<string, any>
}

export interface ActionPerformedEventDetail {
  action: string
  index: number
}

export interface AutoMappingEventDetail {
  row: any[]
  index: number
}

export interface DeleteRowEventDetail {
  indexes: number[]
  sourceCode: string | number
  conceptId: string | number
}

export interface SingleSorting {
  column: string
  sortDirection: SortDirection
}

export interface SingleFiltering {
  column: string
  filter: TFilter
}

export interface ICategories {
  altName?: string
  options: string[]
}

export interface IStatus {
  color: string
  priority: number
  dependencies: IDependency[]
}

interface IDependency {
  column: string
  status: string
  equal: boolean
}
