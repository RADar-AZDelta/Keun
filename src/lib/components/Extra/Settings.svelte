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

  let showModal = false,
    mapToMultipleConcepts = false,
    language = 'nl'

  async function saveSettings(e: Event) {
    // const element = e.target as HTMLSelectElement | HTMLInputElement
    // const value = element.checked != undefined ? !element.checked : element.value
    // const name = element.id

    settings.mapToMultipleConcepts = mapToMultipleConcepts
    settings.language = language
    localStorageSetter('settings', settings)
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
        <p>{name}</p>
        <div data-name="switch">
          <input type="checkbox" bind:checked={mapToMultipleConcepts} on:change={saveSettings} />
          <label>Map to multiple concepts?</label>
        </div>
      </div>

      {#each Object.entries(settings) as [name, value]}
        <div data-name="option">
          <p>{name}</p>
          {#if typeof value == 'boolean'}
            <div data-name="switch">
              <input id={name} type="checkbox" bind:checked={value} on:change={saveSettings} />
              <label for={name}>Test</label>
            </div>
          {:else if typeof value == 'string'}
            {#if name == 'Language'}
              <select id={name} {value} on:change={saveSettings}>
                {#each Object.keys(languages) as lang}
                  <option value={lang}>{languages[lang]}</option>
                {/each}
              </select>
            {/if}
          {:else if typeof value == 'number'}
            <input type="number" bind:value on:change={saveSettings} />
          {/if}
        </div>
      {/each}
    </div>
  </section>
</Modal>
