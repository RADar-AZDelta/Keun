<script lang="ts">
  import { dev } from '$app/environment'
  import type {
    CheckForCacheED,
    ColumnsDialogShowED,
    DeleteFilesED,
    DownloadFilesED,
    FileUpdatedColumnsED,
    IFileInformation,
  } from '$lib/components/Types'
  import ColumnsDialog from '$lib/components/menu/ColumnsDialog.svelte'
  import FileChoiceDialog from '$lib/components/menu/FileChoiceDialog.svelte'
  import FileInputDialog from '$lib/components/menu/FileInputDialog.svelte'
  import FirebaseImpl from '$lib/components/menu/FirebaseImpl.svelte'
  import LocalImpl from '$lib/components/menu/LocalImpl.svelte'
  import { loadImplDB } from '$lib/implementations/implementation'
  import { databaseImpl, databaseImplementation, user } from '$lib/store'
  import { Spinner } from '@radar-azdelta-int/radar-svelte-components'
  import type { SvelteComponent } from 'svelte'
  import type { FileUploadED } from '$lib/components/Types'

  let files: IFileInformation[] = []
  let file: File
  let cols: string[] = []
  let missing: Record<string, string> = {}
  let processing: boolean = false

  let fileInputDialog: SvelteComponent, columnDialog: SvelteComponent, locationDialog: SvelteComponent

  async function uploadFile() {
    if (dev) console.log('uploadFile: Uploading a file')
    if (!$databaseImpl) await loadImplDB()
    await $databaseImpl!.uploadKeunFile(file)
    await getFiles()
    fileInputDialog.closeDialog()
  }

  const openFileInputDialog = async () => fileInputDialog.showDialog()

  async function openColumnDialog(e: CustomEvent<ColumnsDialogShowED>) {
    if (e.detail.file) ({ file } = e.detail)
    ;({ missingColumns: missing, currentColumns: cols } = e.detail)
    columnDialog.showDialog()
  }

  async function checkForCache(e: CustomEvent<CheckForCacheED>) {
    if (dev) console.log('checkForCache: Checking for cache')
    if (!$databaseImpl) await loadImplDB()
    ;({ file } = e.detail)
    const cached = await $databaseImpl!.checkFileExistance(file.name)
    fileInputDialog.closeDialog()
    if (!cached) return await uploadFile()
    locationDialog.showDialog()
  }

  async function getFiles() {
    if (dev) console.log('getFiles: Get all the files in the database')
    if (!$databaseImpl) await loadImplDB()
    const getFilesRes = await $databaseImpl?.getFilesList()
    if (getFilesRes) files = getFilesRes
  }

  async function downloadFiles(e: CustomEvent<DownloadFilesED>) {
    if (!$databaseImpl) await loadImplDB()
    const { id } = e.detail
    await $databaseImpl?.downloadFiles(id)
    await getFiles()
  }

  async function deleteFiles(e: CustomEvent<DeleteFilesED>) {
    if (dev) console.log('deleteFile: Deleting a file')
    processing = true
    if (!$databaseImpl) await loadImplDB()
    const { id: fileId } = e.detail
    await $databaseImpl!.deleteKeunFile(fileId)
    await getFiles()
    processing = false
    if (dev) console.log('deleteFile: File has been deleted')
  }

  async function reUploadFile(e: CustomEvent<FileUploadED>) {
    await deleteFiles(e)
    await uploadFile()
  }

  async function updateFileColumns(e: CustomEvent<FileUpdatedColumnsED>) {
    ;({ file } = e.detail)
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

<main class="files-screen">
  <section class="file-selection">
    <section class="file-container">
      <div class="file-menu">
        <h1 class="title">Files to map</h1>
        <div class="file-list">
          {#if databaseImplementation === 'firebase'}
            {#if ($user?.roles?.includes('user') || $user?.roles?.includes('admin')) && files}
              <FirebaseImpl bind:files on:downloadFiles={downloadFiles} on:deleteFiles={deleteFiles} />
            {:else}
              <p class="rights-error">You do not have sufficient rights, contact an admin please.</p>
            {/if}
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

  .rights-error {
    text-align: center;
    margin: 0 0 1rem 0;
  }
</style>
