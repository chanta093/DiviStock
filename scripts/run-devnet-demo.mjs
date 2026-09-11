import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createAccount, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const programId = new PublicKey('9YVmepQsUTN8sJ94ov34Lrrnt9ZrZSS8AAXuRjFUcory');
const mint = new PublicKey(process.env.DIVISTOCK_MINT ?? '3ffYUPag5nFu67cTzEWiaWHYAdkVbakXorHxYiLGmR4j');
const amount = 25_000_000_000n;
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(process.env.SOLANA_KEYPAIR ?? '/home/cbr/.config/solana/id.json', 'utf8'))));
const discriminator = name => createHash('sha256').update(`global:${name}`).digest().subarray(0, 8);
const u64 = value => { const bytes = Buffer.alloc(8); bytes.writeBigUInt64LE(value); return bytes; };
const leaf = (holder, value) => createHash('sha256').update(Buffer.concat([holder.toBuffer(), u64(value)])).digest();
const ix = (name, data, keys) => new TransactionInstruction({ programId, data: Buffer.concat([discriminator(name), data]), keys });
const explorer = signature => `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
const [distribution] = PublicKey.findProgramAddressSync([Buffer.from('distribution'), payer.publicKey.toBuffer()], programId);
const [receipt] = PublicKey.findProgramAddressSync([Buffer.from('claim'), distribution.toBuffer(), payer.publicKey.toBuffer()], programId);
const root = leaf(payer.publicKey, amount);

const initialize = ix('initialize_distribution', Buffer.concat([root, u64(amount)]), [
  { pubkey: payer.publicKey, isSigner: true, isWritable: true }, { pubkey: mint, isSigner: false, isWritable: false },
  { pubkey: distribution, isSigner: false, isWritable: true }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
]);
let initializeSignature = 'already initialized';
if (!(await connection.getAccountInfo(distribution))) initializeSignature = await sendAndConfirmTransaction(connection, new Transaction().add(initialize), [payer]);
const holderAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);
await mintTo(connection, payer, mint, holderAta.address, payer, amount);
const vault = await createAccount(connection, payer, mint, distribution, Keypair.generate());
const fund = ix('fund_distribution', u64(amount), [
  { pubkey: payer.publicKey, isSigner: true, isWritable: true }, { pubkey: distribution, isSigner: false, isWritable: true },
  { pubkey: holderAta.address, isSigner: false, isWritable: true }, { pubkey: vault, isSigner: false, isWritable: true },
  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
]);
const fundingSignature = await sendAndConfirmTransaction(connection, new Transaction().add(fund), [payer]);
const claim = ix('claim', Buffer.concat([u64(amount), Buffer.alloc(4)]), [
  { pubkey: payer.publicKey, isSigner: true, isWritable: true }, { pubkey: distribution, isSigner: false, isWritable: true },
  { pubkey: vault, isSigner: false, isWritable: true }, { pubkey: holderAta.address, isSigner: false, isWritable: true },
  { pubkey: receipt, isSigner: false, isWritable: true }, { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
]);
const claimSignature = await sendAndConfirmTransaction(connection, new Transaction().add(claim), [payer]);
const result = { programId: programId.toBase58(), mint: mint.toBase58(), distribution: distribution.toBase58(), vault: vault.toBase58(), receipt: receipt.toBase58(), initialize: explorer(initializeSignature), funding: explorer(fundingSignature), claim: explorer(claimSignature) };
await writeFile('data/devnet-demo.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
