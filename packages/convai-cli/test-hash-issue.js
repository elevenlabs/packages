const { createHash } = require('crypto');

// Copy of the calculateConfigHash function
function calculateConfigHash(config) {
  const configObj = config;
  const configString = JSON.stringify(configObj, Object.keys(configObj).sort());
  
  const hash = createHash('md5');
  hash.update(configString, 'utf-8');
  return hash.digest('hex');
}

// Test 1: Top-level keys in different order (this works)
console.log('Test 1: Top-level keys in different order');
const config1 = { name: 'test', value: 123, enabled: true };
const config2 = { enabled: true, value: 123, name: 'test' };
const hash1 = calculateConfigHash(config1);
const hash2 = calculateConfigHash(config2);
console.log('Config 1 hash:', hash1);
console.log('Config 2 hash:', hash2);
console.log('Hashes are equal:', hash1 === hash2);
console.log('');

// Test 2: Nested object keys in different order (this FAILS)
console.log('Test 2: Nested object keys in different order');
const nestedConfig1 = {
  name: 'test',
  api_schema: {
    url: 'https://example.com',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token' }
  }
};

const nestedConfig2 = {
  name: 'test',
  api_schema: {
    method: 'POST',  // Different order
    url: 'https://example.com',
    headers: { 'Authorization': 'Bearer token', 'Content-Type': 'application/json' }  // Different order
  }
};

const nestedHash1 = calculateConfigHash(nestedConfig1);
const nestedHash2 = calculateConfigHash(nestedConfig2);
console.log('Nested Config 1 hash:', nestedHash1);
console.log('Nested Config 2 hash:', nestedHash2);
console.log('Hashes are equal:', nestedHash1 === nestedHash2);
console.log('');

// Show the actual JSON strings being hashed
console.log('JSON strings being hashed:');
console.log('Config 1:', JSON.stringify(nestedConfig1, Object.keys(nestedConfig1).sort()));
console.log('Config 2:', JSON.stringify(nestedConfig2, Object.keys(nestedConfig2).sort()));