<script lang="ts">
  import type { CustomOptionsEvents } from '../Types'
  import SvgIcon from './SvgIcon.svelte'
  import { createEventDispatcher } from 'svelte'

  export let showAuthorPopUp: boolean
  export let author: string

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  function onClick() {
    dispatch('generalVisibilityChanged', { visibility: !showAuthorPopUp })
  }
</script>

<div id="content">
  <div class="buttons is-right">
    <button class="button" on:click={onClick}>
      <div class="buttons is-right">
        <p id="name">{author}</p>
        <SvgIcon href="icons.svg" id="user" width="16px" height="16px" />
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
