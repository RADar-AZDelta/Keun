<script lang="ts">
  import '$lib/styles/table.scss'
  import { createEventDispatcher } from 'svelte'
  import SvgIcon from './SvgIcon.svelte'
  import type { CustomOptionsEvents } from '../Types'
  export let show: boolean,
    size: 'small' | 'medium' | 'large' = 'medium'

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  function onClick() {
    dispatch('generalVisibilityChanged', { visibility: false })
  }
</script>

{#if show == true}
  <section data-component="modal-container-{size}">
    <div data-component="modal">
      <button
        data-component="close"
        on:click={onClick}><SvgIcon href="icons.svg" id="x" height="16px" width="16px" /></button
      >
      <div data-component="modal-content"><slot /></div>
    </div>
  </section>
{/if}
