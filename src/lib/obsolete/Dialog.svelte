<!-- Copyright 2023 RADar-AZDelta -->
<!-- SPDX-License-Identifier: gpl3+ -->
<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'
  import type { IError } from './Types'

  export let dialog: HTMLDialogElement, width: string | number, height: string | number, title: string
  export let error: IError | undefined = undefined

  const outClick = () => dialog.close()
  const closeError = () => (error = undefined)
</script>

<dialog class="dialog no-border" bind:this={dialog} style="width: {width}; height: {height};">
  <div class="dialog-container no-space w-full h-full flex-column">
    <button class="close-dialog no-border" on:click={outClick}><SvgIcon id="x" /></button>
    <h3 class="title">{title}</h3>
    {#if error}
      <div class="error flex-between">
        <div class="error-content">
          <h4 class="error-title">{error.title}</h4>
          <p class="error-message">{error.message}</p>
        </div>
        <button class="error-close btn cl-hv-red" on:click={closeError}><SvgIcon id="x" /></button>
      </div>
    {/if}
    <div class="slot grow">
      <slot />
    </div>
    <div class="buttons">
      <slot name="buttons" />
    </div>
  </div>
</dialog>

<style>
  .dialog {
    border-radius: 10px;
    padding: 0;
  }

  .dialog-container {
    overflow: hidden;
  }

  .close-dialog {
    position: absolute;
    right: 1rem;
    top: 1rem;
    background-color: inherit;
    color: black;
    cursor: pointer;
  }

  .title {
    padding: 0 1rem;
    margin-bottom: 0;
  }

  .error {
    width: 90%;
    padding: 0 1rem;
    margin: 0 auto 1rem auto;
    border: 1px solid red;
    border-radius: 5px;
    background-color: tomato;
  }

  .error-title {
    margin: 0;
    padding: 0.5rem;
  }

  .error-message {
    margin: 0;
    padding: 0 0 1rem 0.5rem;
  }

  .error-close {
    color: black;
  }

  .slot {
    overflow-y: auto;
  }
</style>
