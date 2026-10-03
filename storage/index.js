// Each adapter exposes: upload(stream,name,mime)->ref, download(ref)->stream, remove(ref)
module.exports = ctx => require('./' + (process.env.STORAGE || 'local'))(ctx);
