<script lang="ts">
  import '$lib/styles/table.scss'
  import { createEventDispatcher } from 'svelte'
  import SvgIcon from './SvgIcon.svelte'
  import { fade } from 'svelte/transition'
  import type { CustomOptionsEvents } from '../Types'
  import { clickOutside } from '$lib/actions/clickOutside'
  import { escapeWithKey } from '$lib/actions/escapeWithKey'
  export let show: boolean,
    size: 'small' | 'medium' | 'large' = 'medium'

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  function close() {
    dispatch('generalVisibilityChanged', { visibility: false })
  }
</script>

{#if show == true}
  <section data-component="modal-container-{size}" in:fade out:fade>
    <div data-component="modal" use:clickOutside on:outClick={close} use:escapeWithKey on:escapeKey={close}>
      <button data-component="close" on:click={close}
        ><SvgIcon href="icons.svg" id="x" height="16px" width="16px" /></button
      >
      <div data-component="modal-content"><slot /></div>
    </div>
  </section>
{/if}
