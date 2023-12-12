<script lang="ts">
  import clickOutside from '$lib/obsolete/clickOutside'
  import SvgIcon from '$lib/obsolete/SvgIcon.svelte'
  import { abortAutoMapping, settings, triggerAutoMapping } from '$lib/store'

  let savedAutomapping: boolean, possibleOutclick: boolean, settingsDialog: HTMLDialogElement
  let languages: Record<string, string> = {
    nl: 'Dutch',
    en: 'English',
    de: 'German',
    fr: 'French',
    it: 'Italian',
    es: 'Spanish',
  }

  const closeDialog = () => settingsDialog.close()

  // A method to open the dialog if it was closed
  async function openDialog(): Promise<void> {
    savedAutomapping = $settings.autoMap
    settingsDialog.showModal()
    possibleOutclick = true
  }

  // A method to set the settings in the localstorage
  async function saveSettings(): Promise<void> {
    if ($settings.autoMap && savedAutomapping !== $settings.autoMap) {
      triggerAutoMapping.set(true)
      savedAutomapping = true
    }
  }

  async function abort(): Promise<void> {
    if (!$settings.autoMap && savedAutomapping !== $settings.autoMap) abortAutoMapping.set(true)
  }

  async function outClick() {
    if (!possibleOutclick) return
    saveSettings()
    closeDialog()
    possibleOutclick = false
  }

  async function changeAutoMapping() {
    savedAutomapping = !$settings.autoMap
    abort()
    saveSettings()
  }
</script>

<button title="Settings-Keun" on:click={openDialog} class="header-button"><SvgIcon id="settings" /></button>

<dialog bind:this={settingsDialog} class="settings-dialog">
  <div class="settings-container" use:clickOutside on:outClick={outClick}>
    {#if settings}
      <button class="close-dialog" on:click={outClick}><SvgIcon id="x" /></button>
      <section class="settings">
        <h2 class="title">Settings</h2>
        <div class="options">
          <div class="option">
            <p>Map to multiple concepts?</p>
            <div class="switch">
              <input class="switch-input" id="mltpl" type="checkbox" bind:checked={$settings.mapToMultipleConcepts} />
              <label class="switch-label" for="mltpl" />
            </div>
          </div>
          <div class="option">
            <p>Automatic mapping?</p>
            <div class="switch">
              <input
                class="switch-input"
                id="automap"
                type="checkbox"
                bind:checked={$settings.autoMap}
                on:change={changeAutoMapping}
              />
              <label class="switch-label" for="automap" />
            </div>
          </div>
          <div class="option">
            <p>Language of source CSV</p>
            <select name="language" id="language" bind:value={$settings.language}>
              {#each Object.keys(languages) as lang, _}
                <option value={lang} selected={lang == $settings.language ? true : false}>{languages[lang]}</option>
              {/each}
            </select>
          </div>
          <div class="option">
            <p>Default vocabulary ID for custom concepts</p>
            <input type="text" placeholder="local ID e.g. AZDELTA" bind:value={$settings.vocabularyIdCustomConcept} />
          </div>
        </div>
      </section>
    {/if}
  </div>
</dialog>

<style>
  .header-button {
    border: 1px solid #d8d8d8;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f6f6f6;
    width: 40px;
    height: 40px !important;
  }

  .settings-dialog {
    border: none;
    border-radius: 10px;
    position: fixed;
    top: 50%;
    left: 50%;

    transform: translate(-50%, -50%);
    width: 50%;
    height: 50%;
  }

  .settings-container {
    height: 100%;
    width: 100%;
    margin: 0;
    padding: 0;
  }

  .close-dialog {
    position: absolute;
    right: 1rem;
    top: 1rem;
    border: none;
    background-color: inherit;
    color: #4f4f4f;
  }

  .close-dialog:hover {
    color: #bbbbbb;
  }

  .close-dialog:focus {
    outline: none;
    box-shadow: 0 0 0 2px #cecece;
  }

  .title {
    font-size: 24px;
    text-align: center;
    font-weight: 600;
    margin: 0;
  }

  .options {
    padding: 1rem 2rem;
  }

  .option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 32px;
    margin-bottom: 16px;
    font-size: 20px;
  }

  input,
  select,
  option,
  p {
    font-size: 16px;
  }

  .switch-input {
    height: 0;
    width: 0;
    visibility: hidden;
  }

  .switch-label {
    cursor: pointer;
    text-indent: -9999px;
    top: -15px;
    width: 60px;
    height: 30px;
    background: #c5c5c5;
    display: block;
    border-radius: 20px;
    position: relative;
  }

  .switch-label:hover {
    background: #bbbbbb;
  }

  .switch-input:checked + .switch-label:hover {
    background: #0082ba;
  }

  .switch-label:focus {
    outline: none;
    box-shadow: 0 0 0 2px #cecece;
  }

  .switch-input:checked + .switch-label:focus {
    outline: none;
    box-shadow: 0 0 0 2px #0070a0;
  }

  .switch-label:after {
    content: '';
    position: absolute;
    top: 4px;
    left: 4px;
    width: 22px;
    height: 22px;
    background: white;
    border-radius: 20px;
    transition: 0.3s;
  }

  .switch-input:checked + .switch-label {
    background: #0094d3;
  }

  .switch-input:checked + .switch-label:after {
    left: calc(100% - 4px);
    transform: translateX(-100%);
  }

  .switch-label:active:after {
    width: 20px;
  }

  select {
    width: auto;
    height: 40px;
    padding: 8px;
    font-size: 16px;
    border-radius: 10px;
    border: 1px solid #cecece;
  }

  select:hover {
    border: 1px solid #bbbbbb;
  }

  select:focus {
    outline: none;
    box-shadow: 0 0 0 2px #c5c5c5;
  }

  input {
    padding: 0 8px;
    border: 1px solid #cecece;
    border-radius: 10px;
    height: 40px;
  }

  input:hover {
    border: 1px solid #bbbbbb;
  }

  input:focus {
    outline: none;
    box-shadow: 0 0 0 2px #c5c5c5;
  }
</style>
