<script lang="ts">
  import { SvgIcon, clickOutside } from '@radar-azdelta-int/radar-svelte-components'
  import { abortAutoMapping, settings, settingsImpl, triggerAutoMapping } from '$lib/store'
  import { loadImpSettings } from '$lib/implementations/implementation'
  import Switch from '$lib/components/extra/Switch.svelte'
  import { Config } from '$lib/helperClasses/Config'

  let savedAutomapping: boolean, possibleOutclick: boolean, settingsDialog: HTMLDialogElement

  const closeDialog = () => settingsDialog.close()

  async function openDialog() {
    savedAutomapping = $settings.autoMap
    settingsDialog.showModal()
    possibleOutclick = true
  }

  async function saveSettings() {
    if (!$settingsImpl) await loadImpSettings()
    await $settingsImpl?.updateSettings($settings)
    const automappingChanged = $settings.autoMap && savedAutomapping !== $settings.autoMap
    if (automappingChanged) $triggerAutoMapping = savedAutomapping = true
  }

  async function abort() {
    if (!$settings.autoMap && savedAutomapping !== $settings.autoMap) $abortAutoMapping = true
  }

  async function outClick() {
    if (!possibleOutclick) return
    saveSettings()
    closeDialog()
    possibleOutclick = false
  }

  async function changeAutoMapping() {
    abort()
    saveSettings()
  }

  $: {
    $settings.mapToMultipleConcepts
    changeAutoMapping()
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
          <Switch name="Map to multiple concepts?" bind:checked={$settings.mapToMultipleConcepts} />
          <Switch name="Automatic mapping?" bind:checked={$settings.autoMap} />
          <div class="option">
            <p>Language of source CSV</p>
            <select name="language" id="language" bind:value={$settings.language}>
              {#each Object.keys(Config.languages) as lang, _}
                <option value={lang} selected={lang === $settings.language}>{Config.languages[lang]}</option>
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
