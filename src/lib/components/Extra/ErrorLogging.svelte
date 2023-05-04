<script lang="ts">
  import type { ILogger } from '../Types'
  import SvgIcon from './SvgIcon.svelte'

  export let visibility: boolean = true, log: ILogger = { message: undefined, title: undefined, type: undefined }

  function onClick() {
    log.message = undefined
    log.title = undefined
    log.type = undefined
    visibility = false
  }
</script>

{#if visibility == true}
  <div
    data-name="logger"
    style={`background-color: ${
      log.type == 'error' ? 'red' : log.type == 'warning' ? '#FFD580' : 'inherit'
    }; border-color: ${log.type == 'error' ? 'red' : log.type == 'warning' ? '#FFCD67' : 'inherit'}`}
  >
    <div data-name="logger-content">
      <h2>{log.title}</h2>
      <p>{log.message}</p>
    </div>
    <button on:click={onClick} style={``}><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button>
  </div>
{/if}
