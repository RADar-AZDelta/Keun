import type { deleteFileStorage } from '$lib/firebase'
import { IDataTypeFunctionalities, type ICustomStoreOptions, type IPagination } from '@radar-azdelta/svelte-datatable/components/DataTable'

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
  row: Record<string, any>
  index: number
}

export interface UpdateRowEventDetail {
  index: number
  row: Record<string, any>
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
  originalRow?: Record<string, any>
  row: Record<string, any>
  extra: IExtra
}

export interface CustomMappingInputEventDetail {
  row: ICustomConcept | Record<string, string>
}

export interface RemoveMappingEventDetail {
  conceptId: string
  conceptName: string
}

export interface NavigateRowEventDetail {
  row: Record<string, any>
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
}

export interface AutoCompleteEventDetail {
  id: string
  value: string | null
  key: string
}

export interface AutoCompleteShortEventDetail {
  value: string
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
  filters: boolean;
  details: boolean
}

export interface IUser {
  uid?: string | null
  name?: string | null
  roles?: [string]
}

interface IExtra {
  comment: string
  reviewer: string
}

export interface IDataTypeFile extends IDataTypeFunctionalities {
  syncFile(update?: boolean, get?: boolean): Promise<File | void>
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

export interface IConceptFiles {
  file: IFile
  customFile?: IFile
}

export interface IFile {
  id: string
  name: string
  authors: string[] | string
  version: number
  content: string
}

export interface IUserRestriction {
  id: string
  fileIds: string[]
}

export interface IMapRow {
  mappedIndex: number
  mappedRow: Record<string, any>
}

export interface IUpdatedFunctionalityImpl {
  getFile(id: string): Promise<IConceptFiles | void>
  checkFileExistance(name: string): Promise<boolean | string | void>
  getFiles(): Promise<IFile[] | void>
  getFilesAdmin(): Promise<IFile[] | void>
  uploadFile(file: File, authors: string[]): Promise<string[] | void>
  editFile(id: string, blob: Blob, customBlob?: Blob): Promise<void>
  editFileAuthors(id: string, authors: string[]): Promise<void>
  deleteFile(id: string): Promise<void>
  downloadFile(id: string): Promise<void>
  watchValueFromDatabase(path: string, subCallback: () => unknown, remove?: boolean): Promise<void>
}

export interface IAuthImpl {
  logIn(name?: string): Promise<void>
  logOut(): Promise<void>
  getAuthor(): Promise<string | null | void>

  getAllAuthors(): Promise<void | IUserRestriction>
}

export interface ISettingsImpl {
  getSettings(): Promise<ISettings>
  updateSettings(settings: ISettings): Promise<void>
}