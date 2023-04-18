<script lang="ts">
  import type { IColumnMetaData } from '../../../../lib/RADar-DataTable/src/lib/components/DataTable'
  export let columns: IColumnMetaData[]

  let hiddenColumns = [
    'sourceAutoAssignedConceptIds',
    'ADD_INFO:additionalInfo',
    'ADD_INFO:prescriptionID',
    'ADD_INFO:ATC',
    'matchScore',
    'matchScore',
    'statusSetBy',
    'statusSetOn',
    'comment',
    'createdBy',
    'createdOn',
    'domainId',
  ]

  for (let col of hiddenColumns) {
    // TODO: check if columns are already added to the Table
    const column = columns.find(column => column.id == col)
    column!.visible = false
  }

  function updateVisibilityColumn(e: Event, column: IColumnMetaData) {
    const element = e.target as HTMLInputElement
    column.visible = element.checked
    column = column
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
