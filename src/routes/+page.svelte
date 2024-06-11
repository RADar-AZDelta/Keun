<script lang="ts">
  import ColumnsDialog from '$lib/components/menu/ColumnsDialog.svelte'
  import FileChoiceDialog from '$lib/components/menu/FileChoiceDialog.svelte'
  import FileInputDialog from '$lib/components/menu/FileInputDialog.svelte'
  import FileMenu from '$lib/components/menu/FileMenu.svelte'
  import Database from '$lib/helpers/Database'
  import type { SvelteComponent } from 'svelte'
  import type { IFileInformation } from '$lib/interfaces/Types'
  import { dev } from '$app/environment'
  import { createUser } from '$lib/stores/runes.svelte'
  import Spinner from '$lib/components/extra/Spinner.svelte'

  let files: IFileInformation[] = $state([])
  let file: File | undefined = $state(undefined)
  let domain: string | null = $state(null)
  let cols: string[] = $state([])
  let missing: Record<string, string> = $state({})
  let processing: boolean = $state(false)
  let possibleEditingFileId: string | undefined = $state(undefined)

  let fileInputDialog: SvelteComponent, columnDialog: SvelteComponent, locationDialog: SvelteComponent
  let user = createUser()

  async function uploadFile() {
    if (dev) console.log('uploadFile: Uploading a file')
    if (!file) return
    await Database.uploadKeunFile(file, domain)
    await getFiles()
    fileInputDialog.closeDialog()
  }

  const openFileInputDialog = async () => fileInputDialog.showDialog()

  async function openColumnDialog(missingColumns: Record<string, string>, currentColumns: string[], newFile: File | undefined) {
    missing = missingColumns
    cols = currentColumns
    if (newFile) file = newFile
    columnDialog.showDialog()
  }

  async function checkForCache(newFile: File, newDomain: string | null) {
    if (dev) console.log('checkForCache: Checking for cache')
    file = newFile
    domain = newDomain
    const fileWithSameName = await Database.checkForFileWithSameName(file.name)
    fileInputDialog.closeDialog()
    if (!fileWithSameName) return await uploadFile()
    possibleEditingFileId = fileWithSameName
    locationDialog.showDialog()
  }

  async function getFiles() {
    if (dev) console.log('getFiles: Get all the files in the database')
    const getFilesRes = await Database.getFilesList()
    if (getFilesRes) files = getFilesRes
  }

  async function deleteFiles(fileId: string | undefined) {
    if (dev) console.log('deleteFile: Deleting a file')
    processing = true
    if (fileId) await Database.deleteKeunFile(fileId)
    processing = false
    if (dev) console.log('deleteFile: File has been deleted')
  }

  async function reUploadFile(id: string | undefined) {
    await deleteFiles(id)
    await uploadFile()
    possibleEditingFileId = undefined
  }

  async function updateFileColumns(newFile: File) {
    file = newFile
    uploadFile()
  }

  async function setProcessing(process: boolean) {
    processing = process
  }

  $effect(() => {
    if (user.value) getFiles()
  })
</script>

<svelte:head>
  <title>Keun</title>
  <meta name="description" content="Keun is a mapping tool to map concepts to OMOP concepts. It's a web based modern variant of Usagi." />
</svelte:head>

<FileChoiceDialog bind:processing fileUpload={reUploadFile} currentFileId={possibleEditingFileId} bind:this={locationDialog} />

<FileInputDialog bind:processing columnsDialogShow={openColumnDialog} {checkForCache} bind:this={fileInputDialog} />

<ColumnsDialog {missing} {cols} {file} uploadFile={updateFileColumns} bind:this={columnDialog} />

<main class="files-screen">
  <section class="file-selection">
    <section class="file-container">
      <div class="file-menu">
        <div class="title-container">
          <h1 class="title">Files to map</h1>
        </div>
        <div class="file-list">
          <FileMenu {files} {setProcessing} />
        </div>
        {#if processing}
          <Spinner />
        {/if}
        <button onclick={openFileInputDialog} class="file-add">+ Add file</button>
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

  .title-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0.5rem 1rem;
  }

  .file-list {
    flex: 1 1 auto;
    overflow-y: hidden;
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
