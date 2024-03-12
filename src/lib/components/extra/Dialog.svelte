<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'

  export let dialog: HTMLDialogElement, width: string | number, height: string | number
  export let title: string | undefined = undefined

  const outClick = () => dialog.close()
</script>

<dialog class="dialog" bind:this={dialog} style="width: {width}; height: {height};">
  <div class="dialog-container">
    <button class="close-dialog" on:click={outClick}><SvgIcon id="x" /></button>
    {#if title}
      <h3 class="title">{title}</h3>
    {/if}
    <div class="slot">
      <slot />
    </div>
    <div class="buttons">
      <slot name="buttons" />
    </div>
  </div>
</dialog>

<style>
  .dialog {
    border: none;
    border-radius: 10px;
    padding: 0;
    top: 0;
    left: 0;
    transform: none;
  }

  .dialog-container {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .close-dialog {
    position: absolute;
    right: 1rem;
    top: 1rem;
    border: none;
    background-color: inherit;
    color: black;
    cursor: pointer;
  }

  .title {
    padding: 0 1rem;
    margin-bottom: 0;
  }

  .slot {
    flex: 1 1 auto;
    overflow-y: auto;
  }
</style>
