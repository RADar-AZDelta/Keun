<script lang="ts">
  import { writable, type Writable } from 'svelte/store'
  import type IScheme from '../../../../lib/RADar-DataTable/src/lib/interfaces/IScheme'
  export let columns: Writable<Array<IScheme>> = writable<Array<IScheme>>([])
  export let visibilityCheck: any
  export let hiddenColumns: string[]

  $: {
    $columns
    visibilityCheck(hiddenColumns)
  }
</script>

<section>
  <div class="container is-fluid">
    <h3 class="title is-5">Columns shown:</h3>
    {#each $columns as column}
      <span class="check"
        ><input
          type="checkbox"
          id={column.column}
          name={column.column}
          bind:checked={column.visible}
          on:change={event => {
            // @ts-ignore
            if (event.target.checked == false) column.forceVisibility = true
            else column.forceVisibility = false
          }}
        />
        <label for={column.column}>{column.column}</label>
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
