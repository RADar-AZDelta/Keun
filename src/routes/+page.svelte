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

  async function getFiles() {
    if ($userSessionStore) {
      let filesArray: Record<string, string>
      if ($userSessionStore.roles?.includes('Admin')) {
        filesArray = await readDatabase(`/admin`)
      } else {
        filesArray = await readDatabase(`/authors/${$userSessionStore.uid}/files`)
      }
      if (filesArray) files = Object.values(filesArray)
      else files = []
    } else files = []
  }

  async function getAllAuthors(): Promise<Record<string, { email: string; files: Record<string, string> }>> {
    return (await readDatabase('/authors')) as Record<string, { email: string; files: Record<string, string> }>
  }

  async function fileUploaded() {
    if (file) {
      await uploadFileToStorage(`/mapping-files/${file.name}`, file)
      await pushToDatabase('/admin', file.name)
      if (authorizedAuthors) {
        for (let u of authorizedAuthors) {
          await pushToDatabase(`/authors/${u}/files`, file.name)
        }
      }
      await writeToDatabase(`/files/${file.name.substring(0, file.name.indexOf('.'))}`, { version: 1, lastAuthor: '' })
    }
    getFiles()
    fileInputDialog.close()
  }

  function onFileInputChange(e: Event) {
    const allowedExtensions = ['csv', 'json']
    const inputFiles = (e.target as HTMLInputElement).files
    if (!inputFiles) return

    var reader = new FileReader()

    reader.onload = () => {
      let content = reader.result?.toString()
      let importantColumns: string[] = ['sourceCode', 'sourceName', 'sourceFrequency']
      if (content) {
        if (
          !content.includes('sourceName') ||
          !content.includes('sourceCode') ||
          !content.includes('sourceFrequency')
        ) {
          // alert('Provide a file that contains the following columns: sourceCode, sourceName & sourceFrequency')
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
        if (
          !content.includes('sourceName') ||
          !content.includes('sourceCode') ||
          !content.includes('sourceFrequency')
        ) {
          // alert('Provide a file that contains the following columns: sourceCode, sourceName & sourceFrequency')
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

  function fileUploadWithColumnChanges() {
    var reader = new FileReader()
    reader.onload = evt => {
      let sub = evt.target!.result!.toString().substring(0, evt.target!.result!.toString().indexOf('\n'))
      for (let [newColumn, oldColumn] of Object.entries(missingColumns)) {
        sub = sub.replace(oldColumn, newColumn)
      }
      const result = sub + evt.target!.result!.toString().slice(evt.target!.result!.toString().indexOf('\n'))
      const blob = new Blob([result], { type: 'text/csv' })
      file = new File([blob], file.name, { type: 'text/csv' })
      columnDialog.close()
    }
    reader.readAsText(file)
  }

  async function deleteFile(fileName: string) {
    $processing = true
    const filesArray = await readDatabase('/admin')
    for (let [uid, name] of Object.entries(filesArray)) {
      if (name == fileName) await deleteDatabase(`/admin/${uid}`)
    }
    await deleteFileStorage(`/mapping-files/${fileName}`)
    await deleteDatabase(`/files/${fileName.substring(0, fileName.indexOf('.'))}`)
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

  async function editFile(fileName: string) {
    if (dev) console.log('editFile: Editing the authorized authors for the file ', fileName)
    const authors = await getAllAuthors()
    for (let [uid, info] of Object.entries(authors)) {
      if (info.email) {
        if (info.files) {
          if (Object.values(info.files).includes(fileName) && !authorizedAuthors.includes(uid)) {
            const fileComb = Object.entries(info.files).find(arr => arr.includes(fileName))
            await deleteDatabase(`/authors/${uid}/files/${fileComb![0] === fileName ? fileComb![1] : fileComb![0]}`)
          } else if (!Object.values(info.files).includes(fileName) && authorizedAuthors.includes(uid)) {
            await pushToDatabase(`/authors/${uid}/files`, fileName)
          }
        } else if (authorizedAuthors.includes(uid)) {
          await pushToDatabase(`/authors/${uid}/files`, fileName)
        }
      }
    }
    authorsDialog.close()
  }

  function openMappingTool(fileName: string) {
    if (fileName !== 'customConcepts.csv') goto(`/mapping?file=${fileName}`)
  }

  async function downloadFile(fileName: string) {
    let element = document.createElement('a')
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
