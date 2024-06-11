<script lang="ts">
  import { Search } from '@radar-azdelta/svelte-athena-search'
  import SearchHead from '$lib/components/mapping/SearchHead.svelte'
  import CustomView from '$lib/components/mapping/views/CustomView.svelte'
  import Details from '$lib/components/mapping/details/Details.svelte'
  import MappedView from '$lib/components/mapping/views/MappedView.svelte'
  import AthenaActions from '$lib/components/mapping/views/AthenaActions.svelte'
  import Config from '$lib/helpers/Config'
  import type { IView } from '@radar-azdelta/svelte-athena-search'
  import Mapping from '$lib/helpers/mapping/Mapping'
  import Table from '$lib/helpers/tables/Table'
  import { localStorageGetter } from '$lib/helpers/utils'
  import clickOutside from '$lib/actions/clickOutside'
  import type { IAthenaSearchProps } from '$lib/interfaces/Types'
  import SvgIcon from '../extra/SvgIcon.svelte'

  let { selectedRow, selectedRowIndex, globalAthenaFilter = $bindable(), navigateRow }: IAthenaSearchProps = $props()

  const views: IView[] = Config.athenaViews

  let dialog: HTMLDialogElement | undefined = $state()
  let equivalence: string = $state('EQUAL')
  let activatedAthenaFilters = new Map<string, string[]>([['standardConcept', ['Standard']]])

  async function updateDetails(reviewer: string, comment: string) {
    const updatedProperties = { comment, assignedReviewer: reviewer }
    await Mapping.updateMappingInfo(selectedRowIndex, updatedProperties)
  }

  async function equivalenceChange(value: string) {
    equivalence = value
  }

  async function getAllMappedToConcepts() {
    if (!selectedRow?.sourceCode) return
    await Table.saveAllMappedConcepts(selectedRow.sourceCode)
  }

  const closeDialog = () => dialog?.close()

  export async function showDialog(): Promise<void> {
    dialog?.showModal()
  }

  function EscapeListener(e: KeyboardEvent) {
    if (e.key === 'Escape') closeDialog()
  }

  const addKeyListener = () => dialog?.addEventListener('keydown', EscapeListener)

  $effect(() => {
    const savedFilters = localStorageGetter('AthenaFilters')
    activatedAthenaFilters = savedFilters ?? new Map<string, string[]>([['standardConcept', ['Standard']]])
  })

  $effect(() => {
    if (dialog) addKeyListener()
  })

  $effect(() => {
    selectedRowIndex
    getAllMappedToConcepts()
  })

  $effect(() => {
    // Small hack to rerender table because on init of Search comp, it searches athena without filter
    globalAthenaFilter.filter = (globalAthenaFilter.filter ?? 'tes').toString()
  })
</script>

<dialog bind:this={dialog} class="athena-dialog">
  <div class="dialog-container" use:clickOutside onoutClick={closeDialog}>
    <button class="close-dialog" onclick={closeDialog}><SvgIcon id="x" /></button>
    <section class="search-container">
      {#if selectedRow}
        <Search {views} bind:globalFilter={globalAthenaFilter} showFilters={true} limitedFilters={Config.limitedFilters}>
          {#snippet actionChild(renderedRow: any)}
            <div class="actions-grid">
              <AthenaActions {renderedRow} {selectedRow} {selectedRowIndex} {equivalence} />
            </div>
          {/snippet}
          {#snippet upperChild()}
            <div>
              <SearchHead {selectedRow} index={selectedRowIndex} {navigateRow} />
            </div>
          {/snippet}
          {#snippet firstView()}
            <div>
              <CustomView {selectedRow} {selectedRowIndex} {equivalence} />
            </div>
          {/snippet}
          {#snippet secondView()}
            <div>
              <MappedView {selectedRow} />
            </div>
          {/snippet}
          {#snippet rightChild()}
            <div>
              <Details usagiRow={selectedRow} update={updateDetails} equivalenceUpdate={equivalenceChange} />
            </div>
          {/snippet}
        </Search>
      {/if}
    </section>
  </div>
</dialog>

<style>
  .actions-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
    height: max-content;
    max-width: 100%;
  }

  button {
    padding: 0 5px;
    font-size: 10px;
  }

  .athena-dialog {
    width: 90%;
    height: 90%;
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
  }

  .close-dialog {
    position: absolute;
    right: 1rem;
    top: 1rem;
    border: none;
    background-color: inherit;
    color: #4f4f4f;
  }

  .close-dialog:hover {
    color: #3b3b3b;
  }

  .close-dialog:focus {
    outline: none;
    box-shadow: 0 0 0 2px #cecece;
  }

  .search-container {
    padding: 0.5rem 0 0 0;
  }
</style>
