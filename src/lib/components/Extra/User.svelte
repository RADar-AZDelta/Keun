<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'
  import { localStorageSetter } from '$lib/utils'
  import Modal from './Modal.svelte'

  export let settings: Record<string, any>

  let showModal = false,
    author: string

  $: {
    setValues(settings)
  }

  function setValues(settings: Record<string, any>) {
    debugger
    if (!settings.author) showModal = true
    author = settings.author
  }

  async function cancelAuthorUpdate() {
    showModal = false
    author = settings.author
  }

  async function saveAuthorUpdate() {
    showModal = false
    settings.author = author
    settings = settings
    localStorageSetter('settings', settings)
  }

  function onGeneralVisibilityChanged(event: CustomEvent) {
    if (!event.detail.visibility && !settings.author) return
    showModal = event.detail.visibility
  }
</script>

<button on:click={() => (showModal = !showModal)} data-name="header-button">
  <p>{settings.author}</p>
  <SvgIcon href="icons.svg" id="user" width="16px" height="16px" />
</button>

<Modal on:generalVisibilityChanged={onGeneralVisibilityChanged} show={showModal} size="small">
  <section data-name="author">
    <h2>Who is the author?</h2>
    <input id="author" type="text" placeholder="John Wick" class="author-input" bind:value={author} />
    <div data-name="buttons-container">
      <button data-name="cancel" on:click={cancelAuthorUpdate} disabled={!settings.author}>Cancel</button>
      <button data-name="save" on:click={saveAuthorUpdate} disabled={!author}>Save</button>
    </div>
  </section>
</Modal>
