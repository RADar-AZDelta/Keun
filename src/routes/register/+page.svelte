<script lang="ts">
  import { implementationClass } from '$lib/store'
  import { onMount } from 'svelte'

  export let fileNames: string[] | undefined
  let email: string
  let authorizedFiles: any[]

  // A method to get all the files that are under "/admin" in Firebase
  async function getFiles(): Promise<void> {
    const fileNamesFound = await $implementationClass.getFilesAdmin()
    if (fileNamesFound) fileNames = fileNamesFound
  }

  // Get all the files to be able to give users access when registrating them
  onMount(() => {
    getFiles()
  })
</script>

<section data-name="registration">
  <div data-name="registration-container">
    <h1>Register user</h1>

    <form method="POST" action="?/create">
      <input type="email" name="email" id="email" bind:value={email} required autocomplete="off" placeholder="Email" />
      <select name="role" id="role" required>
        <option value="User" selected>User</option>
        <option value="Admin">Admin</option>
      </select>
      <p>Authorized files:</p>
      {#if fileNames}
        {#each fileNames as fileName}
          <div data-name="file-selection">
            <input type="checkbox" name="files" id={fileName} bind:group={authorizedFiles} value={fileName} />
            <label for={fileName}>{fileName}</label>
          </div>
        {/each}
      {/if}

      <button>Create user</button>
    </form>
  </div>
</section>
