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

<div id="content">
  <div class="buttons is-right">
    <button class="button" on:click={PopUp}>
      <div class="buttons is-right">
        <p id="name">{author}</p>
        <span><img class="img is-48x48" src="/user-solid.svg" alt="user icon" width="15px" height="15px" /></span>
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
  #name {
    padding-right: 5px;
  }
</style>
