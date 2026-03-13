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
  // Step 1: Find the menubuildr.com CNAME record
  console.log("=== Finding menubuildr.com CNAME record ===");
  const records = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records?name=menubuildr.com&type=CNAME`);
  if (!records.success || records.result.length === 0) {
    console.log("CNAME record not found!");
    return;
  }
  const record = records.result[0];
  console.log(`Found: ${record.name} -> ${record.content} (proxied: ${record.proxied})`);

  // Step 2: Enable proxy (CNAME flattening) on the apex record
  console.log("\n=== Enabling Cloudflare proxy on menubuildr.com ===");
  const updateRes = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records/${record.id}`, "PUT", {
    type: "CNAME",
    name: "menubuildr.com",
    content: record.content,
    proxied: true,
    ttl: 1,
  });
  if (updateRes.success) {
    console.log("Proxy enabled! CNAME flattening is now active.");
    console.log(`  ${updateRes.result.name} -> ${updateRes.result.content} (proxied: ${updateRes.result.proxied})`);
  } else {
    console.log("Error:", JSON.stringify(updateRes.errors));
  }

  // Step 3: Check SSL mode
  console.log("\n=== Checking SSL mode ===");
  const sslRes = await cfAPI(`/zones/${CF_ZONE_ID}/settings/ssl`);
  if (sslRes.success) {
    console.log(`Current SSL mode: ${sslRes.result.value}`);
    if (sslRes.result.value !== "full") {
      console.log("Setting SSL mode to 'full' for Railway compatibility...");
      const sslUpdate = await cfAPI(`/zones/${CF_ZONE_ID}/settings/ssl`, "PATCH", { value: "full" });
      console.log(sslUpdate.success ? "SSL mode set to full" : "Error: " + JSON.stringify(sslUpdate.errors));
    }
  }

  // Step 4: Verify final state
  console.log("\n=== Final DNS State ===");
  const finalRecords = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records`);
  if (finalRecords.success) {
    for (const r of finalRecords.result) {
      console.log(`  ${r.type.padEnd(6)} ${r.name.padEnd(40)} -> ${r.content}  (proxied: ${r.proxied})`);
    }
  }
}
main().catch(console.error);
