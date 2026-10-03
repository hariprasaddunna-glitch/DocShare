const fs = require('fs'), path = require('path'), crypto = require('crypto'), { pipeline } = require('stream/promises');
const dir = path.join(__dirname, '..', 'uploads');
module.exports = () => { fs.mkdirSync(dir, { recursive: true }); return {
  async upload(s) { const ref = crypto.randomUUID(); await pipeline(s, fs.createWriteStream(path.join(dir, ref))); return ref; },
  async download(ref) { return fs.createReadStream(path.join(dir, path.basename(ref))); },
  async remove(ref) { await fs.promises.unlink(path.join(dir, path.basename(ref))); } }; };
