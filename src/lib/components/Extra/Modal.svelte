<script lang="ts">
	import "$lib/styles/table.scss"
    export let show: boolean

</script>

{#if show == true}
	<section data-component="modal-container">
		<div data-component="modal">
			<button on:click={() => {
				show = false
			}}><img src="x.svg" alt="Close button" /></button>
			<slot></slot>
		</div>
	</section>
{/if}
