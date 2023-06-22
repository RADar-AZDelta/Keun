<script lang="ts">
  import { pushToDatabase, readDatabase, writeToDatabase } from '$lib/firebase'
    import { user } from '$lib/store'

  export let form: { email: string; role: 'User' | 'Admin'; fileNames: string[] }
  let fileNames: string[] | undefined
  let email: string
  let authorizedFiles: any[]

  async function getFiles() {
    const files = await readDatabase('files')
    fileNames = Object.keys(files)
    // fileNames = files?.map((file: any) => file.fileName)
  }

  async function addUserToDB() {
    const users = await readDatabase('/authors')
    if(!Object.values(users).includes(email)) {
      console.error("The user already exists")
      return
    }
    await pushToDatabase('/authors', email)
    for(let file of authorizedFiles) {
      await pushToDatabase(`/files/${file}`, email)
    }
  }

  getFiles()
</script>

<section>
  <h1>Register user</h1>

  <form method="POST" action="?/create">
    <label for="email">Email</label>
    <input type="email" name="email" id="email" bind:value={email} required autocomplete="off" />
    <label for="role">Role</label>
    <select name="role" id="role" required>
      <option value="User" selected>User</option>
      <option value="Admin">Admin</option>
    </select>
    <label for="files">Select the files that the user can map</label>
      {#if fileNames}
        {#each fileNames as fileName}
          <label for={fileName}>{fileName}</label>
          <input type="checkbox" name="files" id={fileName} bind:group={authorizedFiles} value={fileName}/>
        {/each}
      {/if}

    <button on:click={addUserToDB}>Create user</button>
  </form>
</section>
