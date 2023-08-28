<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'
  import { clickOutside } from '$lib/actions/clickOutside'
  import { settings, triggerAutoMapping } from '$lib/store'
  import { base } from '$app/paths'

  let savedAutomapping: boolean

  let settingsDialog: HTMLDialogElement
  let languages: Record<string, string> = {
    nl: 'Dutch',
    en: 'English',
    de: 'German',
    fr: 'French',
    it: 'Italian',
    es: 'Spanish',
  }

  // A method to close the dialog if it was opened
  function closeDialog(): void {
    if (settingsDialog.attributes.getNamedItem('open') != null) settingsDialog.close()
  }

  // A method to open the dialog if it was closed
  function openDialog(): void {
    savedAutomapping = $settings.autoMap
    if (settingsDialog.attributes.getNamedItem('open') == null) settingsDialog.showModal()
  }

  // A method to set the settings in the localstorage
  async function saveSettings(): Promise<void> {
    if (settingsDialog.attributes.getNamedItem('open') != null) {
      if($settings.fontsize > 16) $settings.fontsize = 16
      else if ($settings.fontsize < 8) $settings.fontsize = 8
      document.documentElement.style.setProperty('--font-size', `${$settings.fontsize}px`)
      document.documentElement.style.setProperty('--font-number', `${$settings.fontsize}`)
      if ($settings.autoMap == true && savedAutomapping !== $settings.autoMap) {
        triggerAutoMapping.set(true)
      }
    }
  }
</script>

<button title="Settings-Keun" aria-label="Settings button" on:click={openDialog} data-name="header-button"
  ><SvgIcon href="{base}/icons.svg" id="settings" width="16px" height="16px" />
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
        <SvgIcon href="{base}/icons.svg" id="x" width="16px" height="16px" /></button
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
                bind:checked={$settings.mapToMultipleConcepts}
              />
              <label for="MultipleConcepts" />
            </div>
          </div>
          <div data-name="option">
            <p>Automatic mapping?</p>
            <div data-name="switch">
              <input id="Automap" type="checkbox" bind:checked={$settings.autoMap} on:change={saveSettings} />
              <label for="Automap" />
            </div>
          </div>
          <div data-name="option">
            <p>Language of source CSV</p>
            <select name="language" id="language" bind:value={$settings.language}>
              {#each Object.keys(languages) as lang}
                <option value={lang} selected={lang == $settings.language ? true : false}>{languages[lang]}</option>
              {/each}
            </select>
          </div>
          <div data-name="option">
            <p>Default vocabulary ID for custom concepts</p>
            <input type="text" placeholder="local ID e.g. AZDELTA" bind:value={$settings.vocabularyIdCustomConcept} />
          </div>
          <div data-name="option">
            <p>Font size</p>
            <input type="number" bind:value={$settings.fontsize} min=8 max=16/>
          </div>
        </div>
      </section>
    {/if}
  </div>
</dialog>
