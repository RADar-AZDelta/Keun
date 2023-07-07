<script lang="ts">
  import Spinner from '$lib/components/Extra/Spinner.svelte'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import {
    deleteDatabase,
    deleteFileStorage,
    pushToDatabase,
    readDatabase,
    readFileStorage,
    uploadFileToStorage,
    userSessionStore,
    writeToDatabase,
  } from '$lib/firebase'
  import { writable } from 'svelte/store'
  import { goto } from '$app/navigation'
  import { dev } from '$app/environment'

  let files: string[] = []
  let fileInputDialog: HTMLDialogElement, authorsDialog: HTMLDialogElement, columnDialog: HTMLDialogElement
  let currentColumns: string[],
    missingColumns: Record<string, string> = {}
  let file: File
  let userFilter: string
  let authorizedAuthors: string[]
  let processing = writable<boolean>(false)
  let chosenFile: string

  // A method to get the files for the current user
  async function getFiles() {
    // Check if the user has logged in
    if ($userSessionStore?.uid) {
      let filesArray: Record<string, string>
      // If the user has the role admin, get all the files
      if ($userSessionStore.roles?.includes('Admin')) {
        filesArray = await readDatabase(`/admin`)
      } else {
        // If the user is not an admin, get the files that the user has access to
        filesArray = await readDatabase(`/authors/${$userSessionStore.uid}/files`)
      }
      if (filesArray) files = Object.values(filesArray)
      else files = []
    } else files = []
  }

  // A method to get all the authors of the application
  async function getAllAuthors(): Promise<Record<string, { email: string; files: Record<string, string> }> | void> {
    if ($userSessionStore?.uid)
      return (await readDatabase('/authors')) as Record<string, { email: string; files: Record<string, string> }>
    else return
  }

  // A method to upload a file
  async function fileUploaded() {
    if (file) {
      // If the file is uploaded, push it to Firebase
      await uploadFileToStorage(`/mapping-files/${file.name}`, file)
      // Push the file name to admin in Firebase
      await pushToDatabase('/admin', file.name)
      if (authorizedAuthors) {
        for (let u of authorizedAuthors) {
          // For every authorized author for this file, push the name to there Firebase object
          await pushToDatabase(`/authors/${u}/files`, file.name)
        }
      }
      // Set the version & lastAuthor for this file in Firebase
      await writeToDatabase(`/files/${file.name.substring(0, file.name.indexOf('.'))}`, { version: 1, lastAuthor: '' })
    }
    // Get all the files again to see the new file
    getFiles()
    fileInputDialog.close()
  }

  // A method for when a new file has been put in the field
  function onFileInputChange(e: Event) {
    const allowedExtensions = ['csv', 'json']
    const inputFiles = (e.target as HTMLInputElement).files
    if (!inputFiles) return

    var reader = new FileReader()

    reader.onload = () => {
      let content = reader.result?.toString()
      let importantColumns: string[] = ['sourceCode', 'sourceName', 'sourceFrequency']
      if (content) {
        // Check if all columns needed are available
        if (
          !content.includes('sourceName') ||
          !content.includes('sourceCode') ||
          !content.includes('sourceFrequency')
        ) {
          currentColumns = content.split(/\n/)[0].split(',')
          importantColumns.forEach(col => {
            if (!currentColumns.includes(col)) missingColumns[col] = ''
          })
          columnDialog.showModal()
        }
      }
      return
    }

    for (const f of inputFiles) {
      const extension = f.name.split('.').pop()
      if (extension && allowedExtensions.includes(extension)) {
        file = f
        reader.readAsText(f)
        break
      }
    }
  }

  // A method for when a file is dropped in the drag and drop area
  function dropHandler(event: DragEvent): void {
    if (dev) console.log('dropHandler: A file has been dropped in the drag and drop area')
    event.preventDefault()
    var reader = new FileReader()

    reader.onload = () => {
      let content = reader.result?.toString()
      let importantColumns: string[] = ['sourceCode', 'sourceName', 'sourceFrequency']
      if (content) {
        // Check if all columns needed are available
        if (
          !content.includes('sourceName') ||
          !content.includes('sourceCode') ||
          !content.includes('sourceFrequency')
        ) {
          currentColumns = content.split(/\n/)[0].split(',')
          importantColumns.forEach(col => {
            if (!currentColumns.includes(col)) missingColumns[col] = ''
          })
          columnDialog.showModal()
        }
      }
      return
    }

    if (event.dataTransfer?.items) {
      if (event.dataTransfer.items.length > 1) {
        alert('Only drop one file')
      }
      for (let item of event.dataTransfer.items) {
        if (item.kind === 'file') {
          const f = item.getAsFile()
          // Check if the file is a csv file
          if (f?.name.toLowerCase().includes('csv')) {
            file = f
            reader.readAsText(f)
          }
        }
      }
    }
  }

  // A method to rename the columns to get a standardized version of the file
  function fileUploadWithColumnChanges() {
    var reader = new FileReader()
    reader.onload = evt => {
      // Get the columns row of the file
      let sub = evt.target!.result!.toString().substring(0, evt.target!.result!.toString().indexOf('\n'))
      for (let [newColumn, oldColumn] of Object.entries(missingColumns)) {
        // Replace the old columns with the standardized columns
        sub = sub.replace(oldColumn, newColumn)
      }
      const result = sub + evt.target!.result!.toString().slice(evt.target!.result!.toString().indexOf('\n'))
      const blob = new Blob([result], { type: 'text/csv' })
      file = new File([blob], file.name, { type: 'text/csv' })
      columnDialog.close()
    }
    reader.readAsText(file)
  }

  // A method to delete a file
  async function deleteFile(fileName: string) {
    if ($userSessionStore?.uid && $userSessionStore?.roles?.includes('Admin')) {
      $processing = true
      // Get filesArray and search for the fileName to get the UID of the file
      const filesArray = await readDatabase('/admin')
      for (let [uid, name] of Object.entries(filesArray)) {
        if (name == fileName) await deleteDatabase(`/admin/${uid}`)
      }
      // Delete the file from the file storage from Firebase
      await deleteFileStorage(`/mapping-files/${fileName}`)
      // Delete the version & lastAuthor object for the file in Firebase Realtime Database
      await deleteDatabase(`/files/${fileName.substring(0, fileName.indexOf('.'))}`)
      // Get all the authors of this file & delete the file from their accessable files in Realtime Database
      const authors: Record<string, { email: string; files: Record<string, string> }> = await readDatabase('/authors')
      for (let [uid, info] of Object.entries(authors)) {
        if (info.email) {
          if (info.files) {
            for (let [fileUid, name] of Object.entries(info.files)) {
              if (name == fileName) await deleteDatabase(`/authors/${uid}/files/${fileUid}`)
            }
          }
        }
      }
      getFiles()
      $processing = false
    }
  }

  // A method to edit the authors that have access to a file
  async function editFile(fileName: string) {
    if (dev) console.log('editFile: Editing the authorized authors for the file ', fileName)
    const authors = await getAllAuthors()
    if (authors) {
      for (let [uid, info] of Object.entries(authors)) {
        // Check if the user is registered, it could be that a user has no email
        if (info.email) {
          if (info.files) {
            // If the user has access to the file, but he is removed from the list of authorized authors
            if (Object.values(info.files).includes(fileName) && !authorizedAuthors.includes(uid)) {
              const fileComb = Object.entries(info.files).find(arr => arr.includes(fileName))
              // Delete the file from the user his files list
              await deleteDatabase(`/authors/${uid}/files/${fileComb![0] === fileName ? fileComb![1] : fileComb![0]}`)
            } else if (!Object.values(info.files).includes(fileName) && authorizedAuthors.includes(uid)) {
              // If the user didn't have access, but now he does
              await pushToDatabase(`/authors/${uid}/files`, fileName)
            }
          } else if (authorizedAuthors.includes(uid)) {
            // If the user didn't have access to any files yet
            await pushToDatabase(`/authors/${uid}/files`, fileName)
          }
        }
      }
    }
    authorsDialog.close()
  }

  // A method to send the user to the mappingtool
  function openMappingTool(fileName: string) {
    if (fileName !== 'customConcepts.csv') goto(`/mapping?file=${fileName}`)
  }

  // A method to download the selected file
  async function downloadFile(fileName: string) {
    let element = document.createElement('a')
    // Get the file from the file storage in Firebase
    const fileToDownload = await readFileStorage(`/mapping-files/${fileName}`)
    if (fileToDownload) {
      const url = URL.createObjectURL(fileToDownload)
      element.setAttribute('href', url)
      element.setAttribute('download', fileName!)
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      URL.revokeObjectURL(url)
    }
  }

  $: {
    // When the user changes, renew the files
    if ($userSessionStore) getFiles()
  }
</script>

<svelte:head>
  <title>Keun</title>
  <meta
    name="description"
    content="Keun is a mapping tool to map concepts to OMOP concepts. It's a web based modern variant of Usagi."
  />
</svelte:head>

<main data-name="files-screen">
  <dialog bind:this={fileInputDialog} data-name="file-dialog">
    <div data-name="file-input-container">
      <h1 data-name="file-input-title">Upload a new file</h1>
      <button
        on:click={() => {
          fileInputDialog.close()
          authorizedAuthors = []
        }}
        data-name="close-dialog"
        disabled={$processing}
        ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" />
      </button>
      <div data-name="drag-drop-container" on:drop={dropHandler} on:dragover|preventDefault>
        <label data-name="upload-file">
          {#if file}
            <SvgIcon href="icons.svg" id="excel" width="40px" height="40px" />
            <p>{file.name}</p>
          {:else}
            <SvgIcon href="icons.svg" id="upload" width="24px" height="24px" />
            <p>Drag or click to upload a file</p>
          {/if}
          <input type="file" name="file" id="file" accept=".csv" on:change={onFileInputChange} />
        </label>
      </div>

      <h2>Select the authors that have permission to this file:</h2>
      <input type="text" placeholder="search for an user" bind:value={userFilter} />
      <ul data-name="authors-list">
        {#await getAllAuthors() then users}
          {#if users}
            {#each Object.entries(users) as [uid, info]}
              {#if info.email}
                {#if userFilter}
                  {#if info.email.toLowerCase().includes(userFilter.toLowerCase())}
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
              {/if}
            {/each}
          {/if}
        {/await}
      </ul>

      <button on:click={fileUploaded} disabled={file ? false : true || $processing}>Upload</button>
      {#if $processing}
        <Spinner />
      {/if}
    </div>
  </dialog>

  <dialog bind:this={columnDialog} data-name="column-dialog">
    <div data-name="dialog-container">
      <button data-name="close-dialog" on:click={() => columnDialog.close()}>
        <SvgIcon href="icons.svg" id="x" width="16px" height="16px" />
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
      <button
        on:click={() => {
          authorsDialog.close()
          authorizedAuthors = []
        }}
        data-name="close-dialog"
        disabled={$processing}
        ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" />
      </button>
      <h1>Update the authorized authors</h1>
      <ul>
        {#await getAllAuthors() then users}
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

  <section data-name="file-selection">
    <section data-name="file-container">
      <div data-name="file-menu">
        <h1>Files to map</h1>
        <div data-name="file-list">
          {#if $userSessionStore}
            {#each files as file}
              <button data-name="file-card" on:click={() => openMappingTool(file)}>
                <div data-name="file-name">
                  <SvgIcon href="icons.svg" id="excel" width="40px" height="40px" />
                  <p>{file}</p>
                </div>
                {#if $userSessionStore.roles?.includes('Admin')}
                  <div>
                    <button
                      data-name="download-file"
                      on:click={async e => {
                        if (e && e.stopPropagation) e.stopPropagation()
                        downloadFile(file)
                      }}
                    >
                      <SvgIcon href="icons.svg" id="download" width="16px" height="16px" />
                    </button>
                    <button
                      disabled={file === 'customConcepts.csv'}
                      data-name="edit-file"
                      on:click={async e => {
                        if (e && e.stopPropagation) e.stopPropagation()
                        if (file !== 'customConcepts.csv') {
                          chosenFile = file
                          authorsDialog.showModal()
                        }
                      }}
                    >
                      <SvgIcon href="icons.svg" id="edit" width="16px" height="16px" />
                    </button>
                    <button
                      disabled={file === 'customConcepts.csv'}
                      data-name="delete-file"
                      on:click={e => {
                        if (e && e.stopPropagation) e.stopPropagation()
                        if (file !== 'customConcepts.csv') deleteFile(file)
                      }}><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button
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
        </div>
        {#if $processing}
          <Spinner />
        {/if}
        {#if $userSessionStore.roles?.includes('Admin')}
          <button on:click={() => fileInputDialog.showModal()} data-name="file-add">+ Add file</button>
        {/if}
      </div>
    </section>
  </section>
</main>
