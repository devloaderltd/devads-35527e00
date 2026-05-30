import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const OUT = '/mnt/documents';
const STAGE = '/tmp/backup/storage';
fs.mkdirSync(STAGE, { recursive: true });

// 1) auth users via admin API
console.log('Exporting auth users...');
let users = [], page = 1;
while (true) {
  const { data, error } = await supa.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  users.push(...data.users);
  if (data.users.length < 1000) break;
  page++;
}
fs.writeFileSync(`${OUT}/auth-users.json`, JSON.stringify(users, null, 2));
console.log(`  ${users.length} users exported`);

// 2) storage buckets - list + download all
const buckets = ['listing-images', 'kyc-documents', 'review-photos', 'branding'];
let totalFiles = 0, totalBytes = 0;

async function walk(bucket, prefix) {
  let offset = 0;
  while (true) {
    const { data, error } = await supa.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) { console.log(`  list error ${bucket}/${prefix}: ${error.message}`); return; }
    if (!data || data.length === 0) break;
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null || (!item.metadata && !item.id)) {
        // folder
        await walk(bucket, full);
      } else {
        const { data: blob, error: dlErr } = await supa.storage.from(bucket).download(full);
        if (dlErr) { console.log(`  dl err ${bucket}/${full}: ${dlErr.message}`); continue; }
        const buf = Buffer.from(await blob.arrayBuffer());
        const outPath = path.join(STAGE, bucket, full);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, buf);
        totalFiles++;
        totalBytes += buf.length;
      }
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
}

for (const b of buckets) {
  console.log(`Downloading bucket: ${b}`);
  fs.mkdirSync(path.join(STAGE, b), { recursive: true });
  await walk(b, '');
}
console.log(`  ${totalFiles} files, ${(totalBytes/1024/1024).toFixed(2)} MB`);

// 3) config snapshot
const { data: bucketMeta } = await supa.storage.listBuckets();
const config = {
  exported_at: new Date().toISOString(),
  supabase_url: process.env.SUPABASE_URL,
  buckets: bucketMeta,
  secrets_names: ['LOVABLE_API_KEY','NOWPAYMENTS_API_KEY','NOWPAYMENTS_IPN_SECRET','PAYMENTS_SANDBOX_WEBHOOK_SECRET','PLISIO_API_KEY','CRON_TRIGGER_SECRET','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_DB_URL'],
  note: 'Secret VALUES are not exported. Re-enter them on the new platform.',
  user_count: users.length,
  storage_files: totalFiles,
  storage_bytes: totalBytes,
};
fs.writeFileSync(`${OUT}/backup-config.json`, JSON.stringify(config, null, 2));

// 4) zip storage
console.log('Zipping storage...');
execSync(`cd /tmp/backup && rm -f ${OUT}/backup-storage.zip && (command -v zip >/dev/null && zip -rq ${OUT}/backup-storage.zip storage || nix run nixpkgs#zip -- -rq ${OUT}/backup-storage.zip storage)`, { stdio: 'inherit', shell: '/bin/bash' });
console.log('Done.');
