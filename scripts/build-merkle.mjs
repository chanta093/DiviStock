import { createHash } from 'node:crypto';

// Example snapshot only. Replace with a signed issuer snapshot before deployment.
const holders = [
  { wallet: '7xK9Jm2vFQDemoWallet1111111111111111111111', shares: 5000 },
  { wallet: '4L4DemoWallet11111111111111111111111111111', shares: 2500 },
  { wallet: '9Q2DemoWallet11111111111111111111111111111', shares: 1000 }
];
const dividendPerShareMicrousc = 25_000; // $0.025 with 6 decimals
const hash = value => createHash('sha256').update(value).digest('hex');
const leaves = holders.map(h => ({ ...h, amount: h.shares * dividendPerShareMicrousc, leaf: hash(`${h.wallet}:${h.shares * dividendPerShareMicrousc}`) }));
console.log(JSON.stringify({ distributionId: 'SOLX-2026-09', leaves }, null, 2));
