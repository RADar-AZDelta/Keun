import { IDataTypeFunctionalities, type ICustomStoreOptions } from '@radar-azdelta/svelte-datatable/components/DataTable'

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
  currentRow: Record<string, any>
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

export interface CustomMappingInputEventDetail extends ICustomConcept {}

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

export interface ICategories {
  altName: string
  altNameFacet: string
  options: string[]
}

export interface ISides {
  filters: boolean; 
  details: boolean
}

export interface ISettings {
  mapToMultipleConcepts: boolean
  autoMap: boolean
  author?: IAuthor
  language: string
  savedAuthors: string[]
  vocabularyIdCustomConcept: string
  fontsize: number
  popupSidesShowed: ISides
}

export interface IAuthor {
  uid?: string | null
  name?: string | null
  roles?: [string]
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

export interface ISync {
  fileName: string
  blob?: Blob
  action?: "get" | "update"
}

export interface ICache {
  blob: Blob
  fileName: string
  action?: "get" | "update"
}

export interface ITablePagination {
  currentPage: number | undefined;
  rowsPerPage: number | undefined;
  totalRows: number | undefined;
}

export interface ICustomConcept {
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
}

export interface IMessage {
  result: string
  message: string
  details: any
}

export interface IFile {
  id: string
  name: string
  authors: string[] | string
  version: string
  content: string
}

export interface IFunctionalityImpl {
  getFiles(): Promise<string[] | void>
  getFilesAdmin(): Promise<string[] | void>
  editFile(fileName: string, authorizedAuthors: string[]): Promise<void>
  deleteFile(fileName: string): Promise<string[] | void>
  getAllAuthors(): Promise<Record<string, { email: string; files: Record<string, string> }> | void>
  downloadFile(fileName: string, usagiString?: boolean, customString?: boolean): Promise<void>
  uploadFile(file: File, authorizedAuthors: string[]): Promise<string[] | void>
  syncSettings(action: 'read' | 'write'): Promise<void>
  readFileFirstTime(fileName: string): Promise<{
    file: File | undefined;
    customConceptsFile: File | undefined;
} | void>
  watchValueFromDatabase(path: string, subCallback: () => unknown, remove?: boolean): Promise<void>
  getSavedAuthor(): Promise<void>
  logIn(author: string | null | undefined): Promise<void>
  cancelLogIn(backupAuthor: string | null | undefined): Promise<void>
  syncFile(data: ISync): Promise<File | void>
  cache(data: ICache): Promise<File | void>
  removeCache(fileName: string): Promise<void>
  checkForCache(fileName: string): Promise<boolean | void>
  getCachedFiles(): Promise<string[] | void>
  checkCustomConcepts(name: string): Promise<File | void>
}

export interface IUpdatedFunctionalityImpl {
  getFile(id: string): Promise<any>
  getFiles(): Promise<any>

}