<script lang="ts">
  import { page } from '$app/stores'
  import { base } from '$app/paths'
  import { beforeNavigate } from '$app/navigation'
  import '@radar-azdelta/svelte-datatable/styles/data-table.scss'
  import '$lib/styles/table.scss'
  import '$lib/styles/files.scss'
  import '$lib/styles/layout.scss'
  import { authImplementation, settings, user } from '$lib/store'
  import Header from '$lib/components/Extra/Header.svelte'
  import Manual from '$lib/components/Extra/Manual.svelte'
  import Settings from '$lib/components/Extra/Settings.svelte'
  import User from '$lib/components/Extra/User.svelte'

  // TODO: set up Firebase project for internal use in AZD (Firebase impl)
  // TODO: set up SQLite impl for reference for other hospitals

  beforeNavigate(async ({ from, to, cancel }): Promise<void> => {
    // TODO: check this to sync the settings on navigation
    // await $implementationClass.syncSettings('write')
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
        <Manual />
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
