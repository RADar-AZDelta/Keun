<script lang="ts">
  import '@radar-azdelta/svelte-datatable/styles/data-table.scss'
  import '$lib/styles/table.scss'
  import '$lib/styles/files.scss'
  import '$lib/styles/layout.scss'
  import Header from '$lib/components/Extra/Header.svelte'
  import { page } from '$app/stores'
  import Manual from '$lib/components/Extra/Manual.svelte'
  import Settings from '$lib/components/Extra/Settings.svelte'
  import User from '$lib/components/Extra/User.svelte'
  import { implementation, implementationClass, settings } from '$lib/store'
  import { base } from '$app/paths'
    import { beforeNavigate } from '$app/navigation'

  async function loadImplementation() {
    if (!$implementationClass) {
      if ($implementation == 'firebase') {
        await import('$lib/utilClasses/FirebaseImpl').then(({ default: FirebaseImpl }) => {
          $implementationClass = new FirebaseImpl()
          $implementationClass.syncSettings('read')
        })
      } else {
        import('$lib/utilClasses/LocalImpl').then(({ default: LocalImpl }) => {
          $implementationClass = new LocalImpl()
          $implementationClass.syncSettings('read')
        })
      }
    } else $implementationClass.syncSettings('read')
  }

  loadImplementation()

  beforeNavigate(async ({ from, to, cancel }) => {
    await $implementationClass.syncSettings('write')
  })
</script>

<main>
  <header data-name="header">
    <Header />
    <ul data-name="page-nav">
      {#if $page.url.pathname !== '/' && $page.url.pathname !== '/Keun'}
        <li><a href="{base}/">{$implementation == 'firebase' ? 'File selection' : 'Drag & Drop'}</a></li>
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
