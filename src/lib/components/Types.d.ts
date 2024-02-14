import type { IFirestoreUser } from '$lib/implementations/databaseImpl/FirebaseImpl2'
import type { IDatabaseFile } from '$lib/implementations/databaseImpl/LocalImpl'
import type { IDataTypeFunctionalities } from '@radar-azdelta/svelte-datatable'

export interface IFileTemplate {
  file: File
}

export interface IFileIdTemplate {
  id: string
}

////////////////////////////// Events for the menu page //////////////////////////////

export interface PageEvents {
  fileDrop: FileDropEventDetail
  fileUpload: FileUploadEventDetail
  columnsDialogShow: ColumnsDialogShowEventDetail
  checkForCache: CheckForCacheEventDetail
  fileUpdateColumns: FileUpdatedColumnsEventDetail
  downloadFiles: DownloadFilesEventDetail
  deleteFiles: DeleteFilesEventDetail
  editRights: EditRightsEventDetail
}

export type FileDropEventDetail = IFileTemplate
export type FileUploadEventDetail = IFileIdTemplate
export interface ColumnsDialogShowEventDetail {
  missingColumns: Record<string, string>
  currentColumns: string[]
  file: File | undefined
}
export type CheckForCacheEventDetail = IFileTemplate
export type FileUpdatedColumnsEventDetail = IFileTemplate
export type DownloadFilesEventDetail = IFileIdTemplate
export type DeleteFilesEventDetail = IFileIdTemplate
export type EditRightsEventDetail = IFileIdTemplate

////////////////////////////// Events for the mapping page //////////////////////////////

export interface MappingEvents {
  rowSelection: RowSelectionEventDetail
  updateRow: UpdateRowEventDetail
  autoMapRow: AutoMapRowEventDetail
  deleteRow: DeleteRowEventDetail
  singleMapping: MappingEventDetail
  multipleMapping: MappingEventDetail
  customMappingInput: CustomMappingInputEventDetail
  removeMapping: RemoveMappingEventDetail
  navigateRow: NavigateRowEventDetail
  updateDetails: UpdateDetailsEventDetail
  equivalenceChange: EquivalenceChangeEventDetail
  updateError: UpdateErrorEventDetail
}

export interface RowSelectionEventDetail {
  row: IUsagiRow
  index: number
}

export interface UpdateRowEventDetail {
  index: number
  row: IUsagiRow
}

export interface AutoMapRowEventDetail {
  index: number
  sourceName: string
}

export interface DeleteRowEventDetail {
  index: number
  sourceCode: string
  erase: boolean
}

export interface MappingEventDetail {
  originalRow: IUsagiRow
  row: IAthenaRow
  extra: IExtra
  action: string
}

export interface CustomMappingInputEventDetail {
  row: ICustomConcept
  originalRow: ICustomConceptInput
}

export interface RemoveMappingEventDetail {
  conceptId: number
  conceptName: string
}

export interface NavigateRowEventDetail {
  row: IUsagiRow
  index: number
}

export interface UpdateDetailsEventDetail {
  comments: string
  reviewer: string
}

export interface EquivalenceChangeEventDetail {
  equivalence: string
}

export interface UpdateErrorEventDetail {
  error: string
}

////////////////////////////// Events for extra components //////////////////////////////

export interface ICustomEvents {
  autoComplete: AutoCompleteEventDetail
  autoCompleteShort: AutoCompleteShortEventDetail
  showColumns: ShowColumnsEventDetail
}

export interface AutoCompleteEventDetail {
  id: string
  value: string | null
  key: string
}

export interface AutoCompleteShortEventDetail {
  value: string
}

export interface ShowColumnsEventDetail {
  columns: string[]
}

////////////////////////////// Interfaces //////////////////////////////

export interface ISettings {
  mapToMultipleConcepts: boolean
  autoMap: boolean
  language: string
  savedAuthors: string[]
  vocabularyIdCustomConcept: string
  popupSidesShowed: ISides
}

export interface ICategories {
  altName: string
  altNameFacet: string
  options: string[]
}

export interface ISides {
  filters: boolean
  details: boolean
}

export interface IUser {
  uid?: string | null
  name?: string | null
  roles?: string[]
}

interface IExtra {
  comment: string
  reviewer: string
}

interface IMappedRows {
  [key: number]: string
}

export interface IDataTypeFile extends IDataTypeFunctionalities {
  syncFile(update?: boolean, get?: boolean): Promise<File | void>
}

export interface ITablePagination {
  currentPage: number | undefined
  rowsPerPage: number | undefined
  totalRows: number | undefined
}

export interface ICustomConceptInput {
  concept_id: number
  concept_code: string
  concept_name: string
  concept_class_id: string
  domain_id: string
  vocabulary_id: string
  standard_concept: string
  valid_start_date: string
  valid_end_date: string
  invalid_reason: string
}

export interface ICustomConcept {
  conceptId: number
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

export interface IConceptFiles {
  file: IFile
  customFile?: IFile
}

export interface IFile {
  id: string
  name: string
  file?: File
  customId: string
  content?: string
}

export interface IUserRestriction {
  id: string
  name: string
  fileIds: string[]
}

export interface IMapRow {
  mappedIndex: number
  mappedRow: IUsagiRow
}

export interface IAthenaRow {
  className: string
  code: string
  domain: string
  equivalence: string
  id: number
  invalidReason: string
  name: string
  score: any
  standardConcept: string
  vocabulary: string
}

export interface IMappedRow {
  sourceCode: string
  sourceName: string
  conceptId: number
  conceptName: string
  customConcept: boolean
}

export interface IUsagiRow extends IExtraUsagiCols, IUsagiMappedCols {
  sourceCode: string
  sourceFrequency: number
  sourceName: string
  [key: string]: any
}

export type IUsagiAllExtra = IUsagiMappedCols & IExtraUsagiCols

export interface IUsagiMappedCols {
  conceptId?: number | null
  conceptName?: string | null
  domainId?: string | null
  vocabularyId?: string | null
  sourceAutoAssignedConceptIds?: string | null
}

export interface ICustomColumn {
  id: string
  label?: string
  value?: any
}

export interface ICustomColumnConfig {
  inputAvailable: boolean
  value: string
  suggestions: Record<string, string>
}

export interface IExtraUsagiCols {
  'ADD_INFO:approvedBy'?: string | null
  'ADD_INFO:approvedOn'?: number | null
  'ADD_INFO:customConcept'?: boolean | null
  'ADD_INFO:lastAthenaFilter'?: string | null
  'ADD_INFO:numberOfConcepts'?: number | null
  matchScore?: number | null
  statusSetBy?: string | null
  statusSetOn?: number | null
  mappingType?: string | null
  assignedReviewer?: string | null
  comment?: string | null
  createdBy?: string | null
  createdOn?: number | null
  equivalence?: string | null
  mappingStatus?: string | null
}

export interface IUpdatedFunctionalityImpl {
  getFile(id: string): Promise<IConceptFiles | void>
  checkFileExistance(name: string): Promise<boolean | string | void>
  getFiles(userId?: string, roles?: string[]): Promise<IFile[] | void>
  uploadFile(file: File, authors: string[]): Promise<string[] | void>
  editFile(id: string, blob: Blob, customBlob?: Blob): Promise<void>
  editFileAuthors(id: string, authors: string[]): Promise<void>
  deleteFile(id: string): Promise<void>
  downloadFile(id: string): Promise<void>
  getAllAuthors(): Promise<void | IUserRestriction[]>
}

export interface IFileInformation {
  id: string
  name: string
  customId: string
  custom: string
}

export interface IFileIds {
  id: string
  customId: string
}

export interface IDatabaseImpl {
  getKeunFile(id: string): Promise<IFile | undefined>
  getCustomKeunFile(id: string): Promise<IFile | undefined>
  downloadFiles(id: string): Promise<void>
  checkFileExistance(id: string): Promise<undefined | IFileIds>
  getFilesList(): Promise<IFileInformation[]>
  uploadKeunFile(file: File, authors: string[]): Promise<void>
  editKeunFile(id: string, blob: Blob): Promise<void>
  editCustomKeunFile(id: string, blob: Blob): Promise<void>
  editKeunFileAuthors(id: string, authors: string[]): Promise<void>
  deleteKeunFile(id: string): Promise<void>
  getAllPossibleAuthors(): Promise<IFirestoreUser[]>
}

export interface IAuthImpl {
  logIn(name?: string): Promise<void>
  logOut(): Promise<void>
  getAuthor(): Promise<string | null | void>
}

export interface ISettingsImpl {
  getSettings(): Promise<ISettings>
  updateSettings(settings: ISettings): Promise<void>
}
