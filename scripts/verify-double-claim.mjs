import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';

const demo = JSON.parse(await readFile('data/devnet-demo.json', 'utf8'));
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(process.env.SOLANA_KEYPAIR ?? '/home/cbr/.config/solana/id.json', 'utf8'))));
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const amount = 25_000_000_000n;
const u64 = value => { const bytes = Buffer.alloc(8); bytes.writeBigUInt64LE(value); return bytes; };
const discriminator = createHash('sha256').update('global:claim').digest().subarray(0, 8);
const holderAta = await getAssociatedTokenAddress(new PublicKey(demo.mint), payer.publicKey);
const claim = new TransactionInstruction({ programId: new PublicKey(demo.programId), data: Buffer.concat([discriminator, u64(amount), Buffer.alloc(4)]), keys: [
  { pubkey: payer.publicKey, isSigner: true, isWritable: true }, { pubkey: new PublicKey(demo.distribution), isSigner: false, isWritable: true },
  { pubkey: new PublicKey(demo.vault), isSigner: false, isWritable: true }, { pubkey: holderAta, isSigner: false, isWritable: true },
  { pubkey: new PublicKey(demo.receipt), isSigner: false, isWritable: true }, { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
]});
try {
  await sendAndConfirmTransaction(connection, new Transaction().add(claim), [payer]);
  throw new Error('Unexpectedly accepted a duplicate claim');
} catch (error) {
  if (String(error.message).includes('Unexpectedly')) throw error;
  console.log('Duplicate claim rejected as expected:', error.message.split('\n')[0]);
}
