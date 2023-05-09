<script lang="ts">
  export let Eq: string
</script>

<div data-name="equivalence">
  <select name="equivalence" id="equivalence" bind:value={Eq}>
    <option value="EQUAL">EQUAL</option>
    <option value="EQUIVALENT">EQUIVALENT</option>
    <option value="WIDER">WIDER</option>
    <option value="NARROWER">NARROWER</option>
    <option value="INEXACT">INEXACT</option>
    <option value="UNMATCHED">UNMATCHED</option>
    <option value="UNREVIEWED">UNREVIEWED</option>
  </select>
</div>
