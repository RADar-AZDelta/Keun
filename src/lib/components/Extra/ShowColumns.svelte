<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { IColumnMetaData } from 'svelte-radar-datatable'
  import type { CustomOptionsEvents } from '../Types'
  export let columns: IColumnMetaData[]

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  function updateVisibilityColumn(e: Event, column: IColumnMetaData) {
    const element = e.target as HTMLInputElement
    dispatch('columnVisibilityChanged', { column: column, visible: element.checked })
  }
</script>

<section>
  <div class="container is-fluid">
    <h3 class="title is-5">Columns shown:</h3>
    {#each columns as column}
      <span class="check"
        ><input
          type="checkbox"
          id={column.id}
          name={column.id}
          bind:checked={column.visible}
          on:change={event => {
            updateVisibilityColumn(event, column)
          }}
        />
        <label for={column.id}>{column.id}</label>
      </span>
    {/each}
  </div>
</section>

<style>
  .check:nth-child(5n):after {
    content: ' ';
    display: block;
  }
  .container {
    padding-top: 10px;
  }
</style>
