import { IDataTypeFunctionalities } from '@radar-azdelta/svelte-datatable/components/DataTable'

export interface CustomOptionsEvents {
  generalVisibilityChanged: VisibilityChangedEventDetail
  filterOptionsChanged: FilterOptionsChangedEventDetail
  singleMapping: MappingEventDetail
  multipleMapping: MappingEventDetail
  actionPerformed: ActionPerformedEventDetail
  deleteRow: DeleteRowEventDetail
  deleteRowInnerMapping: DeleteRowInnerMappingEventDetail
  rowChange: RowChangeEventDetail
  reviewerChanged: ReviewerChangedEventDetail
  updateUniqueConceptIds: UpdateUniqueConceptIdsEventDetail
  customMapping: CustomMappingEventDetail
  customMappingInput: CustomMappingInputEventDetail
  fileUploadWithColumnChanges: FileUploadWithColumnChanges
  autoMapRow: AutoMapRowEventDetail
  autoComplete: AutoCompleteEventDetail
  updateDetails: UpdateDetailsEventDetail
  fileUploaded: FileUploadedEventDetail
}

export interface VisibilityChangedEventDetail {
  visibility: boolean
  data?: any
}

export interface FilterOptionsChangedEventDetail {
  filters: Map<string, string[]>
}

export interface MappingEventDetail {
  originalRow?: Record<string, any>
  row: Record<string, any>
  extra: IExtra
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

export interface DeleteRowInnerMappingEventDetail {
  conceptId: string
  conceptName: string
  erase: boolean
  custom: boolean
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
  multiple: boolean
}

export interface CustomMappingEventDetail {
  customConcept: CustomMappingInputEventDetail
  extra: IExtra
}

export interface CustomMappingInputEventDetail {
  domainId: string
  vocabularyId: string
  conceptClassId: string
  conceptName: string
  conceptId: string
  standardConcept: string
  conceptCode: string
  validStartDate: string
  validEndDate: string
  invalidReason: string
}

export interface AutoMapRowEventDetail {
  index: number
  sourceName: string
}

export interface AutoCompleteEventDetail {
  id: string
  value: any
  key: string
}

export interface UpdateDetailsEventDetail {
  index: number
  comment: string
  assignedReviewer: string
}

export interface FileUploadedEventDetail {
  file: File
}

export interface FileUploadWithColumnChanges {
  file: File
  columnChange: Record<string, string>
}

export interface ICategories {
  altName: string
  altNameFacet: string
  options: string[]
}

export interface ISettings {
  mapToMultipleConcepts: boolean
  autoMap: boolean
  author?: string
  language: string
  savedAuthors: string[]
  vocabularyIdCustomConcept: string
  fontsize: number
  popupSidesShowed: { filters: boolean; details: boolean }
}

export interface IFilter {
  name: string
  categories: ICategories
}

interface IExtra {
  comment: string
  reviewer: string
}

export interface IDatabaseFile {
  data: Record<string, any>[]
  fileName: string
  usersUID?: string[]
}

export interface IDataTypeFile extends IDataTypeFunctionalities {
  syncFile(update?: boolean, get?: boolean): Promise<File | void>
}