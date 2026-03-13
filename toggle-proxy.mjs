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
  const action = process.argv[2]; // "off" or "on"
  if (!action || !["off", "on"].includes(action)) {
    console.log("Usage: node toggle-proxy.mjs <off|on>");
    return;
  }

  const proxied = action === "on";
  const records = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records?name=menubuildr.com&type=CNAME`);
  const rec = records.result?.[0];
  if (!rec) { console.log("Record not found"); return; }

  console.log(`Current: ${rec.name} -> ${rec.content} (proxied: ${rec.proxied})`);
  const upd = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records/${rec.id}`, "PUT", {
    type: "CNAME", name: "menubuildr.com", content: rec.content, proxied, ttl: 1,
  });
  console.log(`Updated: proxied=${proxied}, success=${upd.success}`);
}
main().catch(console.error);
