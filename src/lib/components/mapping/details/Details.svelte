<script lang="ts">
  import { debounce } from '$lib/helpers/utils'
  import SvgIcon from '$lib/components/extra/SvgIcon.svelte'
  import Equivalence from '$lib/components/mapping/details/Equivalence.svelte'
  import AutocompleteInputSettings from '$lib/components/extra/AutocompleteInputSettings.svelte'
  import type { IDetailsProps } from '$lib/interfaces/Types'

  let { usagiRow, update, equivalenceUpdate }: IDetailsProps = $props()

  let show: boolean = $state(false)
  let reviewer: string = $state(usagiRow?.assignedReviewer ?? '')
  let comment: string = $state(usagiRow?.comment ? transformComment(usagiRow.comment) : '')

  const onInputComment = debounce(() => updateDetails(), 500)

  async function reviewerChanged(value: string) {
    reviewer = value
    updateDetails()
  }

  const updateDetails = () => {
    const updatedComment = comment.replaceAll(/\n/g, '/n')
    update(reviewer, updatedComment)
  }

  const hideDetail = () => (show = false)
  const showDetail = () => (show = true)

  async function reset() {
    reviewer = usagiRow?.assignedReviewer ?? ''
    comment = usagiRow?.comment ? transformComment(usagiRow.comment) : ''
  }

  function transformComment(comment: string) {
    return comment.replaceAll('/n', '\n')
  }

  $effect(() => {
    usagiRow
    reset()
  })
</script>

{#if show}
  <section class="container">
    <div class="head">
      <button class="button" onclick={hideDetail}>
        <SvgIcon id="chevrons-right" />
      </button>
      <h2 class="title">Detail</h2>
    </div>
    <div class="info-container">
      <Equivalence {equivalenceUpdate} />
      <div class="reviewer">
        <p>Assigned reviewer: {reviewer}</p>
        <AutocompleteInputSettings autoComplete={reviewerChanged} />
      </div>
      <div class="comments-container">
        <p class="comments-title">Comments</p>
        <textarea title="Comments" name="Comments" cols="28" rows="6" oninput={onInputComment} bind:value={comment}> </textarea>
      </div>
    </div>
  </section>
{:else}
  <div class="sidebar-left">
    <button class="closed-bar" onclick={showDetail}>
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
    white-space: pre-wrap;
  }

  textarea:hover {
    border: 1px solid #bbbbbb;
  }

  textarea:focus {
    outline: none;
    box-shadow: 0 0 0 2px #c5c5c5;
  }
</style>
