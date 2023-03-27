<script lang="ts">
  import '$lib/styles/table.scss'
  export let show: boolean, saveFunction: Function
</script>

{#if show == true}
  <section data-component="smallmodal-container">
    <div data-component="smallmodal">
      <slot />
      <div data-component="button-container">
        <button data-component="button-cancel" on:click={() => (show = false)}>Cancel</button>
        <button
          data-component="button-save"
          on:click={() => {
            saveFunction()
            show = false
          }}>Save</button
        >
      </div>
    </div>
  </section>
{/if}
