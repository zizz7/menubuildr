const CF_TOKEN = "4z18boNVN8RCCEgTHHLJWRuLe4yhNe51V38vqI7r";
const CF_ZONE_ID = "db27fa7e0a03291dbc03565b187a613c";
const CF_API = "https://api.cloudflare.com/client/v4";

async function cfAPI(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: { "Authorization": `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${CF_API}${path}`, opts);
  return res.json();
}

async function main() {
  console.log("=== Current DNS Records ===");
  const records = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records`);
  for (const r of records.result) {
    console.log(`  ${r.type.padEnd(6)} ${r.name.padEnd(40)} -> ${r.content}  (proxied: ${r.proxied}, id: ${r.id})`);
  }

  // Fix app.menubuildr.com - set proxied: false (was working before)
  const appRecord = records.result.find(r => r.name === "app.menubuildr.com" && r.type === "CNAME");
  if (appRecord) {
    console.log("\n=== Fixing app.menubuildr.com -> proxied: false ===");
    const res = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records/${appRecord.id}`, "PUT", {
      type: "CNAME", name: "app.menubuildr.com", content: appRecord.content, proxied: false, ttl: 1,
    });
    console.log("Updated:", res.success);
  }

  // Fix api.menubuildr.com - set proxied: false (was working before)
  const apiRecord = records.result.find(r => r.name === "api.menubuildr.com" && r.type === "CNAME");
  if (apiRecord) {
    console.log("\n=== Fixing api.menubuildr.com -> proxied: false ===");
    const res = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records/${apiRecord.id}`, "PUT", {
      type: "CNAME", name: "api.menubuildr.com", content: apiRecord.content, proxied: false, ttl: 1,
    });
    console.log("Updated:", res.success);
  }

  // For menubuildr.com root - set proxied: false too so Railway can provision cert
  const rootRecord = records.result.find(r => r.name === "menubuildr.com" && r.type === "CNAME");
  if (rootRecord) {
    console.log("\n=== Fixing menubuildr.com -> proxied: false ===");
    const res = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records/${rootRecord.id}`, "PUT", {
      type: "CNAME", name: "menubuildr.com", content: rootRecord.content, proxied: false, ttl: 1,
    });
    console.log("Updated:", res.success);
  }

  console.log("\n=== Final DNS State ===");
  const final = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records`);
  for (const r of final.result) {
    console.log(`  ${r.type.padEnd(6)} ${r.name.padEnd(40)} -> ${r.content}  (proxied: ${r.proxied})`);
  }
}
main().catch(console.error);
