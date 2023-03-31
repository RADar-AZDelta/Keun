<script lang="ts">
  import { browser } from '$app/environment'
  export let showPopupU: Boolean
  export let author: string
  const getAuthor = () => {
    let auth
    if (browser == true) {
      if (localStorage.getItem('author') !== null) {
        auth = localStorage.getItem('author')
      }
    } else auth = 'no author'
    return auth
  }
  const PopUp = () => {
    showPopupU = true
  }
</script>

Skip to content Search or jump to… Pull requests Issues Codespaces Marketplace Explore @Louis-Herreman RADar-AZDelta /
POC-Keun Private Cannot fork because forking is disabled. Code Issues Pull requests Actions Projects Security Insights
Settings POC-Keun/src/lib/components/Extra/User.svelte @Louis-Herreman Louis-Herreman update User component Latest
commit cebec4e 4 days ago History 1 contributor 38 lines (35 sloc) 834 Bytes

<div id="content">
  <div class="buttons is-right">
    <button class="button" on:click={PopUp}>
      <div class="buttons is-right">
        <span><img class="img is-48x48" src="/user-solid.svg" alt="user icon" width="15px" height="15px" /></span>
        <p>{author}</p>
      </div>
    </button>
  </div>
</div>

<style>
  .button {
    margin-top: -10px;
    margin-right: 0px;
  }
  #content {
    margin-right: 35px;
  }
</style>
