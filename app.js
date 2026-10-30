const express = require('express');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');

const app = express();
app.use(express.json());

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const APP_ENV = process.env.APP_ENV || 'local';

let links = null;
async function getLinks() {
  if (!links) {
    const client = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 2000 });
    await client.connect();
    links = client.db('shortener').collection('links');
  }
  return links;
}

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

app.get('/health', (req, res) => res.json({ status: 'UP' }));

app.get('/version', (req, res) => res.json({ env: APP_ENV, version: 'v2' }));

app.post('/shorten', async (req, res) => {
  const url = req.body && req.body.url;
  if (!url) return res.status(400).json({ error: 'url is required' });
  if (!isValidUrl(url)) return res.status(400).json({ error: 'url must be http or https' });
  try {
    const col = await getLinks();
    const code = crypto.randomBytes(4).toString('hex');
    await col.insertOne({ code, url, created: new Date() });
    res.status(201).json({ code, short: `${BASE_URL}/${code}` });
  } catch (e) {
    links = null;
    res.status(503).json({ error: 'Database not reachable' });
  }
});

app.get('/:code', async (req, res) => {
  try {
    const col = await getLinks();
    const doc = await col.findOne({ code: req.params.code });
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.redirect(doc.url);
  } catch (e) {
    links = null;
    res.status(503).json({ error: 'Database not reachable' });
  }
});

if (require.main === module) {
  app.listen(3000, () => console.log(`App running on port 3000 (${APP_ENV})`));
}
module.exports = app;
