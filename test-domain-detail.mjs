import https from 'node:https';
import http from 'node:http';

function testUrl(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 10000 }, (res) => {
      console.log(`${url} => Status: ${res.statusCode}`);
      for (const [k, v] of Object.entries(res.headers)) {
        console.log(`  ${k}: ${v}`);
      }
      res.resume();
      resolve();
    });
    req.on('error', (e) => {
      console.log(`${url} => Error: ${e.code || e.message}`);
      resolve();
    });
    req.on('timeout', () => {
      console.log(`${url} => Timeout`);
      req.destroy();
      resolve();
    });
  });
}

async function main() {
  await testUrl('https://menubuildr.com');
  await testUrl('http://menubuildr.com');
  await testUrl('https://app.menubuildr.com');
}
main();
