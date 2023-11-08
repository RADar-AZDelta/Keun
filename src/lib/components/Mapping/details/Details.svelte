<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import debounce from 'lodash.debounce'
  import Equivalence from '$lib/components/Mapping/details/Equivalence.svelte'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import AutocompleteInputSettings from '$lib/components/Extra/AutocompleteInputSettings.svelte'
  import type {
    CustomOptionsEvents,
    EquivalenceChangeEventDetail,
    ReviewerChangedEventDetail,
  } from '$lib/components/Types'

  export let selectedIndex: number

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  let show: boolean = false
  let reviewer: string = ''
  let comments: string = ''
  let equivalence: string = 'EQUAL'

  async function showDetail(value: boolean) {
    show = value
  }

  async function onEquivalenceChange(e: CustomEvent<EquivalenceChangeEventDetail>) {
    equivalence = e.detail.equivalence
    dispatch('equivalenceChange', { equivalence })
  }

  const onInputComment = debounce(async (e: any): Promise<void> => {
    updateDetails()
  }, 500)

  async function onReviewerChanged(e: CustomEvent<ReviewerChangedEventDetail>) {
    reviewer = e.detail.reviewer
    updateDetails()
  }

  async function updateDetails() {
    dispatch('updateDetails', { index: selectedIndex, equivalence, reviewer, comments })
  }
</script>

{#if show}
  <section class="container">
    <div class="head">
      <button class="button" on:click={() => showDetail(false)}>
        <SvgIcon id="chevrons-right" />
      </button>
      <h2 class="title">Detail</h2>
    </div>
    <div class="info-container">
      <Equivalence on:equivalenceChange={onEquivalenceChange} />
      <div class="reviewer">
        <p>Assigned reviewer: {reviewer}</p>
        <AutocompleteInputSettings on:reviewerChanged={onReviewerChanged} />
      </div>
      <div class="comments-container">
        <p class="comments-title">Comments</p>
        <textarea title="Comments" name="Comments" cols="28" rows="6" on:input={onInputComment} bind:value={comments} />
      </div>
    </div>
  </section>
{:else}
  <div class="sidebar-left">
    <button class="closed-bar" on:click={() => showDetail(true)}>
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
