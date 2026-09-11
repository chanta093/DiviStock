# DiviStock presentation script (about 2 min 20 sec)

## 0:00–0:20 — Problem

“Dividend operations still rely on closed spreadsheets, multiple intermediaries, and long settlement windows. Holders cannot independently verify the allocation or see whether the distribution pool is fully funded.”

## 0:20–0:45 — Solution

“DiviStock is a Solana distribution rail for tokenized equity. An issuer takes a shareholder snapshot, commits it as a Merkle root, funds a USDC vault, and lets each eligible holder claim their exact allocation.”

## 0:45–1:15 — Show the dashboard

“Here is a single SOLX distribution on Devnet. The pool is 25,000 USDC, the snapshot contains one million eligible shares, and the claim status is visible to everyone. Each holder sees only the amount committed to their wallet.”

## 1:15–1:45 — Show the claim

“This wallet owns 5,000 SOLX shares, so its entitlement is 125 USDC. The Merkle proof binds this wallet and amount to the published root. I click Claim. The program verifies that proof, transfers from the vault, and creates a claim receipt.”

## 1:45–2:05 — Show safety property

“After the claim, the available amount is zero and the total claimed rises by 125 USDC. A second claim cannot succeed: the receipt PDA for this distribution and wallet already exists. The rule is enforced on-chain, not by a web server.”

## 2:05–2:20 — Close

“DiviStock makes the path from funded distribution to received dividend clear and inspectable. Next, we will add issuer governance, audited USDC vaults, and multiple distributions. Thank you.”

## Capture instructions

Record the browser at 1920×1080. Show the dashboard, click Connect wallet, scroll to the allocation panel, click Claim, and pause on the successful state. Add these narration sections as voice-over or captions. Do not represent the simulated interface as a live on-chain transaction.
