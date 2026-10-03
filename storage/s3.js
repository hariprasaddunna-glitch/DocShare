const { S3Client, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage'); const crypto = require('crypto');
module.exports = () => {
  const e = process.env, Bucket = e.S3_BUCKET;
  const c = new S3Client({ region: e.S3_REGION || 'auto', endpoint: e.S3_ENDPOINT || undefined, forcePathStyle: true,
    credentials: { accessKeyId: e.S3_ACCESS_KEY, secretAccessKey: e.S3_SECRET_KEY } });
  return {
    async upload(s, name, mime) { const Key = crypto.randomUUID(); await new Upload({ client: c, params: { Bucket, Key, Body: s, ContentType: mime } }).done(); return Key; },
    async download(Key) { return (await c.send(new GetObjectCommand({ Bucket, Key }))).Body; },
    async remove(Key) { await c.send(new DeleteObjectCommand({ Bucket, Key })); } }; };
