<!-- Copyright 2023 RADar-AZDelta -->
<!-- SPDX-License-Identifier: gpl3+ -->
<script lang="ts">
  import { base } from '$app/paths'

  export let href: string = `${base}/icons.svg`
  export let id: string
  export let width: string = '16px'
  export let height: string = '16px'
</script>

<svg class={$$props.class} {width} {height}>
  <use href="{href}#{id}" />
</svg>
