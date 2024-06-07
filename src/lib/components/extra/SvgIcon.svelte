<script lang="ts">
  import { base } from '$app/paths'
  import type { ISvgIconProps } from '$lib/interfaces/Types'

  let { href = `${base}/icons.svg`, id, width = '16px', height = '16px' }: ISvgIconProps = $props()
</script>

<svg {width} {height}>
  <use href="{href}#{id}" />
</svg>
