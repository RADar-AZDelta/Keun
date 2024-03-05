<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { localStorageGetter } from '@radar-azdelta-int/radar-utils'
  import { Search } from '@radar-azdelta/svelte-athena-search'
  import SearchHead from '$lib/components/mapping/SearchHead.svelte'
  import CustomView from '$lib/components/mapping/views/CustomView.svelte'
  import Details from '$lib/components/mapping/details/Details.svelte'
  import MappedView from '$lib/components/mapping/views/MappedView.svelte'
  import { SvgIcon, clickOutside } from '@radar-azdelta-int/radar-svelte-components'
  import AthenaActions from './views/AthenaActions.svelte'
  import { Config } from '$lib/helperClasses/Config'
  import type { IView } from '@radar-azdelta/svelte-athena-search'
  import type { IMappedRow, IUsagiRow, MappingEvents, NavigateRowED } from '$lib/components/Types'
  import type { EquivalenceChangeED, UpdateDetailsED } from '$lib/components/Types'
  import Mapping from '$lib/classes/mapping/Mapping'
  import Table from '$lib/classes/tables/Table'

  export let selectedRow: IUsagiRow, selectedRowIndex: number
  export let globalAthenaFilter: { column: string; filter: string | undefined }

  const dispatch = createEventDispatcher<MappingEvents>()
  const views: IView[] = Config.athenaViews

  let dialog: HTMLDialogElement
  let mappedData: (IMappedRow | object)[] = [{}]
  let equivalence: string = 'EQUAL'
  let activatedAthenaFilters = new Map<string, string[]>([['standardConcept', ['Standard']]])

  async function onUpdateDetails(e: CustomEvent<UpdateDetailsED>) {
    const { comment, reviewer: assignedReviewer } = e.detail
    const updatedProperties = { comment, assignedReviewer }
    await Mapping.updateMappingInfo(selectedRowIndex, updatedProperties)
  }

  const equivalenceChange = (e: CustomEvent<EquivalenceChangeED>) => (equivalence = e.detail.equivalence)

  async function getAllMappedToConcepts() {
    if (!selectedRow?.sourceCode) return
    await Table.saveAllMappedConcepts(selectedRow.sourceCode)
  }

  async function fillMappedTable() {
    if (!selectedRow?.sourceCode) return
    mappedData = await Table.getAllMappedConcepts(selectedRow.sourceCode)
  }

  const onNavigateRow = (e: CustomEvent<NavigateRowED>) => dispatch('navigateRow', { ...e.detail })

  const closeDialog = () => dialog.close()

  export async function showDialog(): Promise<void> {
    dialog.showModal()
    fillMappedTable()
    reset()
  }

  async function reset() {
    const updatedProperties = { comment: '', assignedReviewer: '' }
    await Mapping.updateMappingInfo(selectedRowIndex, updatedProperties)
  }

  function EscapeListener(e: KeyboardEvent) {
    if (e.key === 'Escape') closeDialog()
  }

  const addKeyListener = () => dialog.addEventListener('keydown', EscapeListener)

  onMount(() => {
    const savedFilters = localStorageGetter('AthenaFilters')
    activatedAthenaFilters = savedFilters ?? new Map<string, string[]>([['standardConcept', ['Standard']]])
  })

  $: {
    if (dialog) addKeyListener
  }

  $: {
    selectedRowIndex
    getAllMappedToConcepts()
    fillMappedTable()
  }
</script>

<dialog bind:this={dialog} class="athena-dialog">
  <div class="dialog-container" use:clickOutside on:outClick={closeDialog}>
    <button class="close-dialog" on:click={closeDialog}><SvgIcon id="x" /></button>
    <section class="search-container">
      <Search {views} bind:globalFilter={globalAthenaFilter} showFilters={true}>
        <div slot="action-athena" let:renderedRow class="actions-grid">
          <AthenaActions {renderedRow} {selectedRow} {selectedRowIndex} {equivalence} />
        </div>
        <div slot="upperSlot">
          <SearchHead {selectedRow} on:navigateRow={onNavigateRow} />
        </div>
        <div slot="slotView1">
          <CustomView {selectedRow} {selectedRowIndex} {equivalence} />
        </div>
        <div slot="slotView2">
          <MappedView {mappedData} {selectedRow} />
        </div>
        <div slot="rightSlot">
          <Details usagiRow={selectedRow} on:updateDetails={onUpdateDetails} on:equivalenceChange={equivalenceChange} />
        </div>
      </Search>
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
