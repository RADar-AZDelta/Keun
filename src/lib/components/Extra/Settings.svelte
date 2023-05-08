<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'
  import { localStorageSetter } from '$lib/utils'
  import Modal from './Modal.svelte'

  export let settings: Record<string, any>

  let settingsCount: number = 0

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

  let showModal = false,
    mapToMultipleConcepts: boolean,
    language: string

  async function saveSettings(e: Event) {
    settings.mapToMultipleConcepts = mapToMultipleConcepts
    settings.language = language
    localStorageSetter('settings', settings)
  }

  $: {
    settings
    // Count how many times settings has changed because the first time will be the initial values saved in page.svelte & the second time will be the values from the localStorage and after that we want to change the values
    if (settingsCount <= 1) {
      mapToMultipleConcepts = settings.mapToMultipleConcepts
      language = settings.language
      settingsCount += 1
    }
  }
</script>

<button on:click={() => (showModal = !showModal)} data-name="header-button"
  ><SvgIcon href="icons.svg" id="settings" width="16px" height="16px" /></button
>

<Modal on:generalVisibilityChanged={event => (showModal = event.detail.visibility)} show={showModal} size="medium">
  <section data-name="settings">
    <h2 class="pop-up-title">Settings</h2>
    <div data-name="options">
      <div data-name="option">
        <p>Map to multiple concepts?</p>
        <div data-name="switch">
          <input id="MultipleConcepts" type="checkbox" bind:checked={mapToMultipleConcepts} on:change={saveSettings} />
          <label for="MultipleConcepts" />
        </div>
      </div>
      <div data-name="option">
        <p>Language</p>
        <select name="language" id="language" bind:value={language} on:change={saveSettings}>
          {#each Object.keys(languages) as lang}
            <option value={lang}>{languages[lang]}</option>
          {/each}
        </select>
      </div>
    </div>
  </section>
</Modal>
