<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import debounce from 'lodash.debounce'
  import { SvgIcon } from '@radar-azdelta-int/radar-svelte-components'
  import Equivalence from '$lib/components/mapping/details/Equivalence.svelte'
  import AutocompleteInputSettings from '$lib/components/extra/AutocompleteInputSettings.svelte'
  import type { AutoCompleteShortED, EquivalenceChangeED, IUsagiRow, MappingEvents } from '$lib/Types'

  export let usagiRow: IUsagiRow

  const dispatch = createEventDispatcher<MappingEvents>()

  let show: boolean = false
  let reviewer: string = usagiRow?.assignedReviewer ?? ''
  let comment: string = usagiRow?.comment ?? ''

  const onEquivalenceChange = (e: CustomEvent<EquivalenceChangeED>) => dispatch('equivalenceChange', { ...e.detail })
  const onInputComment = debounce(() => updateDetails(), 500)

  async function onReviewerChanged(e: CustomEvent<AutoCompleteShortED>) {
    ;({ value: reviewer } = e.detail)
    updateDetails()
  }

  const updateDetails = () => dispatch('updateDetails', { reviewer, comment: comment.replace(/(\r\n|\n|\r)/gm, ' ') })
  const hideDetail = () => (show = false)
  const showDetail = () => (show = true)

  async function reset() {
    reviewer = usagiRow?.assignedReviewer ?? ''
    comment = usagiRow?.comment ?? ''
  }

  $: {
    usagiRow
    reset()
  }
</script>

{#if show}
  <section class="container">
    <div class="head">
      <button class="button" on:click={hideDetail}>
        <SvgIcon id="chevrons-right" />
      </button>
      <h2 class="title">Detail</h2>
    </div>
    <div class="info-container">
      <Equivalence on:equivalenceChange={onEquivalenceChange} />
      <div class="reviewer">
        <p>Assigned reviewer: {reviewer}</p>
        <AutocompleteInputSettings on:autoCompleteShort={onReviewerChanged} />
      </div>
      <div class="comments-container">
        <p class="comments-title">Comments</p>
        <textarea title="Comments" name="Comments" cols="28" rows="6" on:input={onInputComment} bind:value={comment} />
      </div>
    </div>
  </section>
{:else}
  <div class="sidebar-left">
    <button class="closed-bar" on:click={showDetail}>
      <SvgIcon id="chevrons-left" />
      {#each 'DETAIL' as letter, _}
        <p>{letter}</p>
      {/each}
      <SvgIcon id="chevrons-left" />
    </button>
  </div>
{/if}

<style>
  .container {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 15%;
    padding: 0 0.5rem 0 1.5rem;
    border-left: 1px solid lightgray;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 0;
  }

  .title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
    padding-right: 1rem;
  }

  .button {
    background-color: inherit;
    cursor: pointer;
    border: none;
  }

  .sidebar-left {
    height: 100%;
    border-left: 1px solid #cecece;
    padding: 0.5rem;
  }

  .closed-bar {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: start;
    gap: 1rem;
    cursor: pointer;
    border: none;
    background-color: inherit;
    font-weight: bold;
  }

  .info-container {
    flex: 1 1 auto;
  }

  .reviewer {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 90%;
    margin: 0;
  }

  .comments-container {
    padding-top: 2rem;
  }

  .comments-title {
    padding-bottom: 1rem;
  }

  textarea {
    border: 1px solid #e2e2e2;
    resize: none;
    border-radius: 10px;
    width: 90%;
  }

  textarea:hover {
    border: 1px solid #bbbbbb;
  }

  textarea:focus {
    outline: none;
    box-shadow: 0 0 0 2px #c5c5c5;
  }
</style>
