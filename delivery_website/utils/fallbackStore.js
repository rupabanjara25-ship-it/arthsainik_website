const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(__dirname, '..', 'data');

const collectionFiles = {
  users: 'users.json',
  categories: 'categories.json',
  products: 'products.json',
  orders: 'orders.json',
};

function ensureStore(collection) {
  const fileName = collectionFiles[collection];

  if (!fileName) {
    throw new Error(`Unknown fallback collection: ${collection}`);
  }

  fs.mkdirSync(dataDir, { recursive: true });

  const filePath = path.join(dataDir, fileName);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf8');
  }

  return filePath;
}

function readCollection(collection) {
  const filePath = ensureStore(collection);

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Fallback read error for ${collection}:`, error.message);
    return [];
  }
}

function writeCollection(collection, records) {
  const filePath = ensureStore(collection);
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf8');
}

function createRecordId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

module.exports = {
  createRecordId,
  readCollection,
  writeCollection,
};
