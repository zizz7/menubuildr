const CF_TOKEN = "4z18boNVN8RCCEgTHHLJWRuLe4yhNe51V38vqI7r";
const CF_ZONE_ID = "db27fa7e0a03291dbc03565b187a613c";
const CF_API = "https://api.cloudflare.com/client/v4";
const RAILWAY_TOKEN = "c9ac3218-98bc-43cf-850a-0713d7fd05b3";

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
  // Step 1: Delete menubuildr.com from Railway (cert won't provision)
  console.log("=== Deleting menubuildr.com from Railway ===");
  const del = await railwayGQL(`mutation { customDomainDelete(id: "12d8de76-454d-48bb-9de0-c3f87409973b") }`);
  console.log("Deleted:", JSON.stringify(del));

  // Step 2: Point menubuildr.com CNAME to app.menubuildr.com with proxy ON
  // Cloudflare will handle SSL and forward to app.menubuildr.com -> Railway
  console.log("\n=== Updating CNAME: menubuildr.com -> app.menubuildr.com (proxied) ===");
  const rec = (await cfAPI(`/zones/${CF_ZONE_ID}/dns_records?name=menubuildr.com&type=CNAME`)).result?.[0];
  if (rec) {
    const upd = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records/${rec.id}`, "PUT", {
      type: "CNAME", name: "menubuildr.com", content: "app.menubuildr.com", proxied: true, ttl: 1,
    });
    console.log("Updated:", upd.success);
  }

  // Step 3: Try to set SSL mode to Full
  console.log("\n=== Setting SSL mode to Full ===");
  const ssl = await cfAPI(`/zones/${CF_ZONE_ID}/settings/ssl`, "PATCH", { value: "full" });
  if (ssl.success) {
    console.log("SSL mode set to Full");
  } else {
    console.log("SSL API failed:", JSON.stringify(ssl.errors));
    console.log("*** YOU MUST set SSL mode to Full in Cloudflare dashboard ***");
    console.log("*** Go to: menubuildr.com zone -> SSL/TLS -> Overview -> Full ***");
  }

  // Step 4: Verify
  console.log("\n=== Final DNS State ===");
  const final = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records`);
  for (const r of final.result) {
    console.log(`  ${r.type.padEnd(6)} ${r.name.padEnd(40)} -> ${r.content}  (proxied: ${r.proxied})`);
  }

  // Step 5: Test
  console.log("\n=== Testing (after 5s) ===");
  await new Promise(r => setTimeout(r, 5000));
  try {
    const res = await fetch("https://menubuildr.com", { redirect: "manual" });
    console.log(`https://menubuildr.com -> Status: ${res.status}`);
    if (res.headers.get("location")) console.log(`  Location: ${res.headers.get("location")}`);
    console.log(`  Server: ${res.headers.get("server")}`);
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
}
main().catch(console.error);
