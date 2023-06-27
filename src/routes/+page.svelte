<script lang="ts">
  import { clickOutside } from '$lib/actions/clickOutside'
  import Header from '$lib/components/Extra/Header.svelte'
  import Manual from '$lib/components/Extra/Manual.svelte'
  import Settings from '$lib/components/Extra/Settings.svelte'
  import Spinner from '$lib/components/Extra/Spinner.svelte'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import User from '$lib/components/Extra/User.svelte'
  import type {
    FileUploadWithColumnChanges,
  } from '$lib/components/Types'
  import { user, settings } from '$lib/store'
  import {
    deleteDatabase,
    deleteFileStorage,
    pushToDatabase,
    readDatabase,
    updateDatabase,
    uploadFileToStorage,
    userSessionStore,
  } from '$lib/firebase'
  import { fromCSV } from 'arquero'
  import { writable } from 'svelte/store'
  import { goto } from '$app/navigation'

  let files: string[]
  let fileInputDialog: HTMLDialogElement
  let authorsDialog: HTMLDialogElement
  let users: Record<string, string>
  let file: File
  let authorizedAuthors: string[]
  let processing = writable<boolean>(false)
  let selectedFile: string
  let chosenFile: string

  async function getFiles() {
    if ($userSessionStore)
      if ($userSessionStore.roles?.includes('Admin')) {
        const filesArray = await readDatabase(`/admin`)
        if (filesArray) files = Object.values(filesArray)
      } else {
        const filesArray = await readDatabase(`/authors/${$userSessionStore.uid}/files`)
        if (filesArray) files = Object.values(filesArray)
      }
  }

  async function getAllAuthors() {
    const authors: Record<string, { email: string; files: string[] }> = await readDatabase('/authors')
    let allAuthors: Record<string, string> = {}
    for (let [uid, info] of Object.entries(authors)) {
      allAuthors[uid] = info.email
    }
    return allAuthors
  }

  async function getAllAuthorsForFile(fileName: string) {
    const authors: Record<string, { email: string; files: string[] }> = await readDatabase('/authors')
    let allAuthors: string[] = []
    for (let [uid, info] of Object.entries(authors)) {
      for (let files of Object.values(info.files)) {
        if (files.includes(fileName)) allAuthors.push(uid)
      }
    }
    return allAuthors
  }

  async function openFileInputDialog() {
    users = await getAllAuthors()
    fileInputDialog.showModal()
  }

  function closeFileInputDialog() {
    fileInputDialog.close()
    authorizedAuthors = []
  }

  async function openEditDialog(fileName: string) {
    chosenFile = fileName
    users = await getAllAuthors()
    authorsDialog.showModal()
  }

  function closeEditDialog() {
    authorsDialog.close()
    authorizedAuthors = []
  }

  async function fileUploaded() {
    if (file) {
      await uploadFileToStorage(`/mapping-files/${file.name}`, file)
      await pushToDatabase('/admin', file.name)
      for (let u of authorizedAuthors) {
        await pushToDatabase(`/authors/${u}/files`, file.name)
      }
      await updateDatabase(`/files`, {[file.name.substring(0, file.name.indexOf('.'))]: 1})
    }
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

  async function deleteFile(fileName: string) {
    $processing = true
    const filesArray = await readDatabase('/admin')
    for (let [uid, name] of Object.entries(filesArray)) {
      if (name == fileName) await deleteDatabase(`/admin/${uid}`)
    }
    await deleteFileStorage(`/mapping-files/${fileName}`)
    const authors: Record<string, { email: string; files: Record<string, string> }> = await readDatabase('/authors')
    for (let [uid, info] of Object.entries(authors)) {
      for (let [fileUid, name] of Object.entries(info.files)) {
        if (name == fileName) await deleteDatabase(`/authors/${uid}/files/${fileUid}`)
      }
    }
    $processing = false
  }

  async function editFile(fileName: string) {
    for (let uid of authorizedAuthors) {
      const filesArray = await readDatabase(`/authors/${uid}/files`)
      if (filesArray) {
        if (Object.values(filesArray).includes(fileName) && !authorizedAuthors.includes(uid)) {
          for (let [fileUid, name] of Object.entries(filesArray)) {
            if (name == fileName) await deleteDatabase(`/authors/${uid}/files/${fileUid}`)
          }
        } else if (!Object.values(filesArray).includes(fileName) && authorizedAuthors.includes(uid)) {
          await pushToDatabase(`/authors/${uid}/files`, fileName)
        }
      } else {
        await pushToDatabase(`/authors/${uid}/files`, fileName)
      }
    }
  }

  function openMappingTool(fileName: string) {
    goto(`/mapping?file=${fileName}`)
  }

  async function openFileMapping(fileName: string) {
    goto(`/mapping?file=${fileName}`)
  }

  $: {
    if ($userSessionStore) getFiles()
  }

  $: {
    if ($userSessionStore && !$settings.author)
      $settings.author = {
        id: $userSessionStore.uid,
        email: $userSessionStore.email,
        displayName: $userSessionStore.name,
      }
  }

  // TODO: possible problem --> user is registered in Firebase authentication, but for some other project (this means he is not in the realtime database and can't be give access to a file)
</script>

<svelte:head>
  <title>Keun</title>
  <meta
    name="description"
    content="Keun is a mapping tool to map concepts to OMOP concepts. It's a web based modern variant of Usagi."
  />
</svelte:head>

<main data-name="files-screen">
  <dialog bind:this={fileInputDialog} data-name="file-input">
    <div data-name="file-input-container">
      <button on:click={closeFileInputDialog} data-name="close-dialog" disabled={$processing}
        ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" />
      </button>
      <label>
        File
        <input type="file" name="file" id="file" accept=".csv" on:change={onFileInputChange} />
      </label>
  
      <div>
        {#if users}
          {#each Object.entries(users) as [uid, user]}
            <p>{uid}</p>
            <label>
              {user}
              <input type="checkbox" name={user} id={user} bind:group={authorizedAuthors} value={uid} />
            </label>
          {/each}
        {/if}
      </div>
  
      <button on:click={fileUploaded} disabled={file ? false : true || $processing}>Upload</button>
      {#if $processing}
        <Spinner />
      {/if}
    </div>
  </dialog>
  
  <dialog bind:this={authorsDialog} data-name="authors-dialog">
    <div data-name="file-input-container">
      <button on:click={closeEditDialog} data-name="close-dialog" disabled={$processing}
        ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" />
      </button>
      <p>Authorized authors</p>
      <div>
        {#if users}
          {#each Object.entries(users) as [uid, email]}
            <input type="checkbox" id={email} bind:group={authorizedAuthors} value={uid} />
            <label for={email}>{email}</label>
          {/each}
        {/if}
      </div>
      <button on:click={() => editFile(chosenFile)}>Update</button>
    </div>
  </dialog>
  
  <section data-name="file-selection">
    <section data-name="file-container">
      <div data-name="file-menu">
        <h1>Files to map</h1>
        <div data-name="file-list">
          {#if !$userSessionStore}
            <div data-name="loader">
              <Spinner />
            </div>
          {:else if files}
            {#each files as file}
              <button data-name="file-card" on:click={() => openMappingTool(file)}>
                <div data-name="file-name">
                  <SvgIcon href="icons.svg" id="excel" width="40px" height="40px" />
                  <p>{file}</p>
                </div>
                {#if $userSessionStore.roles?.includes('Admin')}
                  <div>
                    <button
                      data-name="edit-file"
                      on:click={async e => {
                        if (e && e.stopPropagation) e.stopPropagation()
                        selectedFile = file
                        authorizedAuthors = await getAllAuthorsForFile(file)
                        openEditDialog(file)
                      }}
                    >
                      <SvgIcon href="icons.svg" id="edit" width="16px" height="16px" />
                    </button>
                    <button
                      data-name="delete-file"
                      on:click={e => {
                        if (e && e.stopPropagation) e.stopPropagation()
                        deleteFile(file)
                      }}><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button
                    >
                  </div>
                {/if}
              </button>
            {/each}
          {/if}
        </div>
        {#if $processing}
          <Spinner />
        {/if}
        <button on:click={openFileInputDialog} data-name="file-add">+ Add file</button>
      </div>
    </section>
  </section>
</main>
