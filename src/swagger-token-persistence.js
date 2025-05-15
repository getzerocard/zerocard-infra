window.onload = function() {
  // Function to save tokens to localStorage
  function saveTokens() {
    const accessToken = document.querySelector('#input_apiKey')?.value;
    const identityToken = document.querySelector('#input_identityToken')?.value;
    if (accessToken) {
      localStorage.setItem('swagger_access_token', accessToken);
    }
    if (identityToken) {
      localStorage.setItem('swagger_identity_token', identityToken);
    }
  }

  // Function to load tokens from localStorage
  function loadTokens() {
    const accessToken = localStorage.getItem('swagger_access_token');
    const identityToken = localStorage.getItem('swagger_identity_token');
    if (accessToken) {
      const accessTokenInput = document.querySelector('#input_apiKey');
      if (accessTokenInput) {
        accessTokenInput.value = accessToken;
      }
    }
    if (identityToken) {
      const identityTokenInput = document.querySelector('#input_identityToken');
      if (identityTokenInput) {
        identityTokenInput.value = identityToken;
      }
    }
    // Trigger authorization if tokens are present
    if (accessToken || identityToken) {
      const authorizeButton = document.querySelector('.authorize');
      if (authorizeButton) {
        authorizeButton.click();
      }
    }
  }

  // Add event listeners to save tokens when they are entered
  const inputs = document.querySelectorAll('.auth-container input');
  inputs.forEach(input => {
    input.addEventListener('change', saveTokens);
  });

  // Load tokens on page load
  loadTokens();

  // MutationObserver to handle dynamic content loading
  const observer = new MutationObserver((mutations, obs) => {
    const authContainer = document.querySelector('.auth-container');
    if (authContainer) {
      loadTokens();
      const newInputs = authContainer.querySelectorAll('input');
      newInputs.forEach(input => {
        input.addEventListener('change', saveTokens);
      });
      obs.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
};

console.log('Swagger token persistence script loaded.'); 