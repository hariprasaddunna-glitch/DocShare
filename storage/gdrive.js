const { google } = require('googleapis');
module.exports = ctx => {
  const client = () => new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.BASE_URL + '/admin/gdrive/callback');
  const drive = () => { const t = ctx.getS('gdrive_refresh'); if (!t) throw new Error('Google Drive not connected');
    const c = client(); c.setCredentials({ refresh_token: t }); return google.drive({ version: 'v3', auth: c }); };
  return {
    connected: () => !!ctx.getS('gdrive_refresh'),
    authUrl: () => client().generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: ['https://www.googleapis.com/auth/drive.file'] }),
    async connect(code) { const { tokens } = await client().getToken(code); ctx.setS('gdrive_refresh', tokens.refresh_token);
      const r = await drive().files.create({ requestBody: { name: 'DocShare', mimeType: 'application/vnd.google-apps.folder' }, fields: 'id' });
      ctx.setS('gdrive_folder', r.data.id); },
    async upload(s, name, mime) { const r = await drive().files.create({ requestBody: { name, parents: [ctx.getS('gdrive_folder')] }, media: { mimeType: mime, body: s }, fields: 'id' }); return r.data.id; },
    async download(id) { return (await drive().files.get({ fileId: id, alt: 'media' }, { responseType: 'stream' })).data; },
    async remove(id) { await drive().files.delete({ fileId: id }); } }; };
