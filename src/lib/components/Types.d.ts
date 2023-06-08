export interface CustomOptionsEvents {
  generalVisibilityChanged: VisibilityChangedEventDetail
  filterOptionsChanged: FilterOptionsChangedEventDetail
  singleMapping: SingleMappingEventDetail
  multipleMapping: MultipleMappingEventDetail
  actionPerformed: ActionPerformedEventDetail
  deleteRow: DeleteRowEventDetail
  deleteRowInnerMapping: DeleteRowInnerMappingEventDetail
  rowChange: RowChangeEventDetail
  reviewerChanged: ReviewerChangedEventDetail
  updateUniqueConceptIds: UpdateUniqueConceptIdsEventDetail
  customMapping: CustomMappingEventDetail
  fileUploaded: FileUploadedEventDetail
  fileUploadWithColumnChanges: FileUploadWithColumnChanges
  settingsChanged: SettingsChangedEventDetail
  autoMapRow: AutoMapRowEventDetail
  autoComplete: AutoCompleteEventDetail
  updateDetails: UpdateDetailsEventDetail
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
  extra: IExtra
}

export interface MultipleMappingEventDetail {
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
  conceptId: string
  conceptName: string
  domainId: string
  vocabularyId: string
  conceptClassId: string
  standardConcept: string
  conceptCode: string
  validStartDate: string
  validEndDate: string
  invalidReason: string
  extra: IExtra
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

export interface SettingsChangedEventDetail {
  settings: ISettings
  autoMap?: boolean
}

export interface ICategories {
  altName: string
  altNameFacet: string
  options: string[]
}

export interface ISettings {
  mapToMultipleConcepts: boolean
  autoMap: boolean
  language: string
  author: string
  savedAuthors: string[]
  vocabularyIdCustomConcept: string
  fontsize: number
  popupSidesShowed: { settings: boolean; details: boolean }
}

export interface ITableInformation {
  totalRows: number | undefined
  mappedRows: number | undefined
  approvedRows: number | undefined
}

export interface IFilter {
  name: string
  categories: ICategories
}

export interface ICustomConcept {
  vocabularyId: string
  domainId: string
  conceptClassId: string
  conceptName: string
}

interface IExtra {
  comment: string
  reviewer: string
}