require('dotenv').config();
const express = require('express'), Busboy = require('busboy'), crypto = require('crypto'), path = require('path');
const QR = require('qrcode'), Database = require('better-sqlite3'), rateLimit = require('express-rate-limit');
const db = new Database(process.env.DB_PATH || 'data.db');
db.exec(`create table if not exists files(id integer primary key, name text, phone text, filename text, mime text, size integer, ref text, pin text, created text default current_timestamp);
create table if not exists settings(k text primary key, v text)`);
const ctx = { getS: k => (db.prepare('select v from settings where k=?').get(k) || {}).v, setS: (k, v) => db.prepare('insert or replace into settings values(?,?)').run(k, v) };
const storage = require('./storage')(ctx);
const MAX = 100 * 1024 * 1024, BASE = process.env.BASE_URL || 'http://localhost:3000';
const hash = (p, s = crypto.randomBytes(8).toString('hex')) => s + ':' + crypto.scryptSync(p, s, 32).toString('hex');
const same = (p, h) => { const a = Buffer.from(hash(p, h.split(':')[0])), b = Buffer.from(h); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const app = express(); app.set('trust proxy', 1); app.use(express.urlencoded({ extended: false }));
const lim = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60 });
const admin = (req, res, next) => { const [u, p] = Buffer.from((req.headers.authorization || '').slice(6), 'base64').toString().split(/:(.*)/s);
  if (p && p === process.env.ADMIN_PASSWORD) return next(); res.set('WWW-Authenticate', 'Basic').status(401).send('Auth required'); };

app.post('/api/upload', lim, (req, res) => {
  const bb = Busboy({ headers: req.headers, limits: { fileSize: MAX, files: 1 } }), f = {}; let done = false, got = false;
  const reply = (c, m) => { if (!done) { done = true; res.status(c).json(m); } };
  bb.on('field', (k, v) => f[k] = v);
  bb.on('file', async (_, stream, info) => {
    got = true; const name = (f.name || '').trim().slice(0, 100), phone = (f.phone || '').replace(/\D/g, ''), pin = f.pin || '';
    if (!name || phone.length < 6 || pin.length < 4) { stream.resume(); return reply(400, { error: 'Name, phone (6+ digits) and PIN (4+ characters) are required' }); }
    let size = 0, big = false; stream.on('data', d => size += d.length); stream.on('limit', () => big = true);
    const filename = path.basename(info.filename || 'file').slice(0, 200);
    try { const ref = await storage.upload(stream, filename, info.mimeType);
      if (big) { await storage.remove(ref).catch(() => {}); return reply(413, { error: 'File exceeds 100 MB' }); }
      db.prepare('insert into files(name,phone,filename,mime,size,ref,pin) values(?,?,?,?,?,?,?)').run(name, phone, filename, info.mimeType, size, ref, hash(pin));
      reply(200, { ok: true }); } catch (e) { console.error(e); reply(500, { error: 'Upload failed' }); } });
  bb.on('close', () => { if (!got) reply(400, { error: 'No file selected' }); });
  req.pipe(bb);
});

app.get('/api/search', lim, (req, res) => { const q = (req.query.q || '').trim().toLowerCase(); if (q.length < 4) return res.json([]);
  const digits = q.replace(/\D/g, '');
  res.json(db.prepare(`select id, filename, size, created from files where lower(name) like ? or (? != '' and phone like ?) order by id desc limit 50`)
    .all('%' + q + '%', digits, '%' + digits + '%')); });

app.post('/api/download', lim, async (req, res) => {
  const r = db.prepare('select * from files where id=?').get(+req.body.id);
  if (!r || !same(req.body.pin || '', r.pin)) return res.status(403).send('Wrong PIN or file not found');
  try { const s = await storage.download(r.ref);
    res.set({ 'Content-Type': r.mime || 'application/octet-stream', 'Content-Disposition': 'attachment; filename*=UTF-8\'\'' + encodeURIComponent(r.filename) }); s.pipe(res); }
  catch (e) { console.error(e); res.status(500).send('Download failed'); } });

app.get('/qr', async (_, res) => res.type('png').send(await QR.toBuffer(BASE, { width: 400, margin: 2 })));
app.get('/admin', admin, (_, res) => { const g = process.env.STORAGE === 'gdrive';
  res.send(`<h2>DocShare admin</h2><p>Storage: <b>${process.env.STORAGE || 'local'}</b></p>` +
    (g ? `<p>Google Drive: <b>${storage.connected() ? 'connected' : 'not connected'}</b></p><a href="/admin/gdrive/connect">Connect Google Drive</a><br><br>` : '') +
    `<img src="/qr" width="200"><br><a href="/qr" download="qr.png">Download QR</a>`); });
app.get('/admin/gdrive/connect', admin, (_, res) => res.redirect(storage.authUrl()));
app.get('/admin/gdrive/callback', admin, async (req, res) => { try { await storage.connect(req.query.code); res.redirect('/admin'); } catch (e) { console.error(e); res.status(500).send('Connect failed'); } });
app.use(express.static(path.join(__dirname, 'public')));
app.listen(process.env.PORT || 3000, () => console.log('Running on ' + BASE));
