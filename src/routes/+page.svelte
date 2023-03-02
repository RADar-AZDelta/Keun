<script lang="ts">
  import { writable } from 'svelte/store'
  import { mappedTable, workerMess, showPopup } from '$lib/store'
  import DataTableRendererCsr from '$lib/components/DataTable/DataTableRendererCSR.svelte'
  import DragAndDrop from '$lib/components/Extra/DragAndDrop.svelte'
  import Modal from '$lib/components/Extra/Modal.svelte'

  const file = writable<File | null>(null)
  const delimiter: string = ','
</script>

<h1>Keun</h1>

<DragAndDrop {file} fileExtension="csv" />
{#if $file != null}
  <DataTableRendererCsr file={$file} dataType="csv" {delimiter} />
{/if}

<Modal show={$showPopup}>
  <h1 class="title">Mapping data</h1>
</Modal>

<style>
  .title {
    font-size: 1.5rem;
    font-weight: 700;
    text-align: center;
  }
</style>
