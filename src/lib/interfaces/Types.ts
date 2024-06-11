import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
import type { Snippet } from 'svelte'

export interface IFileTemplate {
  file: File
}

export interface IFileIdTemplate {
  id: string | undefined
}

export interface IFirestoreFile {
  name: string
  custom: string
  customId: string
  flaggedId: string
  flaggedName: string
  domain: string | null
}

export interface IDatabaseFile {
  id: string
  name: string
  content: string
  custom: string
  customId: string
  flaggedId: string
  flagged: string
  domain: string | null
}

export interface IStorageMetadata {
  name: string
  customId: string
  flaggedId: string
  domain: string
  [key: string]: string
}

export interface IStorageCustomMetadata {
  customMetadata: IStorageMetadata
}

export interface IQueryResult {
  indices: number[]
  queriedData: IUsagiRow[]
}

export interface ICustomQueryResult {
  indices: number[]
  queriedData: ICustomConceptInput[]
}

export interface IUsagiInfo {
  usagiRow: IUsagiRow
  usagiRowIndex: number
}

export interface IAthenaInfo {
  athenaRow: IAthenaRow
  usagiRow: IUsagiRow
  usagiRowIndex: number
}

export interface IMappingExtra {
  comment: string
  assignedReviewer: string
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
  getFiles: void
  processing: ProcessingED
}

export type FileDropED = IFileTemplate
export type FileUploadED = IFileIdTemplate
export interface ColumnsDialogShowED {
  missingColumns: Record<string, string>
  currentColumns: string[]
  file: File | undefined
}
export interface CheckForCacheED {
  file: File
  domain: string | null
}

export type FileUpdatedColumnsED = IFileTemplate
export type DownloadFilesED = IFileIdTemplate
export type DeleteFilesED = IFileIdTemplate
export type EditRightsED = IFileIdTemplate
export interface ProcessingED {
  processing: boolean
}

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
  [key: string]: any
}

export interface ISides {
  filters: boolean
  details: boolean
}

interface IExtra {
  comment: string
  reviewer: string
}

export interface IMappedRows {
  [key: string]: IMappedRowsConcept
}

export interface IMappedRowsConcept {
  [key: number | string]: string
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

export interface IFile {
  id: string
  name: string
  file?: File
  customId: string
  flaggedId: string
  content?: string
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
  className?: string | null
  sourceAutoAssignedConceptIds?: string | null
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

export interface IFileInformation {
  id: string
  name: string
  customId: string
  custom: string
  domain: string | null
}

export interface IFileIds {
  id: string
  customId: string
  flaggedId: string
}

export interface IDatabaseImpl {
  getKeunFile(id: string): Promise<IFile | undefined>
  getCustomKeunFile(id: string): Promise<IFile | undefined>
  getFlaggedFile(id: string): Promise<IFile | undefined>
  downloadFiles(id: string): Promise<void>
  checkFileExistance(id: string): Promise<undefined | IFileIds>
  checkForFileWithSameName(name: string): Promise<false | string>
  getFilesList(): Promise<IFileInformation[]>
  uploadKeunFile(file: File, domain: string | null): Promise<void>
  editKeunFile(id: string, blob: Blob): Promise<void>
  editFlaggedFile(id: string, blob: Blob): Promise<void>
  editCustomKeunFile(id: string, blob: Blob): Promise<void>
  deleteKeunFile(id: string): Promise<void>
  getCustomConcepts(): Promise<any>
  addCustomConcept(customConcept: ICustomConceptCompact): Promise<any>
  updateCustomConcept(customConcept: ICustomConceptCompact, existingCustomConcept: ICustomConceptCompact): Promise<void>
  checkIfCustomConceptAlreadyExists(conceptInput: ICustomConceptCompact): Promise<boolean>
  checkForCustomConceptWithSameName(name: string): Promise<boolean>
  reset(): Promise<IFileInformation[]>
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

export interface IFileTab {
  id: string
  name: string
  domain: string | null
  confirmFileDeletion: (id: string, name: string) => Promise<void>
}

export interface IIconProps {
  id: string
  width?: string
  height?: string
}

export interface IColumnsDialogProps {
  missing: Record<string, string>
  cols: string[]
  file: File | undefined
  uploadFile: (file: File) => Promise<void>
}

export interface IFileInputDialogProps {
  processing: boolean
  checkForCache: (file: File, domain: string | null) => Promise<void>
  columnsDialogShow: (missingColumns: Record<string, string>, currentColumns: string[], file: File | undefined) => Promise<void>
}

export interface IFileMenuProps {
  files: IFileInformation[]
  setProcessing: (processing: boolean) => Promise<void>
}

export interface IAutoCompleteInputProps {
  id: string
  list: string[]
  inputValue?: string | null
  autoComplete: (id: string, value: string) => Promise<void>
}

export interface IAutoCompleteSettingsProps {
  autoComplete: (value: string) => Promise<void>
}

export interface ISwitchProps {
  id: string
  name: string
  checked: boolean
  updateValue?: (id: string, value: boolean) => Promise<void>
}

export interface IDetailsProps {
  usagiRow: IUsagiRow
  update: (reviewer: string, comment: string) => Promise<void>
  equivalenceUpdate: (equivalence: string) => Promise<void>
}

export interface IEquivalenceProps {
  equivalenceUpdate: (equivalence: string) => Promise<void>
}

export interface IAthenaSearchProps {
  selectedRow: IUsagiRow | undefined
  selectedRowIndex: number
  globalAthenaFilter: { column: string; filter: string | undefined }
  navigateRow: (row: IUsagiRow, index: number) => Promise<void>
}

export interface ISearchHeadProps {
  selectedRow: IUsagiRow
  index: number
  navigateRow: (row: IUsagiRow, index: number) => Promise<void>
}

export interface IShowColumnsDialogProps {
  dialog: HTMLDialogElement | undefined
  columns: string[]
  shownColumns: string[]
  showColumns: (columns: string[]) => Promise<void>
}

export interface IUsagiRowProps {
  renderedRow: Record<string, any>
  columns: IColumnMetaData[] | undefined
  index: number
  currentVisibleRows: Map<number, Record<string, any>>
  disabled: boolean
  rowSelection: (row: IUsagiRow, index: number) => Promise<void>
  autoMapRow: (index: number, sourceName: string) => Promise<void>
}

export interface IFileChoiceDialogProps {
  processing: boolean
  currentFileId: string | undefined
  fileUpload: (id: string | undefined) => Promise<void>
}

export interface ICustomViewProps {
  selectedRow: IUsagiRow
  selectedRowIndex: number
  equivalence: string
}

export interface ICustomRowProps {
  renderedRow: ICustomConceptCompact
  columns: IColumnMetaData[] | undefined
  originalIndex: number
  usagiRow: IUsagiRow
  usagiRowIndex: number
  equivalence: string
  updateError: (error: string | undefined) => Promise<void>
  addCustomConcept: (concept: ICustomConceptCompact) => Promise<void>
}

export interface IRowProps {
  usagiRow: IUsagiRow
  usagiRowIndex: number
  renderedRow: ICustomConceptCompact
  columns: IColumnMetaData[]
  equivalence: string
  updateError: (error: string | undefined) => Promise<void>
}

export interface IAddRowProps {
  columns: IColumnMetaData[]
  originalIndex: number
  renderedRow: ICustomConceptCompact
  updateError: (error: string | undefined) => Promise<void>
  addCustomConcept: (concept: ICustomConceptCompact) => Promise<void>
}

export interface IAthenaActionsProps {
  renderedRow: IAthenaRow
  selectedRow: IUsagiRow
  selectedRowIndex: number
  equivalence: string
}

export interface IMappedRowProps {
  renderedRow: IMappedRow
  usagiRow: IUsagiRow
}

export interface IMappedViewProps {
  selectedRow: IUsagiRow
}

export interface IAutocompleteProps {
  id: string
  list: string[]
  update: (id: string, value: string) => Promise<void>
}

export interface IDialogProps {
  dialog?: HTMLDialogElement
  width: string | number
  height: string | number
  title?: string
  children?: Snippet
  buttonsChildren?: Snippet
}

export interface IConfirmProps {
  dialog?: HTMLDialogElement
  title: string
  approveId: string
  approveProps?: object
  approve: (approveId: string, props?: object) => Promise<void>
}

export interface IDropProps {
  extensions: string[]
  children: Snippet
  fileDrop: (file: File) => Promise<void>
}

export interface ISvgIconProps {
  href?: string
  id: string
  width?: string
  height?: string
}

export interface IPaginationIntegratedProps {
  perPage?: number
  currentPage?: number
  perPageOptions?: number[]
  total: number
  child: Snippet<[start: number, end: number]>
}
