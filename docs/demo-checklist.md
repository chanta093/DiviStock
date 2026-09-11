# Reviewer demo checklist

- Open the hosted demo and identify the SOLX distribution pool, eligible shares, and claimed amount.
- Select **Connect wallet** to show the holder identity state.
- Select **Claim 125.00 USDC**. Confirm that available entitlement changes to zero.
- Confirm the claimed aggregate changes from 8,625 to 8,750 USDC.
- Attempt the button again. It stays claimed; the on-chain counterpart uses a `ClaimReceipt` PDA to enforce this rule.
- For a Devnet deployment, include the vault funding transaction and successful claim transaction Explorer URLs in the submission form.
