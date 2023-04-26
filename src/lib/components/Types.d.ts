import type { IColumnMetaData, SortDirection } from '../../../lib/RADar-DataTable/src/lib/components/DataTable'

export interface CustomOptionsEvents {
  generalVisibilityChanged: VisibilityChangedEventDetail
  filterOptionsChanged: FilterOptionsChangedEventDetail
  columnVisibilityChanged: ColumnVisibilityChangedEventDetail
  singleMapping: SingleMappingEventDetail
  multipleMapping: MultipleMappingEventDetail
  removeMapping: RemoveMappingEventDetail
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

export interface ColumnVisibilityChangedEventDetail {
  column: IColumnMetaData
  visible: boolean
}

export interface SingleMappingEventDetail {
  originalRow: Record<string, any>
  row: any[]
}

export interface MultipleMappingEventDetail {
  originalRow: Record<string, any>
  row: any[]
}

export interface RemoveMappingEventDetail {
  row: any[]
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
