<script lang="ts">
  import { clickOutside } from '$lib/actions/clickOutside'
  import DragAndDrop from '$lib/components/Extra/DragAndDrop.svelte'
  import Header from '$lib/components/Extra/Header.svelte'
  import Manual from '$lib/components/Extra/Manual.svelte'
  import Settings from '$lib/components/Extra/Settings.svelte'
  import Spinner from '$lib/components/Extra/Spinner.svelte'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import User from '$lib/components/Extra/User.svelte'
  import type {
    AuthorChangedEventDetail,
    FileUploadWithColumnChanges,
    FileUploadedEventDetail,
    IDatabaseFile,
    ISettings,
    SettingsChangedEventDetail,
  } from '$lib/components/Types'
  import { user } from '$lib/store'
  import {
    checkIfCollectionExists,
    deleteCollectionFirestore,
    deleteDatabase,
    pushToDatabase,
    readDatabase,
    readFirestore,
    userSessionStore,
    writeToDatabase,
    writeToFirestore,
  } from '$lib/firebase'
  import { fromCSV } from 'arquero'
  import { writable } from 'svelte/store'

  let files: Record<string, Record<number, string>>
  let fileInputDialog: HTMLDialogElement
  let users: Record<string, string>
  let file: File
  let authorizedAuthors: any[]
  let customUser: string | undefined = undefined
  let processing = writable<boolean>(false)

  let settings: ISettings = {
    mapToMultipleConcepts: false,
    autoMap: false,
    language: 'en',
    author: undefined,
    savedAuthors: [],
    vocabularyIdCustomConcept: '',
    fontsize: 10,
    popupSidesShowed: { filters: true, details: true },
  }

  // A method for when the settings are changed
  function settingsChanged(e: CustomEvent<SettingsChangedEventDetail>) {
    settings = e.detail.settings
    document.documentElement.style.setProperty('--font-size', `${settings.fontsize}px`)
    document.documentElement.style.setProperty('--font-number', `${settings.fontsize}`)
  }

  async function authorChanged(event: CustomEvent<AuthorChangedEventDetail>) {
    if (event.detail.author) {
      $user = event.detail.author
    }
  }

  async function getFiles() {
    if ($userSessionStore)
      if ($userSessionStore.roles?.includes('Admin')) {
        files = await readDatabase('/files')
      } else {
        // GET fileNames that the user may access from realtime database
        const allFiles: Record<string, Record<number, string>> = await readDatabase('/files')
        let authorizedFiles: Record<string, Record<number, string>> = {}
        if (allFiles) {
          for (let [fileName, authors] of Object.entries(allFiles)) {
            if (Object.values(authors).includes($userSessionStore.email!)) authorizedFiles[fileName] = authors
          }
        }
        files = authorizedFiles
      }
  }

  async function openDialog() {
    users = await readDatabase('authors')
    fileInputDialog.showModal()
  }

  function closeDialog() {
    fileInputDialog.close()
  }

  async function fileToText(file: File) {
    return new Promise(resolve => {
      var fileReader = new FileReader()
      fileReader.onload = evt => {
        resolve(evt.target?.result)
      }
      fileReader.readAsText(file)
    })
  }

  async function csvToArrayOfObjects(csv: any) {
    const data = csv.data
    let columns = []
    let resultedData = []
    for (let col of Object.keys(data)) {
      columns.push(col)
    }
    const total = data[columns[0]] ? data[columns[0]].length : 1
    for (let i = 0; i < total; i++) {
      let obj = {}
      for (let col of columns) {
        obj[col as keyof Object] = data[col][i]
      }
      resultedData.push(obj)
    }
    return resultedData
  }

  async function fileUploaded() {
    const text: any = await fileToText(file)
    const dt = await fromCSV(text, {})
    const csv = JSON.parse(dt.toJSON())
    const res = await csvToArrayOfObjects(csv)
    const collectionExists = await checkIfCollectionExists(file.name.substring(0, file.name.indexOf('.')))
    if (!collectionExists) {
      // Freeze the user
      $processing = true
      for (let row of res) {
        const processed = await writeToFirestore(
          file.name.substring(0, file.name.indexOf('.')),
          crypto.randomUUID(),
          row
        )
        if (!processed) $processing = false
      }
      // Unfreeze the user
      $processing = false
      let fileInDatabase: boolean = false
      const fileExists = await readDatabase('/files')
      if (fileExists)
        fileInDatabase = Object.keys(fileExists).includes(file.name.substring(0, file.name.indexOf('.'))) ? true : false
      else fileInDatabase = false
      if (!fileInDatabase) {
        if (authorizedAuthors)
          await writeToDatabase(`/files/${file.name.substring(0, file.name.indexOf('.'))}`, authorizedAuthors)
        else await writeToDatabase(`/files/${file.name.substring(0, file.name.indexOf('.'))}`, ['none'])
      } else console.error('The file was already uploaded to the database')
    } else console.error('The file was already uploaded to the database')

    getFiles()
  }

  function onFileInputChange(e: Event) {
    const allowedExtensions = ['csv', 'json']
    const inputFiles = (e.target as HTMLInputElement).files
    if (!inputFiles) return

    for (const f of inputFiles) {
      const extension = f.name.split('.').pop()
      if (extension && allowedExtensions.includes(extension)) {
        file = f
        break
      }
    }
  }

  function fileUploadWithColumnChanges(e: CustomEvent<FileUploadWithColumnChanges>) {
    // TODO: implement logic for when columns have changed
  }

  async function deleteFile(file: string) {
    $processing = true
    await deleteCollectionFirestore(file)
    await deleteDatabase(`/files/${file}`)
    getFiles()
    $processing = false
  }

  async function addCustomUser() {
    if (customUser) {
      await pushToDatabase('/authors', customUser)
      users = await readDatabase('authors')
      customUser = undefined
    }
  }

  $: {
    if ($userSessionStore) getFiles()
  }

  $: {
    if ($userSessionStore && !settings.author)
      settings.author = {
        id: $userSessionStore.uid,
        email: $userSessionStore.email,
        displayName: $userSessionStore.name,
      }
  }
</script>

<svelte:head>
  <title>Keun</title>
  <meta
    name="description"
    content="Keun is a mapping tool to map concepts to OMOP concepts. It's a web based modern variant of Usagi."
  />
</svelte:head>

<dialog bind:this={fileInputDialog} data-name="file-input">
  <div data-name="file-input-container" use:clickOutside on:outClick={closeDialog}>
    <button on:click={closeDialog} data-name="close-dialog" disabled={$processing}
      ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" />
    </button>
    <label>
      File
      <input type="file" name="file" id="file" accept=".csv" on:change={onFileInputChange} />
    </label>

    <div>
      {#if users}
        {#each Object.values(users) as user}
          <label>
            {user}
            <input type="checkbox" name={user} id={user} bind:group={authorizedAuthors} value={user} />
          </label>
        {/each}
        <label>
          Add a user by e-mail
          <input type="text" bind:value={customUser} />
          <button on:click={addCustomUser} disabled={$processing}>Add</button>
        </label>
      {/if}
    </div>

    <button on:click={fileUploaded} disabled={file ? false : true || $processing}>Upload</button>
    {#if $processing}
      <Spinner />
    {/if}
  </div>
</dialog>

<main data-name="file-selection">
  <section data-name="header">
    <Header />

    <div data-name="header-buttons-container" id="settings">
      <Manual />
      {#if settings}
        <Settings {settings} on:settingsChanged={settingsChanged} />
        <!-- TODO: let user be set, but do not activate the modal in the beginning. Show the modal when navigating to a file and if the user is not set yet -->
        <User {settings} on:authorChanged={authorChanged} />
      {/if}
    </div>
  </section>

  <section data-name="file-container">
    <!-- TODO: only admins can add or delete files -->
    <div data-name="file-menu">
      <h1>Files to map</h1>
      <div data-name="file-list">
        {#if !$userSessionStore}
          <div data-name="loader">
            <Spinner />
          </div>
        {:else if files}
          {#each Object.keys(files) as file}
            <button data-name="file-card">
              <div data-name="file-name">
                <SvgIcon href="icons.svg" id="excel" width="40px" height="40px" />
                <p>{file}</p>
              </div>
              <button data-name="delete-file" on:click={() => deleteFile(file)}
                ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button
              >
            </button>
          {/each}
        {/if}
      </div>
      {#if $processing}
        <Spinner />
      {/if}
      <button on:click={openDialog} data-name="file-add">+ Add file</button>
    </div>
  </section>
</main>
