const CF_TOKEN = "4z18boNVN8RCCEgTHHLJWRuLe4yhNe51V38vqI7r";
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
  // List zones to find menubuildr.com
  console.log("=== Zones ===");
  const zones = await cfAPI("/zones?name=menubuildr.com");
  if (!zones.success || zones.result.length === 0) {
    console.log("Zone not found:", JSON.stringify(zones.errors || zones));
    return;
  }
  const zone = zones.result[0];
  console.log(`Zone: ${zone.name} (${zone.id}) - Status: ${zone.status}`);

  // List DNS records
  console.log("\n=== DNS Records ===");
  const records = await cfAPI(`/zones/${zone.id}/dns_records`);
  if (records.success) {
    for (const r of records.result) {
      console.log(`  ${r.type.padEnd(6)} ${r.name.padEnd(30)} -> ${r.content}  (proxied: ${r.proxied})`);
    }
  } else {
    console.log("Error:", JSON.stringify(records.errors));
  }
}

main().catch(console.error);
