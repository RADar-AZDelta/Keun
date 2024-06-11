<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'
  import Config from '$lib/helpers/Config'
  import Settings from '$lib/helpers/Settings'
  import clickOutside from '$lib/actions/clickOutside'
  import Switch from '$lib/components/extra/Switch.svelte'
  import { createAbortAutoMapping, createSettings, createTriggerAutoMapping } from '$lib/stores/runes.svelte'

  let settings = createSettings()
  let abortAutoMapping = createAbortAutoMapping()
  let triggerAutoMapping = createTriggerAutoMapping()
  let savedAutomapping: boolean = $state(false)
  let possibleOutclick: boolean = $state(false)
  let settingsDialog: HTMLDialogElement | undefined = $state(undefined)

  const closeDialog = () => settingsDialog?.close()

  async function openDialog() {
    savedAutomapping = settings.value.autoMap
    settingsDialog?.showModal()
    possibleOutclick = true
  }

  async function saveSettings() {
    await Settings.updateSettings(settings.value)
    const automappingChanged = settings.value.autoMap && savedAutomapping !== settings.value.autoMap
    savedAutomapping = settings.value.autoMap
    if (automappingChanged) {
      triggerAutoMapping.update(true)
      savedAutomapping = true
    }
  }

  async function abort() {
    if (!settings.value.autoMap && savedAutomapping !== settings.value.autoMap) abortAutoMapping.update(true)
  }

  async function outClick() {
    if (!possibleOutclick) return
    saveSettings()
    closeDialog()
    possibleOutclick = false
  }

  async function changeAutoMapping() {
    abort()
    if (!Settings.settingsRetrievedFromStorage) return
    saveSettings()
  }

  async function updateSettingsInput(e: any, id: string) {
    const value = e.target.value
    updateSettings(id, value)
  }

  async function updateSettings(prop: string, value: any) {
    settings.updateProp(prop, value)
  }

  $effect(() => {
    settings.value.autoMap
    changeAutoMapping()
  })
</script>

<button title="Settings-Keun" onclick={openDialog} class="header-button"><SvgIcon id="settings" /></button>

<dialog bind:this={settingsDialog} class="settings-dialog">
  <div class="settings-container" use:clickOutside onoutClick={outClick}>
    {#if settings}
      <button class="close-dialog" onclick={outClick}><SvgIcon id="x" /></button>
      <section class="settings">
        <h2 class="title">Settings</h2>
        <div class="options">
          <Switch id="mapToMultipleConcepts" name="Map to multiple concepts?" checked={settings.value.mapToMultipleConcepts} updateValue={updateSettings} />
          <Switch id="autoMap" name="Automatic mapping?" checked={settings.value.autoMap} updateValue={updateSettings} />
          <div class="option">
            <p>Language of source CSV</p>
            <select name="language" id="language" value={settings.value.language} onchange={(e: Event) => updateSettingsInput(e, 'language')}>
              {#each Object.keys(Config.languages) as lang, _}
                <option value={lang} selected={lang === settings.value.language}>{Config.languages[lang]}</option>
              {/each}
            </select>
          </div>
          <div class="option">
            <p>Default vocabulary ID for custom concepts</p>
            <input
              type="text"
              placeholder="local ID e.g. AZDELTA"
              value={settings.value.vocabularyIdCustomConcept}
              onchange={(e: Event) => updateSettingsInput(e, 'vocabularyIdCustomConcept')}
            />
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

  .header-button:hover {
    background-color: lightgray;
    cursor: pointer;
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
