# DocShare
Upload/download documents (max 100 MB) by name + phone, protected by an uploader PIN. One QR code (`/qr`) for everyone.

## Run
1. `npm install`
2. `cp .env.example .env` and edit (set BASE_URL, ADMIN_PASSWORD, STORAGE)
3. `npm start`, then open `/admin` (user: anything, password: ADMIN_PASSWORD) to see/download the QR code.

## Storage
- `local`: files saved in ./uploads (testing).
- `gdrive`: create a Google Cloud OAuth client (Web), add redirect URI `BASE_URL/admin/gdrive/callback`, put ID/secret in .env, set STORAGE=gdrive, open /admin and click "Connect Google Drive". Files go to a "DocShare" folder in the owner's Drive.
- `s3`: fill the S3_* values (works with AWS S3, Cloudflare R2, Backblaze B2, Wasabi).
New drive = one new file in `storage/` exposing upload/download/remove (e.g. OneDrive via Microsoft Graph).
