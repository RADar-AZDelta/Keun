<script lang="ts">
  import DataTable from '../../lib/RADar-DataTable/src/lib/components/DataTable.svelte'
  import athenaNamesJSON from '$lib/columnsAthena.json'
  import Header from '$lib/components/Extra/Header.svelte'
  import User from '$lib/components/Extra/User.svelte'
  import type {
    ActionPerformedEventDetail,
    AutoMappingEventDetail,
    FilterOptionsChangedEventDetail,
    SingleMappingEventDetail,
    SingleSorting,
    VisibilityChangedEventDetail,
  } from '$lib/components/Types'
  import Settings from '$lib/components/Extra/Settings.svelte'
  import type {
    IColumnMetaData,
    IPagination,
    SortDirection,
    TFilter,
  } from '../../lib/RADar-DataTable/src/lib/components/DataTable'
  import Modal from '$lib/components/Extra/Modal.svelte'
  import { assembleURL, checkForAuthor, mapReviver, updateSettings } from '$lib/utils'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import AthenaLayout from '$lib/components/Extra/AthenaLayout.svelte'
  import Row from '$lib/components/Mapping/Row.svelte'
  import { onMount } from 'svelte/internal'

  let settingsVisibility: boolean = false
  let settings = new Map<string, boolean>([['Map to multiple concepts', false]])
  let authorVisibility: boolean = false
  let authorInput: string = ''
  let author: string = ''
  let mappingVisibility: boolean = false

  let APIFilters: string[]
  let APICall: string
  let equivalenceMapping: string
  let athenaFilteredColumn: string = 'name'
  let athenaFilter: string
  let selectedRow: any[]
  let selectedRowIndex: number

  let mappingURL: string = 'https://athena.ohdsi.org/api/v1/concepts?'
  let athenaPagination: IPagination = {
    currentPage: 0,
    rowsPerPage: 10,
  }
  let athenaSorting: SingleSorting
  let athenaFiltering: string
  let athenaNames: Object = athenaNamesJSON
  let importantAthenaColumns = new Map<string, string>([
    ['id', 'conceptId'],
    ['name', 'conceptName'],
    ['domain', 'domainId'],
  ])
  let additionalFields: object = {
    'ADD_INFO:author1': '',
    'ADD_INFO:author2': '',
    'ADD_INFO:lastEditor': '',
    sourceAutoAssignedConceptIds: '',
    'ADD_INFO:additionalInfo': '',
    'ADD_INFO:prescriptionID': '',
    'ADD_INFO:ATC': '',
    matchScore: 1,
    mappingStatus: '',
    equivalence: 'EQUAL',
    statusSetBy: '',
    statusSetOn: new Date().getTime(),
    mappingType: 'MAPS_TO',
    comment: 'AUTO MAPPED',
    createdBy: 'ctl',
    createdOn: new Date().getTime(),
    assignedReviewer: '',
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // DATA
  ///////////////////////////////////////////////////////////////////////////////////////////////

  let data = [
    {
      name: 'Rory',
      age: 35,
      country: 'Belgium',
      telephone: '0800-123-524-634',
      address: 'Rue des Taillis 221,Gijzelbrechtegem,West Flanders,8570,',
    },
    {
      name: 'Amethyst',
      age: 35,
      country: 'Belgium',
      telephone: '0800-123-524-634',
      address: 'Eikstraat 450,Belgrade,Namur,5001,',
    },
    {
      name: 'Bob',
      age: 35,
      country: 'Belgium',
      telephone: '0800-123-524-634',
      address: 'Rue du Château 143,Lochristi,East Flanders,9080,',
    },
    {
      name: 'Cindy',
      age: 35,
      country: 'Belgium',
      telephone: '0800-123-524-634',
      address: 'Rue Libert 93,Warsage,Liège,4608,',
    },
    {
      name: 'Derek',
      age: 35,
      country: 'USA',
      telephone: '0800-123-524-634',
      address: '123 Main Street, New York, NY 10001',
    },
    {
      name: 'Eve',
      age: 35,
      country: 'Belgium',
      telephone: '0800-123-524-634',
      address: 'Rue du Pont Simon 204,Antwerpen,Antwerp,2040,',
    },
    {
      name: 'Frank',
      age: 35,
      country: 'Belgium',
      telephone: '0800-123-524-634',
      address: 'Rue du Vert Galant 190,Poulseur,Liège,4171,',
    },
    {
      name: 'Gina',
      age: 35,
      country: 'Belgium',
      telephone: '0800-123-524-634',
      address: 'Poolse Winglaan 288,Sint-Kwintens-Lennik,Flemish Brabant,1750,',
    },
    {
      name: 'Hannah',
      age: 35,
      country: 'Belgium',
      telephone: '0800-123-524-634',
      address: 'Rue de la Poste 335,Ramsdonk,Flemish Brabant,1880,',
    },
    {
      name: 'Ivan',
      age: 35,
      country: 'Belgium',
      telephone: '0800-123-524-634',
      address: 'Rue du Centre 259,Marquain,Hainaut,7522,',
    },
    {
      name: 'Jenny',
      age: 35,
      country: 'Belgium',
      telephone: '0800-123-524-634',
      address: 'Rue des Campanules 311,Strombeek-Bever,Flemish Brabant,1853,',
    },
    {
      name: 'Karl',
      age: 35,
      country: 'Belgium',
      telephone: '0800-123-524-634',
      address: 'Rue Engeland 373,Neerrepen,Limburg,3700,',
    },
    {
      name: 'Rory2',
      age: 45,
      country: 'Belgium',
      telephone: '0800-123-524-634',
      address: 'Machelsesteenweg 343,Montroeul-sur-Haine,Hainaut,7350,',
    },
  ]

  let matrix = data.map(obj => Object.values(obj))

  let columns: IColumnMetaData[] = [
    {
      id: 'name',
    },
    {
      id: 'age',
    },
    {
      id: 'country',
    },
    {
      id: 'telephone',
    },
    {
      id: 'address',
    },
  ]

  let dataTableMatrix: DataTable

  let dataTableAthena: DataTable

  const athenaColumns: IColumnMetaData[] = [
    {
      id: 'id',
    },
    {
      id: 'code',
    },
    {
      id: 'name',
    },
    {
      id: 'className',
    },
    {
      id: 'standardConcept',
    },
    {
      id: 'invalidReason',
    },
    {
      id: 'domain',
    },
    {
      id: 'vocabulary',
    },
    {
      id: 'score',
    },
  ]

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // EVENTS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  function authorVisibilityChanged(event: CustomEvent<VisibilityChangedEventDetail>) {
    authorVisibility = event.detail.visibility
  }

  function settingsVisibilityChanged(event: CustomEvent<VisibilityChangedEventDetail>) {
    settingsVisibility = event.detail.visibility
  }

  function mappingVisibilityChanged(event: CustomEvent<VisibilityChangedEventDetail>) {
    mappingVisibility = event.detail.visibility
    event.detail.data != undefined
      ? ((selectedRow = event.detail.data.row), (selectedRowIndex = event.detail.data.index))
      : null
  }

  function cancelAuthorUpdate() {
    authorVisibility = false
  }

  function saveAuthorUpdate() {
    authorVisibility = false
    author = authorInput
    localStorage.setItem('author', author)
  }

  function filterOptionsChanged(event: CustomEvent<FilterOptionsChangedEventDetail>) {
    assembleAthenaURL()
    fetchDataURL = fetchData
  }

  async function autoMapping(event: CustomEvent<AutoMappingEventDetail>) {
    const row = event.detail.row
    const index = columns.indexOf(columns.find(column => column.id == athenaFilteredColumn)! as keyof object)
    await assembleAthenaURL(row[index])
      .then(async (URL: string) => await fetch(URL))
      .then(async (response: Response) => await response.json())
      .then((res: any) => {
        const firstRow = res.content[0]
        mapRow(firstRow, event.detail.index)
      })
    columns = columns
    matrix = data.map(obj => Object.values(obj))
    matrix = matrix
    athenaFiltering = ''
  }

  async function singleRowMapping(event: CustomEvent<SingleMappingEventDetail>) {
    await mapRow(event.detail.row)
    columns = columns
    matrix = data.map(obj => Object.values(obj))
    matrix = matrix
  }

  function actionPerformed(event: CustomEvent<ActionPerformedEventDetail>) {
    columns.find(column => column.id == 'mappingStatus') == undefined ? columns.push({ id: 'mappingStatus' }) : null
    // @ts-ignore
    data[event.detail.index]['mappingStatus'] = event.detail.action
    columns = columns
    matrix = data.map(obj => Object.values(obj))
    matrix = matrix
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // METHODS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  const assembleAthenaURL = async (filter?: string) => {
    if (filter == undefined) {
      if (athenaFiltering == undefined || athenaFiltering == '') {
        if (selectedRow == undefined) {
          athenaFiltering = ''
        } else {
          athenaFiltering = String(
            selectedRow[columns.indexOf(columns.find(column => column.id == athenaFilteredColumn)!) as keyof object]
          )
        }
      }
    } else {
      athenaFiltering = filter
    }
    const URL = assembleURL(mappingURL, APIFilters, athenaPagination, athenaFiltering, athenaSorting, athenaNames)
    APICall = URL
    return URL
  }

  const fetchData = async (
    filteredColumns: Map<String, TFilter>,
    sortedColumns1: Map<string, SortDirection>,
    pagination: IPagination
  ) => {
    athenaPagination = pagination
    await assembleAthenaURL()
    const response = await fetch(APICall)
    const data = await response.json()
    return {
      data: data.content,
      totalRows: data.totalElements,
    }
  }

  const mapRow = async (row: any[], i?: number) => {
    let authorFilled = false
    let rowIndex
    if (i == undefined) rowIndex = selectedRowIndex
    else rowIndex = i

    for (let [name, alt] of importantAthenaColumns) {
      columns.find(column => column.id == alt) == undefined ? columns.push({ id: alt }) : null
      const index = athenaColumns.indexOf(athenaColumns.find(column => column.id == name)!)
      if (row instanceof Array == false) data[rowIndex][alt as keyof Object] = row[name as keyof object]
      else data[rowIndex][alt as keyof Object] = row[index]
    }
    for (let col of Object.keys(additionalFields)) {
      columns.find(column => column.id == col) == undefined ? columns.push({ id: col }) : null
      // @ts-ignore
      if (col == 'equivalence') data[rowIndex][col] = equivalenceMapping
      else if ((col == 'ADD_INFO:author1' || col == 'ADD_INFO:author2') && authorFilled == false) {
        const { first, second } = await checkForAuthor(data, columns, author)
        // @ts-ignore
        data[rowIndex]['ADD_INFO:author1'] = first
        // @ts-ignore
        data[rowIndex]['ADD_INFO:author2'] = second
        authorFilled = true
      }
      // @ts-ignore
      else data[rowIndex][col] = additionalFields[col]
    }
  }

  let fetchDataURL = fetchData

  $: {
    if (author == '' || author == undefined || author == null) authorVisibility = true
  }

  onMount(() => {
    localStorage.getItem('author') != undefined ? (author = localStorage.getItem('author')!) : null
    if (author != '' || author != undefined || author != null) authorVisibility = false
    else authorVisibility = true

    localStorage.getItem('options') != undefined
      ? (settings = JSON.parse(localStorage.getItem('options')!, mapReviver))
      : null
  })
</script>

<Header />

<div class="buttons is-right" id="settings">
  <Settings showSettingsPopUp={settingsVisibility} on:generalVisibilityChanged={settingsVisibilityChanged} />
  <User showAuthorPopUp={authorVisibility} {author} on:generalVisibilityChanged={authorVisibilityChanged} />
</div>

<!-- MODALS -->

<Modal on:generalVisibilityChanged={settingsVisibilityChanged} show={settingsVisibility} size="medium">
  <h2 class="pop-up-title">Settings</h2>
  <div class="pop-up-container">
    {#each [...settings] as [name, value]}
      <div class="option">
        <p>{name}</p>
        <label class="switch">
          <input
            type="checkbox"
            bind:checked={value}
            on:change={async () => {
              settings = await updateSettings(settings, name, value)
            }}
          />
          <span class="slider round" /></label
        >
      </div>
    {/each}
  </div>
</Modal>

<Modal on:generalVisibilityChanged={authorVisibilityChanged} show={authorVisibility} size="small">
  <div class="pop-up-container-center">
    <h2 class="title is-5">Who is the author?</h2>
    <input id="author" type="text" placeholder="John Wick" class="author-input" bind:value={authorInput} />
    <div class="buttons-container">
      <button class="button is-danger" on:click={cancelAuthorUpdate}>Cancel</button>
      <button class="button is-success" on:click={saveAuthorUpdate}>Save</button>
    </div>
  </div>
</Modal>

<Modal on:generalVisibilityChanged={mappingVisibilityChanged} show={mappingVisibility} size="large">
  <AthenaLayout
    on:filterOptionsChanged={filterOptionsChanged}
    bind:urlFilters={APIFilters}
    bind:equivalenceMapping
    bind:athenaFilteredColumn
    filterColumns={['sourceName', 'sourceCode']}
  >
    <div slot="currentRow" class="currentRow">
      <button id="left" on:click={() => assembleAthenaURL}
        ><SvgIcon href="icons.svg" id="arrow-left" width="16px" height="16px" />
      </button>
      <table class="table">
        <tr>
          <th>sourceCode</th>
          <th>sourceName</th>
          <th>sourceFrequency</th>
        </tr>
        <tr>
          {#if data[0] != undefined}
            <td>{data[0].name}</td>
            <td>{data[0].address}</td>
            <td>{data[0].country}</td>
          {/if}
        </tr>
      </table>
      <button id="right" on:click={() => assembleAthenaURL}>
        <SvgIcon href="icons.svg" id="arrow-right" width="16px" height="16px" />
      </button>
    </div>
    <div slot="table">
      {#if APICall != ''}
        <DataTable data={fetchDataURL} columns={athenaColumns} bind:this={dataTableAthena}>
          <Row
            slot="row"
            let:renderedRow
            let:index
            on:generalVisibilityChanged={mappingVisibilityChanged}
            on:singleMapping={singleRowMapping}
            {renderedRow}
            columns={athenaColumns}
            {index}
            editable={false}
            actions={true}
            {settings}
            table="Athena"
            showMappingPopUp={mappingVisibility}
            bind:dataTable={dataTableAthena}
          />
        </DataTable>
      {/if}
    </div>
    <div slot="extra">
      {#if settings.get('Map to multiple concepts') == true}
        <button> Map multiple </button>
      {/if}
    </div>
  </AthenaLayout>
</Modal>

<!-- DATATABLE -->
<DataTable data={matrix} {columns} options={{ actionColumn: true }} bind:this={dataTableMatrix}>
  <Row
    slot="row"
    let:renderedRow
    let:index
    on:generalVisibilityChanged={mappingVisibilityChanged}
    on:actionPerformed={actionPerformed}
    on:autoMapping={autoMapping}
    {renderedRow}
    {columns}
    {index}
    editable={true}
    actions={true}
    {settings}
    showMappingPopUp={mappingVisibility}
    bind:dataTable={dataTableMatrix}
  />
</DataTable>

<style>
  .switch {
    position: relative;
    display: inline-block;
    width: 60px;
    height: 34px;
  }

  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    -webkit-transition: 0.4s;
    transition: 0.4s;
  }

  .slider:before {
    position: absolute;
    content: '';
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    -webkit-transition: 0.4s;
    transition: 0.4s;
  }

  input:checked + .slider {
    background-color: #2196f3;
  }

  input:focus + .slider {
    box-shadow: 0 0 1px #2196f3;
  }

  input:checked + .slider:before {
    -webkit-transform: translateX(26px);
    -ms-transform: translateX(26px);
    transform: translateX(26px);
  }

  /* Rounded sliders */
  .slider.round {
    border-radius: 34px;
  }

  .slider.round:before {
    border-radius: 50%;
  }
</style>
