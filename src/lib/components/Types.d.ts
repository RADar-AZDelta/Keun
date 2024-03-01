import type { IFirestoreUser } from '$lib/implementations/databaseImpl/FirebaseImpl2'
import type { IDatabaseFile } from '$lib/implementations/databaseImpl/LocalImpl'
import type { IDataTypeFunctionalities } from '@radar-azdelta/svelte-datatable'

export interface IFileTemplate {
  file: File
  authorizedAuthors: string[]
}

export interface IFileIdTemplate {
  id: string
}

export interface IQueryResult {
  indices: number[]
  queriedData: IUsagiRow[]
}

export interface IUsagiActions {
  approveRow(): Promise<void>
  flagRow(): Promise<void>
  unapproveRow(): Promise<void>
}

export interface IUsagiLogic {
  updatePropertyValue(e: CustomEvent, column: string): Promise<void>
  deleteRow(): Promise<void>
}

export interface IStoreMethods {
  getUser(): Promise<IUser>
  getSettings(): Promise<ISettings>
  getMappedConceptsBib(): Promise<IMappedRows>
  getTableRow(index: number): Promise<IUsagiRow>
  updateTableRow(index: number, updatedProperties: object): Promise<void>
  updateTableRows(rows: Map<number, object>): Promise<void>
  insertTableRow(row: IUsagiRow): Promise<void>
  executeQueryOnTable(query: object): Promise<IQueryResult>
  updateMappedConceptsBib(updatedConcept: object): Promise<void>
}

export interface IMappingInformation {
  equivalence: string
  comment: string
  reviewer: string
}

export interface IMappingExtra {
  comment: string
  assignedReviewer: string
}

export interface IRowMappingInformation {
  athenaRow: IAthenaRow
  usagiRow: IUsagiRow
  usagiRowIndex: number
}

////////////////////////////// Events for the menu page //////////////////////////////

export interface PageEvents {
  fileDrop: FileDropED
  fileUpload: FileUploadED
  columnsDialogShow: ColumnsDialogShowED
  checkForCache: CheckForCacheED
  fileUpdateColumns: FileUpdatedColumnsED
  downloadFiles: DownloadFilesED
  deleteFiles: DeleteFilesED
  editRights: EditRightsED
}

export type FileDropED = IFileTemplate
export type FileUploadED = IFileIdTemplate
export interface ColumnsDialogShowED {
  missingColumns: Record<string, string>
  currentColumns: string[]
  file: File | undefined
}
export type CheckForCacheED = IFileTemplate
export type FileUpdatedColumnsED = IFileTemplate
export type DownloadFilesED = IFileIdTemplate
export type DeleteFilesED = IFileIdTemplate
export type EditRightsED = IFileIdTemplate

////////////////////////////// Events for the mapping page //////////////////////////////

export interface MappingEvents {
  rowSelection: RowSelectionED
  updateRow: UpdateRowED
  autoMapRow: AutoMapRowED
  deleteRow: DeleteRowED
  singleMapping: MappingED
  multipleMapping: MappingED
  customMappingInput: CustomMappingInputED
  removeMapping: RemoveMappingED
  navigateRow: NavigateRowED
  updateDetails: UpdateDetailsED
  equivalenceChange: EquivalenceChangeED
  updateError: UpdateErrorED
  customConceptAdded: CustomConceptAddedED
  mapCustomConcept: MapCustomConceptED
}

export interface RowSelectionED {
  row: IUsagiRow
  index: number
}

export interface UpdateRowED {
  index: number
  row: IUsagiRow
}

export interface AutoMapRowED {
  index: number
  sourceName: string
}

export interface DeleteRowED {
  index: number
  sourceCode: string
  erase: boolean
}

export interface MappingED {
  originalRow: IUsagiRow
  row: IAthenaRow
  extra: IExtra
  action: string
}

export interface CustomMappingInputED {
  row: ICustomConcept
  action: string
}

export interface RemoveMappingED {
  conceptId: number
  conceptName: string
}

export interface NavigateRowED {
  row: IUsagiRow
  index: number
}

export interface UpdateDetailsED {
  comment: string
  reviewer: string
}

export interface EquivalenceChangeED {
  equivalence: string
}

export interface UpdateErrorED {
  error: string
}

export interface CustomConceptAddedED {
  concept: ICustomConceptCompact
}

export interface MapCustomConceptED {
  concept: ICustomConcept
  action: string
}

////////////////////////////// Events for extra components //////////////////////////////

export interface ICustomEvents {
  autoComplete: AutoCompleteED
  autoCompleteShort: AutoCompleteShortED
  showColumns: ShowColumnsED
}

export interface AutoCompleteED {
  id: string
  value: string | null
  key: string
}

export interface AutoCompleteShortED {
  value: string
}

export interface ShowColumnsED {
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

export interface ICustomConceptCompact {
  concept_name: string
  concept_class_id: string
  domain_id: string
  vocabulary_id: string
  [key: string]: string
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

export interface ICustomConceptMappable {
  id: number
  name: string
  domain: string
  vocabulary: string
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
  id: number
  name: string
  domain: string
  vocabulary: string
  className: string
  standardConcept: string
  code: string
  equivalence: string
  invalidReason: string
  score: any
}

export interface ICustomConceptMappable {
  id: number
  name: string
  domain: string
  vocabulary: string
  className: string
  standardConcept: string
  code: string
  validStartDate: string
  validEndDate: string
  invalidReason: string
}

export interface IMappedRow {
  sourceCode: string
  sourceName: string
  conceptId: number
  conceptName: string
  customConcept: boolean
  [key: string]: string | number | boolean
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
  saveUserConfig(user: IUser | undefined): Promise<void>
  getCustomConcepts(): Promise<any>
  addCustomConcept(customConcept: ICustomConceptCompact): Promise<any>
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
