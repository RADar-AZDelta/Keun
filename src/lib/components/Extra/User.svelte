<script lang="ts">
    import type { Writable } from "svelte/store"


  export let showAuthorPopUp: Writable<boolean>
  export let author: string
</script>

<div id="content">
  <div class="buttons is-right">
    <button class="button" on:click={() => {
      showAuthorPopUp.update((value) => !value)
    }}>
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
