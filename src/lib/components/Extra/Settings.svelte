<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'
  import { localStorageGetter, localStorageSetter } from '$lib/utils'
  import { clickOutside } from '$lib/actions/clickOutside'
  import { createEventDispatcher } from 'svelte'
  import type { CustomOptionsEvents, ISettings } from '../Types'
  import { dev } from '$app/environment'

  export let settings: ISettings

  let settingsDialog: HTMLDialogElement
  const dispatch = createEventDispatcher<CustomOptionsEvents>()

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

  // A method to close the dialog if it was opened
  function closeDialog(): void {
    if (settingsDialog.attributes.getNamedItem('open') != null) settingsDialog.close()
  }

  // A method to open the dialog if it was closed
  function openDialog(): void {
    if (settingsDialog.attributes.getNamedItem('open') == null) settingsDialog.showModal()
  }

  // A method to set the settings in the localstorage
  async function saveSettings(): Promise<void> {
    if (settings.fontsize > 15) settings.fontsize = 15
    else if (settings.fontsize < 6) settings.fontsize = 6
    if (settingsDialog.attributes.getNamedItem('open') != null) {
      settings.fontsize = settings.fontsize > 15 ? 51 : settings.fontsize
      const previous = localStorageGetter('settings')
      localStorageSetter('settings', settings)
      // Check if the automap setting has changed and if so, dispatch an event with the new settings and explicitly set the automap to true to trigger the automapping again
      if (settings.autoMap == true && previous.autoMap !== settings.autoMap) {
        if (dev) console.log('saveSettings: The settings have been saved and the automapping has been triggered')
        dispatch('settingsChanged', { settings, autoMap: true })
      } else {
        if (dev) console.log('saveSettings: The settings have been saved')
        dispatch('settingsChanged', { settings })
      }
    }
  }
</script>

<button title="Settings-Keun" aria-label="Settings button" on:click={openDialog} data-name="header-button"
  ><SvgIcon href="icons.svg" id="settings" width="16px" height="16px" />
</button>

<dialog bind:this={settingsDialog} data-name="settings-dialog">
  <div
    data-name="settings-container"
    use:clickOutside
    on:outClick={() => {
      saveSettings()
      closeDialog()
    }}
  >
    {#if settings}
      <button
        data-name="close-dialog"
        on:click={() => {
          saveSettings()
          closeDialog()
        }}
      >
        <SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button
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
            <p>Language of source CSV</p>
            <select name="language" id="language" bind:value={settings.language} on:change={saveSettings}>
              {#each Object.keys(languages) as lang}
                <option value={lang} selected={lang == settings.language ? true : false}>{languages[lang]}</option>
              {/each}
            </select>
          </div>
          <div data-name="option">
            <p>Default vocabulary ID for custom concepts</p>
            <input type="text" placeholder="local ID e.g. AZDELTA" bind:value={settings.vocabularyIdCustomConcept} />
          </div>
          <div data-name="option">
            <p>Font size</p>
            <input
              type="number"
              bind:value={settings.fontsize}
              on:change={saveSettings}
              min="6"
              max="15"
            />
          </div>
        </div>
      </section>
    {/if}
  </div>
</dialog>
