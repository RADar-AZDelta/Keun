<!-- <SvgIcon href="icons.svg" id="settings" width="16px" height="16px"/> -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import SvgIcon from './SvgIcon.svelte'
  import type { CustomOptionsEvents } from '../Types'

  export let showSettingsPopUp: boolean

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  function onClick() {
    dispatch('generalVisibilityChanged', { visibility: !showSettingsPopUp })
  }
</script>

<div id="content">
  <div class="buttons is-right">
    <button class="button" on:click={onClick}>
      <div class="buttons is-right">
        <SvgIcon href="icons.svg" id="settings" width="16px" height="16px" />
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
