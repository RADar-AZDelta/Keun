<script lang="ts">
  import { goto } from '$app/navigation'
  import { dev } from '$app/environment'
  import { base } from '$app/paths'
  import { fileName, implementation, implementationClass, settings } from '$lib/store'
  import Spinner from '$lib/components/Extra/Spinner.svelte'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'

  let files: string[] = [],
    file: File,
    fileInputDialog: HTMLDialogElement,
    authorsDialog: HTMLDialogElement,
    columnDialog: HTMLDialogElement,
    locationDialog: HTMLDialogElement,
    currentColumns: string[],
    missingColumns: Record<string, string> = {},
    userFilter: string,
    authorizedAuthors: string[],
    processing: boolean = false,
    chosenFile: string

  /////////////////////////////// Events regarding file input ///////////////////////////////

  // A method for when a file is dropped in the drag and drop area
  function dropHandler(event: DragEvent): void {
    if (dev) console.log('dropHandler: A file has been dropped in the drag and drop area')
    event.preventDefault()
    const allowedExtensions = ['csv']
    var reader = new FileReader()
    reader.onload = checkForMissingColumns
    if (!event.dataTransfer?.items) return
    if (event.dataTransfer.items.length > 1) return alert('Only drop one file')
    const item = event.dataTransfer.items[0]
    if (item.kind !== 'file') return alert('Drop an item of the kind file')
    const f = item.getAsFile()
    if (!f) return console.error('dropHandler: The file could not be processed.')
    const extension = f.name.split('.').pop()
    // Check if the extension is allowed, check the file for missing columns
    if (!extension || !allowedExtensions.includes(extension) || !f) return alert('The file is not allowed')
    file = f
    reader.readAsText(f)
  }

  // A method for when a new file has been put in the field
  function onFileInputChange(e: Event) {
    if (dev) console.log('onFileInputChange: A file has been upload via the input button')
    const allowedExtensions = ['csv']
    const inputFiles = (e.target as HTMLInputElement).files
    if (!inputFiles) return
    var reader = new FileReader()
    reader.onload = checkForMissingColumns
    // There will only be one file, split the name from the extension
    const extension = inputFiles[0].name.split('.').pop()
    // Check if the extension is allowed, check the file for missing columns
    if (!extension || !allowedExtensions.includes(extension)) return
    file = inputFiles[0]
    reader.readAsText(file)
  }

  // Read the content of the file, seperate the columns from the rows and check if all columns are in the file
  function checkForMissingColumns(this: FileReader, ev: ProgressEvent<FileReader>) {
    if (dev) console.log('checkForMissingColumns: Checking if there are missing columns in the file')
    if (!this.result) return
    let content = this.result.toString()
    let importantColumns: string[] = ['sourceCode', 'sourceName', 'sourceFrequency']
    if (!content) return
    // Check if all columns needed are available
    if (content.includes('sourceName') && content.includes('sourceCode') && content.includes('sourceFrequency')) return
    // Get all the columns from the document
    currentColumns = content.split(/\n/)[0].split(',')
    for (let i = 0; i < currentColumns.length; i++) {
      // Sometimes a column ends with multiple instances of ";" so this needs to be removed
      if (currentColumns[i].includes(';'))
        currentColumns[i] = currentColumns[i].substring(0, currentColumns[i].indexOf(';'))
    }
    importantColumns.forEach(col => {
      // If a important column is missing, add it to the missingColumns object, the corresponding column will be asigned to this object later
      if (!currentColumns.includes(col)) missingColumns[col] = ''
    })
    // Show the pop up where the user can select the corresponding columns to the missing important columns
    openColumnDialog()
    if (dev) console.log('checkForMissingColumns: All missing columns were identified')
  }

  /////////////////////////////// Methods regarding file upload && mapping ///////////////////////////////

  // A method to upload a file
  async function uploadFile() {
    if (dev) console.log('uploadFile: Uploading a file')
    await $implementationClass.checkCustomConcepts(file.name)
    // Upload the file to the storage depending on the implementationmethod
    const allFiles = await $implementationClass.uploadFile(file, authorizedAuthors)
    if (allFiles) files = allFiles
    closeFileInputDialog()
    if (dev) console.log('uploadFile: The file has been uploaded')
  }

  // A method to go to the mapping route without updating the file in IndexedDB for local mapping (the cached version is still in IndexedDB)
  async function mapCachedFile(fileName: string) {
    if (dev) console.log(`mapCachedFile: Go to the route "/mapping" to map the file: ${fileName}`)
    $fileName = fileName
    await $implementationClass.checkCustomConcepts(fileName)
    goto(`${base}/mapping`)
  }

  // A method to rename the columns to get a standardized version of the file
  function fileUploadWithColumnChanges() {
    if (dev) console.log('fileUploadWithColumnChanges: The file is uploading and process the column changes')
    if (!$settings?.author?.name) return console.error('fileUploadWithColumnChanges: There is no author name set.')
    if (!($implementation === 'firebase' && $settings?.author?.roles?.includes('Admin')) && !$implementation) return
    var reader = new FileReader()
    reader.onload = processUpdatedColumns
    reader.readAsText(file)
  }

  // Read the file and update the columns
  function processUpdatedColumns(this: FileReader, ev: ProgressEvent<FileReader>) {
    if (dev) console.log('processUpdatedColumns: Update the given columns to the expected columns')
    if (!ev.target?.result) return
    // Get the columns row of the file
    const fileContent = ev.target.result.toString()
    let columns = fileContent.substring(0, fileContent.indexOf('\n'))
    for (let [newColumn, oldColumn] of Object.entries(missingColumns)) {
      // Replace the old columns with the standardized columns
      columns = columns.replace(oldColumn, newColumn)
    }
    // Combine the columns and the rest of the file together
    const updatedFileContent = columns + fileContent.slice(fileContent.indexOf('\n'))
    const blob = new Blob([updatedFileContent], { type: 'text/csv' })
    file = new File([blob], file.name, { type: 'text/csv' })
    closeColumnDialog()
  }

  /////////////////////////////// Methods regarding deleting & editing a file ///////////////////////////////

  // A method to delete a file
  async function deleteFile(fileName: string) {
    if (dev) console.log('deleteFile: Deleting a file')
    processing = true
    await $implementationClass.deleteFile(fileName)
    await getFiles()
    processing = false
    if (dev) console.log('deleteFile: File has been deleted')
  }

  // A method to edit the authors that have access to a file
  async function editFile(fileName: string) {
    if (dev) console.log('editFile: The file is being edited')
    await $implementationClass.editFile(fileName, authorizedAuthors)
    closeAuthorsDialog()
    if (dev) console.log('editFile: The flie has been edited')
  }

  // A method to select a file and open the authors dialog
  async function editRights(e: Event, file: string) {
    if (e && e.stopPropagation) e.stopPropagation()
    if (!file.includes('_concept.csv')) {
      chosenFile = file
      openAuthorsDialog()
    }
  }

  /////////////////////////////// Methods regarding dialogs ///////////////////////////////

  function openLocationDialog() {
    if (locationDialog.attributes.getNamedItem('open') === null) locationDialog.showModal()
  }

  function closeLocationDialog() {
    if (locationDialog.attributes.getNamedItem('open') !== null) locationDialog.close()
  }

  function openFileInputDialog() {
    if (fileInputDialog.attributes.getNamedItem('open') === null) fileInputDialog.showModal()
  }

  function closeFileInputDialog() {
    if (fileInputDialog.attributes.getNamedItem('open') === null) return
    fileInputDialog.close()
    authorizedAuthors = []
  }

  function openAuthorsDialog() {
    if (authorsDialog.attributes.getNamedItem('open') === null) authorsDialog.showModal()
  }

  function closeAuthorsDialog() {
    if (authorsDialog.attributes.getNamedItem('open') === null) return
    authorsDialog.close()
    authorizedAuthors = []
  }

  function openColumnDialog() {
    if (columnDialog.attributes.getNamedItem('open') === null) columnDialog.showModal()
  }

  function closeColumnDialog() {
    if (columnDialog.attributes.getNamedItem('open') !== null) columnDialog.close()
  }

  /////////////////////////////// General methods ///////////////////////////////

  // A method to send the user to the mappingtool
  function openMappingTool(fileName: string) {
    if (dev) console.log('openMappingTool: Navigating to the mapping tool')
    if (fileName.includes('_concept.csv')) return
    $fileName = fileName
    goto(`${base}/mapping?impl=firebase&fileName=${fileName}`)
  }

  // A method to check if there is cache of files
  async function checkForCache() {
    if (dev) console.log('checkForCache: Checking for cache')
    const cached = await $implementationClass.checkForCache(file.name)
    // When the application is using Firebase, this function will always return void so the file will be uploaded
    // Checking for cache is only for local mapping without a cloud implementation
    if (cached) openLocationDialog()
    else await uploadFile()
  }

  /////////////////////////////// On click events ///////////////////////////////

  // A method to get all the files to map
  async function getFiles() {
    if (dev) console.log('getFiles: Get all the files in the database')
    const getFilesRes = await $implementationClass?.getFiles()
    if (getFilesRes) files = getFilesRes
  }

  // Download the file & eventual custom concepts file
  async function downloadFiles(e: Event, file: string) {
    if (e && e.stopPropagation) e.stopPropagation()
    await $implementationClass.downloadFile(file, true, false)
    await $implementationClass.downloadFile(`${file.split('.csv')[0]}_concept.csv`, false, true)
    await getFiles()
  }

  // Delete the files regarding the file name
  async function deleteFiles(e: Event, file: string) {
    if (e && e.stopPropagation) e.stopPropagation()
    deleteFile(file)
    deleteFile(`${file.split('.csv')[0]}_concept.csv`)
  }

  $: {
    // When the user changes, renew the files
    if ($settings.author && $implementationClass) getFiles()
  }

  $: {
    if (file) $fileName = file.name
  }
</script>

<svelte:head>
  <title>Keun</title>
  <meta
    name="description"
    content="Keun is a mapping tool to map concepts to OMOP concepts. It's a web based modern variant of Usagi."
  />
</svelte:head>

<dialog data-name="location-dialog" bind:this={locationDialog}>
  <div data-name="location-container">
    <button on:click={closeLocationDialog} data-name="close-dialog" disabled={processing}
      ><SvgIcon href="{base}/icons.svg" id="x" width="16px" height="16px" />
    </button>
    <h2>Do you want to use this file or the cached version of this file?</h2>
    <div data-name="button-choices">
      <button on:click={uploadFile}>File</button>
      <button on:click={() => mapCachedFile(file.name)}>Cached version</button>
    </div>
  </div>
</dialog>

<dialog bind:this={fileInputDialog} data-name="file-dialog">
  <div data-name="file-input-container">
    <h1 data-name="file-input-title">Upload a new file</h1>
    <button on:click={closeFileInputDialog} data-name="close-dialog" disabled={processing}
      ><SvgIcon href="{base}/icons.svg" id="x" width="16px" height="16px" />
    </button>
    <div data-name="drag-drop-container" on:drop={dropHandler} on:dragover|preventDefault>
      <label data-name="upload-file">
        {#if file}
          <SvgIcon href="{base}/icons.svg" id="excel" width="40px" height="40px" />
          <p>{file.name}</p>
        {:else}
          <SvgIcon href="{base}/icons.svg" id="upload" width="24px" height="24px" />
          <p>Drag or click to upload a file</p>
        {/if}
        <input type="file" name="file" id="file" accept=".csv" on:change={onFileInputChange} />
      </label>
    </div>
    {#if $implementation == 'firebase'}
      <h2>Select the authors that have permission to this file:</h2>
      <input type="text" placeholder="search for an user" bind:value={userFilter} />
      <ul data-name="authors-list">
        {#await $implementationClass?.getAllAuthors() then users}
          {#if users}
            {#each Object.entries(users) as [uid, info]}
              {#if userFilter && info.email?.toLowerCase().includes(userFilter?.toLowerCase())}
                <li>
                  <label>
                    <input
                      type="checkbox"
                      name={info.email}
                      id={info.email}
                      bind:group={authorizedAuthors}
                      value={uid}
                    />
                    {info.email}
                  </label>
                </li>
              {:else}
                <li>
                  <label>
                    <input
                      type="checkbox"
                      name={info.email}
                      id={info.email}
                      bind:group={authorizedAuthors}
                      value={uid}
                    />
                    {info.email}
                  </label>
                </li>
              {/if}
            {/each}
          {/if}
        {/await}
      </ul>
    {/if}
    <button on:click={checkForCache} disabled={file ? false : true || processing}>Upload</button>
    {#if processing}
      <Spinner />
    {/if}
  </div>
</dialog>

<dialog bind:this={columnDialog} data-name="column-dialog">
  <div data-name="dialog-container">
    <button data-name="close-dialog" on:click={closeColumnDialog}>
      <SvgIcon href="{base}/icons.svg" id="x" width="16px" height="16px" />
    </button>
    <h1>Set columns</h1>
    {#each Object.entries(missingColumns) as [newColumn, oldColumn]}
      <div data-name="column-selection">
        <p>{newColumn} column:</p>
        <select name={newColumn} id={newColumn} bind:value={missingColumns[newColumn]}>
          {#if currentColumns}
            {#each currentColumns as col}
              {#if col.toLowerCase() == newColumn.toLowerCase()}
                <option value={col} selected>{col}</option>
              {:else}
                <option value={col}>{col}</option>
              {/if}
            {/each}
          {/if}
        </select>
      </div>
    {/each}
    <div data-name="button-container">
      <button data-name="save" on:click={fileUploadWithColumnChanges}>Save</button>
    </div>
  </div>
</dialog>

<dialog bind:this={authorsDialog} data-name="authors-dialog">
  <div data-name="authors-container">
    <button on:click={closeAuthorsDialog} data-name="close-dialog" disabled={processing}
      ><SvgIcon href="{base}/icons.svg" id="x" width="16px" height="16px" />
    </button>
    <h1>Update the authorized authors</h1>
    <ul>
      {#await $implementationClass?.getAllAuthors() then users}
        {#if users}
          {#each Object.entries(users) as [uid, info]}
            {#if info.email}
              <li>
                <label>
                  <input
                    type="checkbox"
                    name={info.email}
                    id={info.email}
                    checked={info.files ? Object.values(info.files).includes(chosenFile) : false}
                    bind:group={authorizedAuthors}
                    value={uid}
                  />
                  {info.email}
                </label>
              </li>
            {/if}
          {/each}
        {/if}
      {/await}
    </ul>
    <button on:click={() => editFile(chosenFile)}>Update</button>
  </div>
</dialog>

<main data-name="files-screen">
  <section data-name="file-selection">
    <section data-name="file-container">
      <div data-name="file-menu">
        <h1>Files to map</h1>
        <div data-name="file-list">
          {#if $implementation == 'firebase'}
            {#if $settings?.author?.name}
              {#each files as file}
                <button data-name="file-card" on:click={() => openMappingTool(file)}>
                  <div data-name="file-name">
                    <SvgIcon href="{base}/icons.svg" id="excel" width="40px" height="40px" />
                    <p>{file}</p>
                  </div>
                  {#if $settings.author?.roles?.includes('Admin')}
                    <div>
                      <button data-name="download-file" on:click={e => downloadFiles(e, file)}>
                        <SvgIcon href="{base}/icons.svg" id="download" width="16px" height="16px" />
                      </button>
                      <button
                        disabled={file.includes('_concept.csv')}
                        data-name="edit-file"
                        on:click={e => {
                          editRights(e, file)
                        }}
                      >
                        <SvgIcon href="{base}/icons.svg" id="edit" width="16px" height="16px" />
                      </button>
                      <button
                        disabled={file.includes('_concept.csv')}
                        data-name="delete-file"
                        on:click={e => deleteFiles(e, file)}
                        ><SvgIcon href="{base}/icons.svg" id="x" width="16px" height="16px" /></button
                      >
                    </div>
                  {/if}
                </button>
              {/each}
            {:else}
              <div data-name="loader">
                <Spinner />
              </div>
            {/if}
          {:else}
            {#each files as file}
              <button
                data-name="file-card"
                disabled={file.includes('_concept.csv') ? true : false}
                on:click={() => mapCachedFile(file)}
              >
                <div data-name="file-name">
                  <SvgIcon href="{base}/icons.svg" id="excel" width="40px" height="40px" />
                  <p>{file}</p>
                </div>
                <div>
                  <button data-name="download-file" on:click={e => downloadFiles(e, file)}>
                    <SvgIcon href="{base}/icons.svg" id="download" width="16px" height="16px" />
                  </button>
                  <button
                    data-name="delete-file"
                    disabled={file.includes('_concept.csv') ? true : false}
                    on:click={e => {
                      deleteFiles(e, file)
                    }}
                  >
                    <SvgIcon href="{base}/icons.svg" id="x" width="16px" height="16px" />
                  </button>
                </div>
              </button>
            {/each}
          {/if}
        </div>
        {#if processing}
          <Spinner />
        {/if}
        <button on:click={openFileInputDialog} data-name="file-add">+ Add file</button>
      </div>
    </section>
  </section>
</main>
