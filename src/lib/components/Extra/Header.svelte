<div class="logo-holder">
  <div class="logo" />
  <div class="logo-text text-bold">K</div>
  <div class="logo-text text-light">E</div>
  <div class="logo-text text-light">U</div>
  <div class="logo-text text-light">N</div>
</div>

<style>
  .logo-holder {
    width: 400px;
    height: 100px;
  }

  .logo {
    width: 100px;
    height: 100px;
    display: inline-block;
    position: relative;
    background-image: url(keun.svg);
    background-size: cover;
  }

  .logo:hover {
    animation: spin 20s infinite linear;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(359deg);
    }
  }

  .logo-text {
    --color-background: #fff;
    --color-text: #3c3a8f;
    color: var(--color-text);
    display: inline-block;
  }

  .logo-text:hover {
    transition: transform 1s linear;
    transform: rotateY(360deg);
    transform-origin: center;
  }

  .logo-text.text-bold {
    font-family: Calibri, Candara, Segoe, Segoe UI, Optima, Arial, sans-serif;
    font-weight: bold;
    font-size: 100px;
  }

  .logo-text.text-light {
    font-family: Calibri, Candara, Segoe, Segoe UI, Optima, Arial, sans-serif;
    font-size: 75px;
  }
</style>
