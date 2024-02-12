<script lang="ts">
  import { beforeNavigate } from '$app/navigation'
  import { base } from '$app/paths'
  import { page } from '$app/stores'
  import Manual from '$lib/components/extra/Manual.svelte'
  import Header from '$lib/components/extra/Header.svelte'
  import Settings from '$lib/components/extra/Settings.svelte'
  import User from '$lib/components/extra/User.svelte'
  import { loadImplementationSettings } from '$lib/implementations/implementation'
  import { authImplementation, settings, settingsImpl, user } from '$lib/store'
  import '$lib/table.scss'
  // import '@radar-azdelta/svelte-datatable/dist/styles/data-table.scss'
  import { onMount } from 'svelte'

  // TODO: set up Firebase project for internal use in AZD (Firebase impl)

  beforeNavigate(async ({ from, to, cancel }): Promise<void> => {
    if (!$settingsImpl) loadImplementationSettings()
    $settingsImpl?.updateSettings($settings)
  })

  onMount(async () => {
    if (!$settingsImpl) await loadImplementationSettings()
    const storedSettings = await $settingsImpl?.getSettings()
    if (storedSettings) $settings = storedSettings
  })
</script>

<main>
  <header class="header">
    <Header />
    <ul class="page-nav">
      {#if $page.url.pathname !== '/' && $page.url.pathname !== '/Keun'}
        <li><a href="{base}/">File selection</a></li>
      {/if}
      {#if $user && $user.roles?.includes('Admin') && authImplementation == 'firebase'}
        <li><a href="{base}/register">Registration</a></li>
      {/if}
    </ul>
    {#if $page.url.pathname.substring($page.url.pathname.lastIndexOf('/')) !== 'registration'}
      <div class="header-buttons-container" id="settings">
        <Manual href="/README.md?raw" />
        {#if $settings}
          <Settings />
          <User />
        {/if}
      </div>
    {/if}
  </header>
  <slot />
</main>

<style>
  :global(body) {
    font-family:
      BlinkMacSystemFont,
      -apple-system,
      'Segoe UI',
      'Roboto',
      'Oxygen',
      'Ubuntu',
      'Cantarell',
      'Fira Sans',
      'Droid Sans',
      'Helvetica Neue',
      'Helvetica',
      'Arial',
      sans-serif;
  }

  :global(p),
  :global(input) {
    margin: 0;
    padding: 0;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 1rem;
  }

  .page-nav {
    list-style: none;
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  a {
    text-decoration: none;
    font-weight: 500;
    color: #454545;
  }

  a:hover,
  a:focus {
    font-weight: 600;
    color: #0070a0;
  }

  .header-buttons-container {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
</style>
