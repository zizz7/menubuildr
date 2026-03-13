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
  // Find the menubuildr.com CNAME record
  const records = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records?name=menubuildr.com&type=CNAME`);
  const record = records.result[0];
  console.log(`Current: ${record.name} -> ${record.content} (proxied: ${record.proxied})`);

  // Update to new Railway target, keep proxied: true
  const updateRes = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records/${record.id}`, "PUT", {
    type: "CNAME",
    name: "menubuildr.com",
    content: "lyw8z819.up.railway.app",
    proxied: true,
    ttl: 1,
  });
  if (updateRes.success) {
    console.log(`Updated: ${updateRes.result.name} -> ${updateRes.result.content} (proxied: ${updateRes.result.proxied})`);
  } else {
    console.log("Error:", JSON.stringify(updateRes.errors));
  }
}
main().catch(console.error);
