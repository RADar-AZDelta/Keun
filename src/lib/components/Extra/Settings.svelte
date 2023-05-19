<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'
  import { localStorageSetter } from '$lib/utils'
  import { clickOutside } from '$lib/actions/clickOutside'
  import { createEventDispatcher } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'

  export let settings: Record<string, any>

  let settingsDialog: HTMLDialogElement
  let dispatch = createEventDispatcher<CustomOptionsEvents>()

  let languages: Record<string, string> = {
    // bg: 'Bulgarian',
    // ca: 'Catalan',
    // cs: 'Czech',
    nl: 'Dutch',
    en: 'English',
    // et: 'Estonian',
    de: 'German',
    fr: 'French',
    // is: 'Icelandic',
    it: 'Italian',
    // nb: 'Norwegian Bokmål',
    // nn: 'Norwegian Nynorsk',
    // fa: 'Persian',
    // pl: 'Polish',
    // pt: 'Portuguese',
    // ru: 'Russian',
    es: 'Spanish',
    // uk: 'Ukrainian',
  }

  function closeDialog() {
    if (settingsDialog.attributes.getNamedItem('open') != null) settingsDialog.close()
  }

  function openDialog() {
    if (settingsDialog.attributes.getNamedItem('open') == null) settingsDialog.showModal()
  }

  // A method to set the settings in the localstorage
  async function saveSettings(e: Event) {
    localStorageSetter('settings', settings)
    dispatch('settingsChanged', { settings })
  }
</script>

<button title="Settings" aria-label="Settings button" on:click={openDialog} data-name="header-button"
  ><SvgIcon href="icons.svg" id="settings" width="16px" height="16px" /></button
>

<dialog bind:this={settingsDialog} data-name="settings-dialog">
  {#if settings}
    <button data-name="close-dialog" on:click={closeDialog}
      ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button
    >
    <section data-name="settings">
      <h2>Settings</h2>
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
          <p>Automatic mapping?</p>
          <div data-name="switch">
            <input id="Automap" type="checkbox" bind:checked={settings.autoMap} on:change={saveSettings} />
            <label for="Automap" />
          </div>
        </div>
        <div data-name="option">
          <p>Language of CSV</p>
          <select name="language" id="language" bind:value={settings.language} on:change={saveSettings}>
            {#each Object.keys(languages) as lang}
              <option value={lang} selected={lang == settings.language ? true : false}>{languages[lang]}</option>
            {/each}
          </select>
        </div>
        <div data-name="option">
          <p>Vocabulary id custom concept</p>
          <input
            type="text"
            use:clickOutside
            bind:value={settings.vocabularyIdCustomConcept}
            on:outClick={saveSettings}
          />
        </div>
      </div>
    </section>
  {/if}
</dialog>
