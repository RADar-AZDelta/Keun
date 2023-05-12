<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'
  import { localStorageSetter } from '$lib/utils'

  export let settings: Record<string, any>

  let settingsDialog: HTMLDialogElement

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
            <label for="MultipleConcepts" tabindex="0" />
          </div>
        </div>
        <div data-name="option">
          <p>Automatic mapping?</p>
          <div data-name="switch">
            <input id="Automap" type="checkbox" bind:checked={settings.autoMap} on:change={saveSettings} />
            <label for="Automap" tabindex="0" />
          </div>
        </div>
        <div data-name="option">
          <p>Language</p>
          <select name="language" id="language" bind:value={settings.language} on:change={saveSettings}>
            {#each Object.keys(languages) as lang}
              <option value={lang} selected={lang == 'en' ? true : false}>{languages[lang]}</option>
            {/each}
          </select>
        </div>
      </div>
    </section>
  {/if}
</dialog>
