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
  // Get all DNS records
  const records = await cfAPI(`/zones/${ZONE_ID}/dns_records`);
  if (!records.success) {
    console.log("Error fetching records:", records.errors);
    return;
  }

  // Correct CNAME targets (Railway custom domain CNAME targets)
  const fixes = {
    "api.menubuildr.com": "64y7xule.up.railway.app",
    "app.menubuildr.com": "crshhqdp.up.railway.app",
  };

  for (const r of records.result) {
    if (r.type === "CNAME" && fixes[r.name]) {
      const correctTarget = fixes[r.name];
      if (r.content !== correctTarget) {
        console.log(`Updating ${r.name}: ${r.content} -> ${correctTarget}`);
        const result = await cfAPI(`/zones/${ZONE_ID}/dns_records/${r.id}`, "PATCH", {
          content: correctTarget,
        });
        console.log(`  Result: ${result.success ? "OK" : JSON.stringify(result.errors)}`);
      } else {
        console.log(`${r.name} already correct -> ${r.content}`);
      }
    }
  }

  // Verify
  console.log("\n=== Updated DNS Records ===");
  const updated = await cfAPI(`/zones/${ZONE_ID}/dns_records`);
  for (const r of updated.result) {
    if (r.type === "CNAME") {
      console.log(`  ${r.name} -> ${r.content} (proxied: ${r.proxied})`);
    }
  }
}

main().catch(console.error);
