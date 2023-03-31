<script lang="ts">
  import type { Writable } from 'svelte/store'
  import { loading } from '../../../../lib/RADar-DataTable/src/lib/store'
  import type IPaginated from '../../../../lib/RADar-DataTable/src/lib/interfaces/IPaginated'
  import type IScheme from '../../../../lib/RADar-DataTable/src/lib/interfaces/IScheme'

  export let row: any[],
    scheme: IScheme[],
    id: string,
    number: number,
    pagination: Writable<IPaginated>,
    rowClickMethod: any,
    checkStatusRow: any,
    getColorFromStatus: any,
    statuses: any,
    data: any,
    selectedRow: Writable<number>
</script>

<tr
  {id}
  on:click={() => {
    console.log('CURRENT DATA ', row)
    rowClickMethod(number)
  }}
  style={`${
    checkStatusRow(scheme, statuses, row)
      ? `background-color: ${getColorFromStatus(scheme, number, statuses, $data)};`
      : ''
  } ${$loading == true ? 'background-color: gray' : null}`}
  class={`${$selectedRow == number + $pagination.rowsPerPage * ($pagination.currentPage - 1) ? 'selected-row' : ''}`}
>
  <slot name="actions" />
  {#each row as cell, i}
    {#if scheme[i] != undefined}
      {#if scheme[i].visible == true}
        <td class="cell">
          <div class="field has-addons" data-component="cell-container">
            <p id={`${i}-${number + $pagination.rowsPerPage * ($pagination.currentPage - 1)}`}>
              {cell}
            </p>
            {#if scheme[i].editable == true}
              <slot name="editor" cellNumber={i} />
            {/if}
          </div>
        </td>
      {/if}
    {/if}
  {/each}
</tr>
