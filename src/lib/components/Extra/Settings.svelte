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

<button on:click={onClick} data-name="header-button"><SvgIcon href="icons.svg" id="settings" width="16px" height="16px" /></button>
