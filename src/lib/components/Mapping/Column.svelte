<script lang="ts">
  import type { Writable } from 'svelte/store'
  import Filtering from '../../../../lib/RADar-DataTable/src/lib/components/DataTableBasics/Filtering.svelte'
  import Sorting from '../../../../lib/RADar-DataTable/src/lib/components/DataTableBasics/Sorting.svelte'
  import type IFilter from '../../../../lib/RADar-DataTable/src/lib/interfaces/IFilter'
  import type IScheme from '../../../../lib/RADar-DataTable/src/lib/interfaces/IScheme'
  import type ISort from '../../../../lib/RADar-DataTable/src/lib/interfaces/ISort'

  export let column: IScheme,
    sorting: Writable<ISort[]>,
    updateSorting: any,
    deleteFilter: any,
    updateFiltering: any,
    filters: Writable<IFilter[]>
</script>

<th>
  <div>
    <div class="control">
      <Sorting
        col={column.column}
        direction={$sorting.filter(obj => obj.column == column.column)[0] != undefined
          ? $sorting.filter(obj => obj.column == column.column)[0].direction
          : 0}
        {updateSorting}
      />
    </div>
    <div class="control">
      <Filtering col={column.column} type={column.type} {deleteFilter} {updateFiltering} bind:filters />
    </div>
  </div>
</th>
