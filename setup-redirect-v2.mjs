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
  const res = await fetch(`${CF_API}${path}`, opts);
  return res.json();
}

async function railwayGQL(query) {
  const res = await fetch("https://backboard.railway.com/graphql/v2", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RAILWAY_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

async function main() {
  // Step 1: Delete menubuildr.com from Railway (cert won't provision for apex)
  console.log("=== Step 1: Remove menubuildr.com from Railway ===");
  const del = await railwayGQL(`mutation { customDomainDelete(id: "9fe3e01d-3b82-4d82-8ff3-04f0cf5556b8") }`);
  console.log("Delete:", JSON.stringify(del));

  // Step 2: Enable Cloudflare proxy on menubuildr.com so page rules work
  console.log("\n=== Step 2: Enable proxy on menubuildr.com CNAME ===");
  const records = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records?name=menubuildr.com&type=CNAME`);
  const rootRec = records.result?.[0];
  if (rootRec) {
    // Point to app.menubuildr.com target and enable proxy
    const upd = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records/${rootRec.id}`, "PUT", {
      type: "CNAME", name: "menubuildr.com",
      content: "1lqxxtde.up.railway.app",  // same as app.menubuildr.com
      proxied: true, ttl: 1,
    });
    console.log("Proxy enabled:", upd.success);
  }

  // Step 3: Create page rule to redirect menubuildr.com/* -> app.menubuildr.com/*
  console.log("\n=== Step 3: Create Page Rule redirect ===");

  // First check existing page rules
  const existing = await cfAPI(`/zones/${CF_ZONE_ID}/pagerules`);
  console.log("Existing page rules:", JSON.stringify(existing, null, 2));

  // Delete any existing rules for menubuildr.com to avoid conflicts
  if (existing.success && existing.result) {
    for (const rule of existing.result) {
      const target = rule.targets?.[0]?.constraint?.value || "";
      if (target.includes("menubuildr.com") && !target.includes("app.")) {
        console.log(`Deleting old rule: ${rule.id} (${target})`);
        await cfAPI(`/zones/${CF_ZONE_ID}/pagerules/${rule.id}`, "DELETE");
      }
    }
  }

  // Create the redirect rule
  const pageRule = await cfAPI(`/zones/${CF_ZONE_ID}/pagerules`, "POST", {
    targets: [
      {
        target: "url",
        constraint: { operator: "matches", value: "menubuildr.com/*" }
      }
    ],
    actions: [
      {
        id: "forwarding_url",
        value: {
          url: "https://app.menubuildr.com/$1",
          status_code: 301
        }
      }
    ],
    status: "active",
    priority: 1
  });
  console.log("\nPage Rule result:", JSON.stringify(pageRule, null, 2));

  // Step 4: Verify final DNS state
  console.log("\n=== Final DNS State ===");
  const final = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records`);
  for (const r of final.result) {
    console.log(`  ${r.type.padEnd(6)} ${r.name.padEnd(40)} -> ${r.content}  (proxied: ${r.proxied})`);
  }
}
main().catch(console.error);
