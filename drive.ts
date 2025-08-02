// drive.ts
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from './constants';

declare global {
  interface Window { google: any; }
}

export async function getToken() {
  return new Promise<string>((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,
      callback: (resp: any) => (resp.error ? reject(resp) : resolve(resp.access_token)),
    });
    client.requestAccessToken();
  });
}

export async function backupToDrive(data: object) {
  const token = await getToken();
  const metadata = { name: 'store_backup.json', parents: ['appDataFolder'] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));

  const listResp = await fetch(
    'https://www.googleapis.com/drive/v3/files?q=name="store_backup.json"&spaces=appDataFolder',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const list = await listResp.json();
  const existing = list.files?.[0];

  const method = existing ? 'PATCH' : 'POST';
  const url = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}

export async function restoreFromDrive() {
  const token = await getToken();
  const listResp = await fetch(
    'https://www.googleapis.com/drive/v3/files?q=name="store_backup.json"&spaces=appDataFolder',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const list = await listResp.json();
  if (!list.files?.length) throw new Error('No backup found');
  const fileId = list.files[0].id;
  const fileResp = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return await fileResp.json();
}