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

<button on:click={onClick} data-name="header-button">
  <p>{author}</p>
  <SvgIcon href="icons.svg" id="user" width="16px" height="16px" />
</button>
