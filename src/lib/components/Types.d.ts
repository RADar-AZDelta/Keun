import type { IColumnMetaData, SortDirection } from 'svelte-radar-datatable'

export interface CustomOptionsEvents {
  generalVisibilityChanged: VisibilityChangedEventDetail
  filterOptionsChanged: FilterOptionsChangedEventDetail
  singleMapping: SingleMappingEventDetail
  multipleMapping: MultipleMappingEventDetail
  actionPerformed: ActionPerformedEventDetail
  deleteRow: DeleteRowEventDetail
  rowChange: RowChangeEventDetail
  reviewerChanged: ReviewerChangedEventDetail
  updateUniqueConceptIds: UpdateUniqueConceptIdsEventDetail
}

export interface VisibilityChangedEventDetail {
  visibility: boolean
  data?: any
}

export interface FilterOptionsChangedEventDetail {
  filters: Map<string, string[]>
}

export interface SingleMappingEventDetail {
  originalRow?: Record<string, any>
  row: Record<string, any>
  extra?: ExtraData
}

export interface MultipleMappingEventDetail {
  originalRow?: Record<string, any>
  row: Record<string, any>
  extra?: ExtraData
}

export interface ActionPerformedEventDetail {
  action: string
  index: number
  row: Record<string, any>
}

export interface DeleteRowEventDetail {
  indexes: number[]
  sourceCode: string | number
  conceptId: string | number
  erase: boolean
}

export interface RowChangeEventDetail {
  up: boolean
}

export interface ReviewerChangedEventDetail {
  reviewer: string
}

export interface UpdateUniqueConceptIdsEventDetail {
  conceptId: string
  conceptName: string
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
  status: string | null
  equal: boolean
}

export interface ExtraData {
  comment: string
  assignedReviewer: string
}
