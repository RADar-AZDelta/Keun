<script lang="ts">
  import { writable, type Writable } from 'svelte/store'
  import type IScheme from '../../../../lib/RADar-DataTable/src/lib/interfaces/IScheme'
  export let columns: Writable<Array<IScheme>> = writable<Array<IScheme>>([]),
    parentChange: Writable<boolean>

  const hiddenColumns = [
    'sourceAutoAssignedConceptIds',
    'ADD_INFO:additionalInfo',
    'ADD_INFO:prescriptionID',
    'ADD_INFO:ATC',
    'matchScore',
    'mappingStatus',
    'matchScore',
    'mappingStatus',
    'statusSetBy',
    'statusSetOn',
    'comment',
    'createdBy',
    'createdOn',
    'domainId',
  ]

  $: {
    for (let column of $columns) {
      if(hiddenColumns.includes(column.column)){
        if(column.forceVisibility == true) column.visible = true
        else column.visible = false
      }
    }
  }
</script>

<section>
  <h3 class="title is-5">Columns shown:</h3>
  <div>
    {#each $columns as column}
      <span class="check">
        <label class="checkbox"
          ><input
            type="checkbox"
            id={column.column}
            bind:checked={column.visible}
            on:change={event => {
              // @ts-ignore
              if (event.target.checked == false) column.forceVisibility = true
              else column.forceVisibility = false
              parentChange.set(true)
            }}
          /></label
        >
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
</style>
