<script lang="ts">
  import Editor from '../../../../libs/RADar-DataTable/src/lib/components/Extra/Editor.svelte'
  import type IScheme from '../../../../libs/RADar-DataTable/src/lib/interfaces/IScheme'
  import type IStatus from '../../../../libs/RADar-DataTable/src/lib/interfaces/IStatus'

  export let row: number,
    id: number,
    data: any,
    scheme: IScheme[],
    statusScheme: IStatus[],
    ownEditorVisuals: any,
    ownEditorMethods: any,
    updateData: any,
    updated: any,
    editClick: any,
    editorUpdating: any

  function checkStatuses(row: number) {
    const allStatuses = statusScheme.filter(obj => {
      if (
        $data?.scheme.indexOf(
          $data.scheme.filter((col: IScheme) => col.column.toLowerCase() == obj.column.toLowerCase())[0]
        ) != -1
      ) {
        if (
          obj.status.toLowerCase() ==
          $data?.data[row][
            $data?.scheme.indexOf(
              $data.scheme.filter((col: IScheme) => col.column.toLowerCase() == obj.column.toLowerCase())[0]
            )
          ].toLowerCase()
        ) {
          return obj
        }
      }
    })
    if (allStatuses.length > 0) {
      return true
    } else {
      return false
    }
  }

  function getColorFromStatus(row: number) {
    const allStatuses = statusScheme.filter(obj => {
      if (
        obj.status.toLowerCase() ==
        $data?.data[row][
          $data?.scheme.indexOf(
            $data.scheme.filter((col: IScheme) => col.column.toLowerCase() == obj.column.toLowerCase())[0]
          )
        ].toLowerCase()
      ) {
        return obj
      }
    })
    const priority = Math.max(...allStatuses.map(status => status.priority))
    const status = allStatuses.filter(status => status.priority == priority)[0]
    return status.color
  }
</script>

<tr style={`${checkStatuses(id) ? `background-color: ${getColorFromStatus(id)};` : ''}`}>
  {#each data as cell, i}
    {#if scheme[i].visible == true}
      <td class="cell">
        <div class="field has-addons" data-component="cell-container">
          <p class="content" id="{id} - {i}">
            {cell}
          </p>
          {#if $data.scheme[i].editable == true}
            <Editor
              col={i}
              {row}
              bind:updateData
              bind:updated
              bind:editClick
              bind:editorUpdating
              {ownEditorMethods}
              {ownEditorVisuals}
            />
          {/if}
        </div>
      </td>
    {/if}
  {/each}
</tr>
