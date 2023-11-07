<script lang="ts">
  import { dev } from '$app/environment'
  import type { SvelteComponent } from 'svelte'
  import { selectedFileId, databaseImplementation, databaseImpl, user } from '$lib/store'
  import { loadImplementationDB } from '$lib/implementation'
  import FileChoiceDialog from '$lib/components/menu/FileChoiceDialog.svelte'
  import FileInputDialog from '$lib/components/menu/FileInputDialog.svelte'
  import ColumnsDialog from '$lib/components/menu/ColumnsDialog.svelte'
  import AuthorsDialog from '$lib/components/menu/AuthorsDialog.svelte'
  import FirebaseImpl from '$lib/components/menu/FirebaseImpl.svelte'
  import LocalImpl from '$lib/components/menu/LocalImpl.svelte'
  import Spinner from '$lib/components/Extra/Spinner.svelte'
  import type { IFile } from '$lib/components/Types'
  import type {
    CheckForCacheEventDetail,
    DeleteFilesEventDetail,
    DownloadFilesEventDetail,
    EditRightsEventDetail,
    FileUpdatedColumnsEventDetail,
    FileUploadEventDetail,
  } from '$lib/components/Types'

  let files: IFile[] = [],
    file: File,
    currentColumns: string[],
    missingColumns: Record<string, string> = {},
    authorizedAuthors: string[],
    processing: boolean = false,
    chosenFile: string

  let fileInputDialog: SvelteComponent,
    authorsDialog: SvelteComponent,
    columnDialog: SvelteComponent,
    locationDialog: SvelteComponent

  /////////////////////////////// Methods regarding file upload && mapping ///////////////////////////////

  // A method to upload a file
  async function uploadFile(): Promise<void> {
    if (dev) console.log('uploadFile: Uploading a file')
    // Upload the file to the storage depending on the implementationmethod
    if (!$databaseImpl) await loadImplementationDB()
    await $databaseImpl!.uploadFile(file, authorizedAuthors)
    const filesFound = await $databaseImpl!.getFiles()
    if (filesFound) files = filesFound
    fileInputDialog.closeDialog()
    if (dev) console.log('uploadFile: The file has been uploaded')
  }

  /////////////////////////////// Methods regarding deleting & editing a file ///////////////////////////////

  // A method to select a file and open the authors dialog
  async function editRights(e: CustomEvent<EditRightsEventDetail>): Promise<void> {
    chosenFile = e.detail.id
    authorsDialog.showDialog()
  }

  /////////////////////////////// Methods regarding dialogs ///////////////////////////////

  function openFileInputDialog(): void {
    fileInputDialog.showDialog()
  }

  function openColumnDialog(): void {
    columnDialog.showDialog()
  }

  /////////////////////////////// General methods ///////////////////////////////

  // A method to check if there is cache of files
  async function checkForCache(e: CustomEvent<CheckForCacheEventDetail>): Promise<void> {
    if (dev) console.log('checkForCache: Checking for cache')
    if (!$databaseImpl) await loadImplementationDB()
    file = e.detail.file
    const cached = await $databaseImpl!.checkFileExistance(e.detail.file.name)
    // When the application is using Firebase, this function will always return void so the file will be uploaded
    // Checking for cache is only for local mapping without a cloud implementation
    if (cached) {
      $selectedFileId = cached.toString()
      locationDialog.showDialog()
    } else await uploadFile()
  }

  /////////////////////////////// On click events ///////////////////////////////

  // A method to get all the files to map
  async function getFiles(): Promise<void> {
    if (dev) console.log('getFiles: Get all the files in the database')
    if (!$databaseImpl) return
    const getFilesRes = await $databaseImpl?.getFiles()
    if (getFilesRes) files = getFilesRes
  }

  // Download the file & eventual custom concepts file
  async function downloadFiles(e: CustomEvent<DownloadFilesEventDetail>): Promise<void> {
    if (!$databaseImpl) await loadImplementationDB()
    await $databaseImpl!.downloadFile(e.detail.id)
    await getFiles()
  }

  // Delete the files regarding the file name
  async function deleteFiles(e: CustomEvent<DeleteFilesEventDetail>): Promise<void> {
    if (dev) console.log('deleteFile: Deleting a file')
    processing = true
    if (!$databaseImpl) await loadImplementationDB()
    await $databaseImpl!.deleteFile(e.detail.id)
    await getFiles()
    processing = false
    if (dev) console.log('deleteFile: File has been deleted')
  }

  async function reUploadFile(e: CustomEvent<FileUploadEventDetail>) {
    deleteFiles(e)
    uploadFile()
  }

  async function updateFileColumns(e: CustomEvent<FileUpdatedColumnsEventDetail>) {
    file = e.detail.file
  }

  $: {
    // When the user changes, renew the files
    if ($user && $databaseImpl) getFiles()
  }
</script>

<svelte:head>
  <title>Keun</title>
  <meta
    name="description"
    content="Keun is a mapping tool to map concepts to OMOP concepts. It's a web based modern variant of Usagi."
  />
</svelte:head>

<FileChoiceDialog bind:processing on:fileUpload={reUploadFile} bind:this={locationDialog} />

<FileInputDialog
  bind:processing
  on:columnsDialogShow={openColumnDialog}
  on:checkForCache={checkForCache}
  bind:this={fileInputDialog}
/>

<ColumnsDialog
  {missingColumns}
  {currentColumns}
  {file}
  on:fileUpdateColumns={updateFileColumns}
  bind:this={columnDialog}
/>

<AuthorsDialog bind:processing bind:chosenFile bind:this={authorsDialog} />

<main class="files-screen">
  <section class="file-selection">
    <section class="file-container">
      <div class="file-menu">
        <h1 class="title">Files to map</h1>
        <div class="file-list">
          {#if databaseImplementation === 'firebase'}
            <FirebaseImpl
              bind:files
              on:downloadFiles={downloadFiles}
              on:deleteFiles={deleteFiles}
              on:editRights={editRights}
            />
          {:else}
            <LocalImpl bind:files on:downloadFiles={downloadFiles} on:deleteFiles={deleteFiles} />
          {/if}
        </div>
        {#if processing}
          <Spinner />
        {/if}
        <button on:click={openFileInputDialog} class="file-add">+ Add file</button>
      </div>
    </section>
  </section>
</main>

<style>
  .files-screen {
    display: flex;
    flex-direction: column;
  }

  .file-selection {
    width: 100%;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
  }

  .file-container {
    width: 95%;
    flex: 1 1 auto;
    margin: auto;
    padding: 1rem 0 2rem 0;
  }

  .file-menu {
    height: 100%;
    border-radius: 10px;
    box-shadow: 3px 3px 3px lightgray;
    border: 1px solid lightgray;
    display: flex;
    flex-direction: column;
  }

  .title {
    padding: 0 1rem 1rem 1rem;
  }

  .file-list {
    flex: 1 1 auto;
    overflow-y: auto;
  }

  .file-add {
    width: 100%;
    background-color: inherit;
    border: 1px solid #cecece;
    font-size: 1rem;
  }

  .file-add:hover {
    background-color: #90ee90;
  }

  .file-add:focus {
    outline: none;
    box-shadow: 0 0 0 2px #7feb7f;
    background-color: #90ee90;
  }
</style>
