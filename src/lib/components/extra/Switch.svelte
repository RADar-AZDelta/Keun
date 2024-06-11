<script lang="ts">
  import type { ISwitchProps } from '$lib/interfaces/Types'

  let { id, name, checked = $bindable(), updateValue }: ISwitchProps = $props()

  async function change(e: any) {
    const value = e.target.checked
    if (updateValue) updateValue(id, value)
  }
</script>

<div class="option">
  <p class="title">{name}</p>
  <div class="switch">
    <input class="switch-input" id={name} type="checkbox" bind:checked onchange={change} />
    <label class="switch-label" for={name}></label>
  </div>
</div>

<style>
  .option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 32px;
    margin-bottom: 16px;
    font-size: 20px;
  }

  .title {
    font-size: 1rem;
  }

  .switch-input {
    height: 0;
    width: 0;
    visibility: hidden;
  }

  .switch-label {
    cursor: pointer;
    text-indent: -9999px;
    top: -15px;
    width: 60px;
    height: 30px;
    background: #c5c5c5;
    display: block;
    border-radius: 20px;
    position: relative;
  }

  .switch-label:hover {
    background: #bbbbbb;
  }

  .switch-input:checked + .switch-label:hover {
    background: #0082ba;
  }

  .switch-label:focus {
    outline: none;
    box-shadow: 0 0 0 2px #cecece;
  }

  .switch-input:checked + .switch-label:focus {
    outline: none;
    box-shadow: 0 0 0 2px #0070a0;
  }

  .switch-label:after {
    content: '';
    position: absolute;
    top: 4px;
    left: 4px;
    width: 22px;
    height: 22px;
    background: white;
    border-radius: 20px;
    transition: 0.3s;
  }

  .switch-input:checked + .switch-label {
    background: #0094d3;
  }

  .switch-input:checked + .switch-label:after {
    left: calc(100% - 4px);
    transform: translateX(-100%);
  }

  .switch-label:active:after {
    width: 20px;
  }
</style>
