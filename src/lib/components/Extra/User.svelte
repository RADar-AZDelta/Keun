<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'
  import { localStorageSetter } from '$lib/utils'
  import Modal from './Modal.svelte'

  export let settings: Record<string, any>

  let showModal = false,
    backupAuthor: string | undefined

  $: {
    showModal
    showModalChanged()
  }

  $: {
    settings
    settingsChanged()
  }

  function settingsChanged() {
    if (settings && !settings.author) {
      showModal = true
    }
  }

  function showModalChanged() {
    if (showModal) {
      if (!backupAuthor) backupAuthor = settings?.author
    } else backupAuthor = undefined
  }

  async function cancelAuthorUpdate() {
    settings.author = backupAuthor
    showModal = false
  }

  async function saveAuthorUpdate() {
    showModal = false
    settings = settings
    localStorageSetter('settings', settings)
  }

  function onGeneralVisibilityChanged(event: CustomEvent) {
    if (!event.detail.visibility && !settings.author) return
    cancelAuthorUpdate()
    showModal = false
  }
</script>

<button on:click={() => (showModal = !showModal)} data-name="header-button">
  <p>{settings?.author ?? ''}</p>
  <SvgIcon href="icons.svg" id="user" width="16px" height="16px" />
</button>

<Modal on:generalVisibilityChanged={onGeneralVisibilityChanged} show={showModal} size="small">
  {#if { settings }}
    <section data-name="author">
      <h2>Who is the author?</h2>
      <input id="author" type="text" placeholder="John Wick" class="author-input" bind:value={settings.author} />
      <div data-name="buttons-container">
        <button data-name="cancel" on:click={cancelAuthorUpdate} disabled={!settings?.author}>Cancel</button>
        <button data-name="save" on:click={saveAuthorUpdate} disabled={!settings?.author}>Save</button>
      </div>
    </section>
  {/if}
</Modal>
