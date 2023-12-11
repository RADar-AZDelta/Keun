<script lang="ts">
  import { dev } from '$app/environment'
  import type { SvelteComponent } from 'svelte'
  import { Spinner } from 'components'
  import { selectedFileId, databaseImplementation, databaseImpl, user } from '$lib/store'
  import { loadImplementationDB } from '$lib/implementations/implementation'
  import FileChoiceDialog from '$lib/components/menu/FileChoiceDialog.svelte'
  import FileInputDialog from '$lib/components/menu/FileInputDialog.svelte'
  import ColumnsDialog from '$lib/components/menu/ColumnsDialog.svelte'
  import AuthorsDialog from '$lib/components/menu/AuthorsDialog.svelte'
  import FirebaseImpl from '$lib/components/menu/FirebaseImpl.svelte'
  import LocalImpl from '$lib/components/menu/LocalImpl.svelte'
  import type {
    DownloadFilesEventDetail,
    EditRightsEventDetail,
    FileUpdatedColumnsEventDetail,
    FileUploadEventDetail,
    ColumnsDialogShowEventDetail,
    CheckForCacheEventDetail,
    DeleteFilesEventDetail,
    IFile,
  } from '$lib/components/Types'

  let files: IFile[] = [],
    file: File,
    cols: string[] = [],
    missing: Record<string, string> = {},
    authorizedAuthors: string[],
    processing: boolean = false,
    selected: string

  let fileInputDialog: SvelteComponent,
    authorsDialog: SvelteComponent,
    columnDialog: SvelteComponent,
    locationDialog: SvelteComponent

  // A method to upload a file & refetch all the files
  async function uploadFile(): Promise<void> {
    if (dev) console.log('uploadFile: Uploading a file')
    if (!$databaseImpl) await loadImplementationDB()
    await $databaseImpl!.uploadFile(file, authorizedAuthors)
    await getFiles()
    fileInputDialog.closeDialog()
  }

  // Select the correct file & show a pop-up to change the authors
  async function editRights(e: CustomEvent<EditRightsEventDetail>): Promise<void> {
    selected = e.detail.id
    authorsDialog.showDialog()
  }

  // Open the input pop-up to add a file
  async function openFileInputDialog(): Promise<void> {
    fileInputDialog.showDialog()
  }

  // Open the pop-up to change missing columns to the correct name
  async function openColumnDialog(e: CustomEvent<ColumnsDialogShowEventDetail>): Promise<void> {
    if (e.detail.file) file = e.detail.file
    missing = e.detail.missingColumns
    cols = e.detail.currentColumns
    columnDialog.showDialog()
  }

  // A method to check if there is cache of files
  async function checkForCache(e: CustomEvent<CheckForCacheEventDetail>): Promise<void> {
    if (dev) console.log('checkForCache: Checking for cache')
    if (!$databaseImpl) await loadImplementationDB()
    file = e.detail.file
    const cached = await $databaseImpl!.checkFileExistance(e.detail.file.name)
    if (!cached) return await uploadFile()
    $selectedFileId = cached.toString()
    locationDialog.showDialog()
  }

  // A method to get all the files to map
  async function getFiles(): Promise<void> {
    if (dev) console.log('getFiles: Get all the files in the database')
    if (!$databaseImpl) await loadImplementationDB()
    const getFilesRes = await $databaseImpl?.getFiles($user.uid ?? undefined, $user.roles ?? [])
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

  // When choosing to delete the cache & upload the file with the same name again
  async function reUploadFile(e: CustomEvent<FileUploadEventDetail>): Promise<void> {
    deleteFiles(e)
    uploadFile()
  }

  // Update the columns to the correct name in a file
  async function updateFileColumns(e: CustomEvent<FileUpdatedColumnsEventDetail>) {
    file = e.detail.file
    uploadFile()
  }

  $: {
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

<ColumnsDialog {missing} {cols} {file} on:fileUpdateColumns={updateFileColumns} bind:this={columnDialog} />

<AuthorsDialog bind:processing bind:selected bind:this={authorsDialog} />

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
