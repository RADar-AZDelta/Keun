<script lang="ts">
  import type {
    CheckForCacheED,
    ColumnsDialogShowED,
    DeleteFilesED,
    FileUpdatedColumnsED,
    IFileInformation,
    ProcessingED,
  } from '$lib/Types'
  import ColumnsDialog from '$lib/components/menu/ColumnsDialog.svelte'
  import FileChoiceDialog from '$lib/components/menu/FileChoiceDialog.svelte'
  import FileInputDialog from '$lib/components/menu/FileInputDialog.svelte'
  import { user } from '$lib/store'
  import { Spinner } from '@radar-azdelta-int/radar-svelte-components'
  import type { SvelteComponent } from 'svelte'
  import type { FileUploadED } from '$lib/Types'
  import { logWhenDev } from '@radar-azdelta-int/radar-utils'
  import FileMenu from '$lib/components/menu/FileMenu.svelte'
  import DatabaseImpl from '$lib/classes/implementation/DatabaseImpl'

  let files: IFileInformation[] = []
  let file: File
  let cols: string[] = []
  let missing: Record<string, string> = {}
  let processing: boolean = false
  let possibleEditingFileId: string | undefined = undefined

  let fileInputDialog: SvelteComponent, columnDialog: SvelteComponent, locationDialog: SvelteComponent

  async function uploadFile() {
    logWhenDev('uploadFile: Uploading a file')
    await DatabaseImpl.uploadKeunFile(file)
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
    logWhenDev('checkForCache: Checking for cache')
    ;({ file } = e.detail)
    const fileWithSameName = await DatabaseImpl.checkForFileWithSameName(file.name)
    fileInputDialog.closeDialog()
    if (!fileWithSameName) return await uploadFile()
    possibleEditingFileId = fileWithSameName
    locationDialog.showDialog()
  }

  async function getFiles() {
    logWhenDev('getFiles: Get all the files in the database')
    const getFilesRes = await DatabaseImpl.getFilesList()
    if (getFilesRes) files = getFilesRes
  }

  async function deleteFiles(e: CustomEvent<DeleteFilesED>) {
    logWhenDev('deleteFile: Deleting a file')
    processing = true
    const { id: fileId } = e.detail
    if (fileId) await DatabaseImpl.deleteKeunFile(fileId)
    await getFiles()
    processing = false
    logWhenDev('deleteFile: File has been deleted')
  }

  async function reUploadFile(e: CustomEvent<FileUploadED>) {
    await deleteFiles(e)
    await uploadFile()
    possibleEditingFileId = undefined
  }

  async function updateFileColumns(e: CustomEvent<FileUpdatedColumnsED>) {
    ;({ file } = e.detail)
    uploadFile()
  }

  const setProcessing = async (e: CustomEvent<ProcessingED>) => ({ processing } = e.detail)

  $: {
    if ($user) getFiles()
  }
</script>

<svelte:head>
  <title>Keun</title>
  <meta
    name="description"
    content="Keun is a mapping tool to map concepts to OMOP concepts. It's a web based modern variant of Usagi."
  />
</svelte:head>

<FileChoiceDialog
  bind:processing
  on:fileUpload={reUploadFile}
  currentFileId={possibleEditingFileId}
  bind:this={locationDialog}
/>

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
          <FileMenu bind:files on:processing={setProcessing} on:getFiles={getFiles} />
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
