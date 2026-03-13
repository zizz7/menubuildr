const CF_TOKEN = "4z18boNVN8RCCEgTHHLJWRuLe4yhNe51V38vqI7r";
const CF_API = "https://api.cloudflare.com/client/v4";
const ZONE_ID = "db27fa7e0a03291dbc03565b187a613c";

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
  const records = await cfAPI(`/zones/${ZONE_ID}/dns_records`);
  
  const revert = {
    "api.menubuildr.com": "server-production-19e5.up.railway.app",
    "app.menubuildr.com": "dashboard-production-a138.up.railway.app",
  };

  for (const r of records.result) {
    if (r.type === "CNAME" && revert[r.name]) {
      console.log(`Reverting ${r.name} -> ${revert[r.name]}`);
      const result = await cfAPI(`/zones/${ZONE_ID}/dns_records/${r.id}`, "PATCH", {
        content: revert[r.name],
      });
      console.log(`  Result: ${result.success ? "OK" : JSON.stringify(result.errors)}`);
    }
  }

  console.log("\n=== Current DNS Records ===");
  const updated = await cfAPI(`/zones/${ZONE_ID}/dns_records`);
  for (const r of updated.result) {
    console.log(`  ${r.type.padEnd(6)} ${r.name.padEnd(40)} -> ${r.content}  (proxied: ${r.proxied})`);
  }
}

main().catch(console.error);
