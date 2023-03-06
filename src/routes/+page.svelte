<script lang="ts">
  import { writable } from 'svelte/store'
  import { showPopup } from '$lib/store'
  import filtersJSON from '$lib/filters.json'
  import Modal from '$lib/components/Extra/Modal.svelte'
  import type IQueryFilter from '$lib/interfaces/IQueryFilter'
  import type ICategories from '$lib/interfaces/ICategories'
  import DataTableRendererCSR from 'DataTable'
  import DragAndDrop from 'DataTAble/DragAndDrop.svelte'

  const show = writable<string>()
  const activatedFilters = writable<IQueryFilter[]>([])
  const categoriesFilter = writable<ICategories[]>([])
  const originalFilterStore = writable<ICategories[]>(filtersJSON)

  const updatePopup = async (value: boolean) => {
    $showPopup = value
  }

  const showCategories = async (name: string) => {
    $show == name ? ($show = '') : ($show = name)
  }

  const filterCategories = async (event: any, filter: any) => {
    categoriesFilter.update((oldFilters): ICategories[] => {
      if (oldFilters.filter(f => f.name == filter).length > 0) {
        const chosenFilter = oldFilters.filter(f => f.name == filter)[0]
        const options = $originalFilterStore
          .filter(f => f.name == filter)[0]
          .options.filter(option => {
            if (option.toLowerCase().includes(event.target.value.toLowerCase())) return option
          })
        chosenFilter.options = options
        console.log(chosenFilter)
        oldFilters.push(chosenFilter)
      } else {
        const options = $originalFilterStore
          .filter(f => f.name == filter)[0]
          .options.filter(option => {
            if (option.toLowerCase().includes(event.target.value.toLowerCase())) return option
          })
        const chosenFilter = {
          name: filter,
          options: options,
        }
        oldFilters.push(chosenFilter)
      }
      return oldFilters
    })
    console.log($categoriesFilter)
  }

  const addFilterCategorie = async (filter: any) => {
    categoriesFilter.update((oldFilters): any => {
      for (let f of oldFilters) {
        if (f.name == filter) {
          f.options = $originalFilterStore.filter(obj => obj.name == filter)[0].options
        }
      }
      return oldFilters
    })
  }

  const removeFilterCategorie = async (filter: any) => {
    categoriesFilter.update((oldFilters): any => {
      for (let f of oldFilters) {
        if (f.name == filter) {
          console.log($originalFilterStore)
          f.options = $originalFilterStore.filter(obj => obj.name == filter)[0].options
        }
      }
      return oldFilters
    })
    // console.log($filtersStore)
  }

  const fetchOptionsCSV = {
    method: 'GET',
    header: {
      'Content-Type': 'text/csv;charset=UTF-8',
    },
  }

  const urlCSV =
    'https://raw.githubusercontent.com/RADar-AZDelta/AZDelta-OMOP-CDM/main/observation/observation_concept_id/mzg_usagi.csv'

  const file = writable<File | null>(null)
  const delimiter: string = ','

  $: {
    console.log($originalFilterStore)
  }

  // Encode url's before calling API --> space becomes %20
</script>

<h1>Keun</h1>

<DragAndDrop {file} fileExtension="csv" />
{#if $file != null}
  <DataTableRendererCSR file={$file} dataType="csv" {delimiter} />
{/if}

<Modal {updatePopup} show={$showPopup}>
  <h1 class="title">Mapping data</h1>
  <section class="filters-container">
    <h2 class="filters-title">Filters</h2>
    <div class="filters">
      {#each $originalFilterStore as filter}
        <button class="filter-button" on:click={() => showCategories(filter.name)}>
          <p class="filter-name">{filter.name}</p>
          <img src="/descending-sort.svg" alt="Arrow down icon" />
        </button>
        {#if $show == filter.name}
          <div
            class={`filter-show ${
              $categoriesFilter.length > 0
                ? $categoriesFilter.filter(f => f.name == filter.name)[0].options.length > 7
                  ? 'scroll'
                  : filter.options.length > 7
                  ? 'scroll'
                  : null
                : filter.options.length > 7
                ? 'scroll'
                : null
            }`}
          >
            <div class="filter-input-container">
              <input
                type="text"
                placeholder="filter"
                class="filter-input"
                data-component={filter.name}
                on:change={event => {
                  filterCategories(event, filter.name)
                }}
              />
              <button class="filter-remove" on:click={() => removeFilterCategorie(filter.name)}>
                <img src="/x.svg" alt="Remove filter button" />
              </button>
            </div>
            {#if $categoriesFilter.length > 0 && $categoriesFilter.filter(f => f.name == filter.name)[0].options.length > 0}
              {#each $categoriesFilter.filter(f => f.name == filter.name)[0].options as option}
                <div class="filter-option">
                  <input type="checkbox" />
                  <p>{option}</p>
                </div>
              {/each}
            {:else}
              {#each filter.options as option}
                <div class="filter-option">
                  <input type="checkbox" />
                  <p>{option}</p>
                </div>
              {/each}
            {/if}
          </div>
        {:else}
          <div />
        {/if}
      {/each}
    </div>
  </section>
</Modal>

<style>
  .title {
    font-size: 1.5rem;
    font-weight: 700;
    text-align: center;
  }

  .filters-container {
    width: 20%;
    height: 80%;
    padding-left: 1rem;
  }

  .filters {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .filter-name {
    font-weight: 700;
  }

  .filter-option {
    display: flex;
    gap: 1rem;
  }

  .filter-hidden {
    display: none;
  }

  .filter-show {
    padding: 1rem;
    display: block;
    min-height: 30%;
    max-height: 60%;
  }

  .filter-input-container {
    display: flex;
    align-items: center;
  }

  .filter-input {
    padding: 0.5rem 1rem;
  }

  .scroll {
    overflow-y: scroll;
  }

  .filter-remove {
    position: relative;
    display: flex;
    align-self: center;
    right: 2.5rem;
    top: 0;
    border: none;
    background-color: inherit;
    cursor: pointer;
  }
</style>
