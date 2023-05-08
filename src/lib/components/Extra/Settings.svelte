<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'
  import { localStorageSetter } from '$lib/utils'
  import Modal from './Modal.svelte'

  export let settings: Record<string, any>

  let languages: Record<string, string> = {
    bg: 'Bulgarian',
    ca: 'Catalan',
    cs: 'Czech',
    nl: 'Dutch',
    en: 'English',
    et: 'Estonian',
    de: 'German',
    fr: 'French',
    is: 'Icelandic',
    it: 'Italian',
    nb: 'Norwegian Bokmål',
    nn: 'Norwegian Nynorsk',
    fa: 'Persian',
    pl: 'Polish',
    pt: 'Portuguese',
    ru: 'Russian',
    es: 'Spanish',
    uk: 'Ukrainian',
  }

  let showModal = false

  async function saveSettings(e: Event) {
    localStorageSetter('settings', settings)
  }
</script>

<button on:click={() => (showModal = !showModal)} data-name="header-button"
  ><SvgIcon href="icons.svg" id="settings" width="16px" height="16px" /></button
>

<Modal on:generalVisibilityChanged={event => (showModal = event.detail.visibility)} show={showModal} size="medium">
  {#if { settings }}
    <section data-name="settings">
      <h2 class="pop-up-title">Settings</h2>
      <div data-name="options">
        <div data-name="option">
          <p>Map to multiple concepts?</p>
          <div data-name="switch">
            <input
              id="MultipleConcepts"
              type="checkbox"
              bind:checked={settings.mapToMultipleConcepts}
              on:change={saveSettings}
            />
            <label for="MultipleConcepts" />
          </div>
        </div>
        <div data-name="option">
          <p>Language</p>
          <select name="language" id="language" bind:value={settings.language} on:change={saveSettings}>
            {#each Object.keys(languages) as lang}
              <option value={lang}>{languages[lang]}</option>
            {/each}
          </select>
        </div>
      </div>
    </section>
  {/if}
</Modal>
