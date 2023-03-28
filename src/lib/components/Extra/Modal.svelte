<script lang="ts">
  import '$lib/styles/table.scss'
  export let updatePopup: Function,
    show: boolean,
    size: 'small' | 'medium' | 'large' = 'medium'
</script>

{#if show == true}
  <section data-component="modal-container-{size}">
    <div data-component="modal">
      <button
        data-component="close"
        on:click={() => {
          updatePopup(false)
        }}><img src="x.svg" alt="Close button" /></button
      >
      <div data-component="modal-content"><slot /></div>
    </div>
  </section>
{/if}
