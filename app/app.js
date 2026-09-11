const claimButton = document.querySelector('#claim-button');
const connectButton = document.querySelector('#connect');
let connected = false;
connectButton.addEventListener('click', () => {
  connected = true;
  connectButton.textContent = '7xK9…2vFQ';
  connectButton.classList.add('connected');
  document.querySelector('#claim-status').textContent = 'Demo wallet connected. Claim remains simulated.';
});
claimButton.addEventListener('click', () => {
  if (claimButton.dataset.claimed) return;
  claimButton.dataset.claimed = 'true';
  claimButton.textContent = 'Claim recorded ✓';
  claimButton.style.background = '#3e7b47';
  document.querySelector('#amount').innerHTML = '0.00 <small>USDC</small>';
  document.querySelector('#claimed-total').innerHTML = '8,750.00 <small>USDC</small>';
  document.querySelector('#claim-count').textContent = '24 of 64 holders';
  document.querySelector('#claim-status').textContent = connected ? 'Simulated transaction confirmed; duplicate claims are rejected.' : 'Demo claim confirmed. Connect a wallet to use a deployed program.';
});
