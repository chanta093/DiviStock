import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const sha256 = (...chunks) => createHash('sha256').update(Buffer.concat(chunks)).digest();

function base58Decode(value) {
  let number = 0n;
  for (const char of value) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error(`Invalid base58 character: ${char}`);
    number = number * 58n + BigInt(index);
  }
  const bytes = [];
  while (number > 0n) { bytes.unshift(Number(number & 255n)); number >>= 8n; }
  const leadingZeros = value.match(/^1*/)[0].length;
  return Buffer.from([...Array(leadingZeros).fill(0), ...bytes]);
}

function leaf(wallet, amount) {
  const key = base58Decode(wallet);
  if (key.length !== 32) throw new Error(`${wallet} is not a 32-byte Solana public key`);
  const amountBytes = Buffer.alloc(8);
  amountBytes.writeBigUInt64LE(BigInt(amount));
  return sha256(key, amountBytes);
}

function parent(left, right) { return Buffer.compare(left, right) <= 0 ? sha256(left, right) : sha256(right, left); }
function buildTree(leaves) {
  const levels = [leaves];
  while (levels.at(-1).length > 1) {
    const level = levels.at(-1), next = [];
    for (let i = 0; i < level.length; i += 2) next.push(parent(level[i], level[i + 1] ?? level[i]));
    levels.push(next);
  }
  return levels;
}
function proofFor(index, levels) {
  const proof = [];
  let current = index;
  for (const level of levels.slice(0, -1)) { proof.push((level[current ^ 1] ?? level[current]).toString('hex')); current = Math.floor(current / 2); }
  return proof;
}

const input = process.argv[2] ?? new URL('../data/snapshot.json', import.meta.url);
const output = process.argv[3] ?? new URL('../data/distribution.json', import.meta.url);
const snapshot = JSON.parse(await readFile(input, 'utf8'));
const entries = snapshot.holders.map(holder => ({ wallet: holder.wallet, shares: holder.shares, amount: BigInt(holder.shares) * BigInt(snapshot.dividendPerShareMicrousc) }));
const leaves = entries.map(entry => leaf(entry.wallet, entry.amount));
const tree = buildTree(leaves);
const distribution = {
  distributionId: snapshot.distributionId, mint: snapshot.mint, dividendPerShareMicrousc: snapshot.dividendPerShareMicrousc,
  merkleRoot: tree.at(-1)[0].toString('hex'),
  claims: entries.map((entry, index) => ({ ...entry, amount: entry.amount.toString(), leaf: leaves[index].toString('hex'), proof: proofFor(index, tree) }))
};
await writeFile(output, `${JSON.stringify(distribution, null, 2)}\n`);
console.log(`Wrote ${distribution.claims.length} claims and root ${distribution.merkleRoot} to ${output.pathname}`);
