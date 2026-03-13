const CF_TOKEN = "4z18boNVN8RCCEgTHHLJWRuLe4yhNe51V38vqI7r";
const CF_ZONE_ID = "db27fa7e0a03291dbc03565b187a613c";
const CF_API = "https://api.cloudflare.com/client/v4";
const RAILWAY_TOKEN = "c9ac3218-98bc-43cf-850a-0713d7fd05b3";
const PROJECT_ID = "91b0d3de-ddfc-4e11-b697-9ac0951ea7dd";
const ENV_ID = "7a481a98-7346-431c-b9a0-5db1de9b9790";
const DASHBOARD_SERVICE_ID = "d04dcdd9-2e78-427f-b93c-4aee1662c3d7";

async function cfAPI(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: { "Authorization": `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  return (await fetch(`${CF_API}${path}`, opts)).json();
}

async function railwayGQL(query) {
  return (await fetch("https://backboard.railway.com/graphql/v2", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RAILWAY_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  })).json();
}

async function main() {
  // Step 1: Delete existing menubuildr.com from Railway
  console.log("=== Deleting menubuildr.com from Railway ===");
  const del = await railwayGQL(`mutation { customDomainDelete(id: "67e00c9c-c183-4807-b6ee-c680454dc58d") }`);
  console.log("Deleted:", JSON.stringify(del));

  // Step 2: Also remove any old TXT verification records for root domain
  console.log("\n=== Cleaning up old DNS records ===");
  const allRecords = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records`);
  for (const r of allRecords.result) {
    if (r.name === "_railway-verify.menubuildr.com" && r.type === "TXT") {
      console.log(`  Deleting old TXT: ${r.name}`);
      await cfAPI(`/zones/${CF_ZONE_ID}/dns_records/${r.id}`, "DELETE");
    }
  }

  // Wait 5 seconds for Railway to clean up
  console.log("\nWaiting 5s...");
  await new Promise(r => setTimeout(r, 5000));

  // Step 3: Re-add menubuildr.com to Railway
  console.log("\n=== Adding menubuildr.com to Railway (fresh) ===");
  const add = await railwayGQL(`
    mutation {
      customDomainCreate(input: {
        projectId: "${PROJECT_ID}"
        environmentId: "${ENV_ID}"
        serviceId: "${DASHBOARD_SERVICE_ID}"
        domain: "menubuildr.com"
      }) {
        id domain
        status { dnsRecords { requiredValue currentValue status hostlabel zone } }
      }
    }
  `);
  console.log("Added:", JSON.stringify(add, null, 2));

  const domain = add.data?.customDomainCreate;
  if (!domain) { console.log("Failed!"); return; }

  // Step 4: Update CNAME to new target (proxied: false for cert provisioning)
  const target = domain.status.dnsRecords[0]?.requiredValue;
  console.log(`\n=== Updating CNAME -> ${target} (proxied: false) ===`);
  const cnameRec = (await cfAPI(`/zones/${CF_ZONE_ID}/dns_records?name=menubuildr.com&type=CNAME`)).result?.[0];
  if (cnameRec) {
    await cfAPI(`/zones/${CF_ZONE_ID}/dns_records/${cnameRec.id}`, "PUT", {
      type: "CNAME", name: "menubuildr.com", content: target, proxied: false, ttl: 1,
    });
    console.log("Updated");
  }

  // Step 5: Create TXT verification record if Railway requires one
  for (const rec of domain.status.dnsRecords) {
    if (rec.requiredValue.startsWith("railway-verify=")) {
      const txtName = rec.hostlabel ? `${rec.hostlabel}.${rec.zone}` : `_railway-verify.${rec.zone}`;
      console.log(`\nCreating TXT: ${txtName} -> ${rec.requiredValue}`);
      await cfAPI(`/zones/${CF_ZONE_ID}/dns_records`, "POST", {
        type: "TXT", name: txtName, content: rec.requiredValue, proxied: false, ttl: 1,
      });
    }
  }

  // Step 6: Poll for cert provisioning
  console.log("\n=== Polling for cert (every 30s, up to 10 min) ===");
  const https = await import('node:https');
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 30000));
    try {
      const result = await new Promise((resolve, reject) => {
        const req = https.get(`https://${target}`, {
          headers: { Host: 'menubuildr.com' },
          timeout: 10000,
          rejectUnauthorized: false,
        }, (res) => {
          const cert = res.socket.getPeerCertificate();
          resolve({
            status: res.statusCode,
            certCN: cert.subject?.CN,
            fallback: res.headers['x-railway-fallback'],
          });
          res.resume();
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      });
      console.log(`  [${(i+1)*30}s] Status: ${result.status} | Cert: ${result.certCN} | Fallback: ${result.fallback || 'no'}`);
      if (!result.fallback && result.certCN !== '*.up.railway.app') {
        console.log("\n  CERT PROVISIONED! Enabling Cloudflare proxy...");
        await cfAPI(`/zones/${CF_ZONE_ID}/dns_records/${cnameRec.id}`, "PUT", {
          type: "CNAME", name: "menubuildr.com", content: target, proxied: true, ttl: 1,
        });
        console.log("  Proxy enabled. menubuildr.com should now work!");
        return;
      }
    } catch (e) {
      console.log(`  [${(i+1)*30}s] Error: ${e.message}`);
    }
  }
  console.log("\nCert not provisioned after 10 min. Railway may need more time.");
  console.log("Run 'node toggle-proxy.mjs on' once the cert is ready.");
}
main().catch(console.error);
