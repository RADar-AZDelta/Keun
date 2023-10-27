<script lang="ts">
  import { page } from '$app/stores'
  import { base } from '$app/paths'
  import { beforeNavigate } from '$app/navigation'
  import '@radar-azdelta/svelte-datatable/styles/data-table.scss'
  import '$lib/styles/table.scss'
  import '$lib/styles/files.scss'
  import '$lib/styles/layout.scss'
  import { implementation, implementationClass, settings } from '$lib/store'
  import Header from '$lib/components/Extra/Header.svelte'
  import Manual from '$lib/components/Extra/Manual.svelte'
  import Settings from '$lib/components/Extra/Settings.svelte'
  import User from '$lib/components/Extra/User.svelte'

  // TODO: set up Firebase project for internal use in AZD (Firebase impl)
  // TODO: set up SQLite impl for reference for other hospitals

  async function loadImplementation(): Promise<void> {
    if ($implementationClass) return $implementationClass.syncSettings('read')
    if ($implementation == 'firebase')
      await import('$lib/utilClasses/FirebaseImpl').then(({ default: FirebaseImpl }) => {
        $implementationClass = new FirebaseImpl()
        $implementationClass.syncSettings('read')
      })
    else
      import('$lib/utilClasses/LocalImpl').then(({ default: LocalImpl }) => {
        $implementationClass = new LocalImpl()
        $implementationClass.syncSettings('read')
      })
  }

  loadImplementation()

  beforeNavigate(async ({ from, to, cancel }): Promise<void> => {
    await $implementationClass.syncSettings('write')
  })
</script>

<main>
  <header data-name="header">
    <Header />
    <ul data-name="page-nav">
      {#if $page.url.pathname !== '/' && $page.url.pathname !== '/Keun'}
        <li><a href="{base}/">File selection</a></li>
      {/if}
      {#if $settings.author && $settings.author.roles?.includes('Admin') && $implementation == 'firebase'}
        <li><a href="{base}/register">Registration</a></li>
      {/if}
    </ul>
    {#if $page.url.pathname.substring($page.url.pathname.lastIndexOf('/')) !== 'registration'}
      <div data-name="header-buttons-container" id="settings">
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
