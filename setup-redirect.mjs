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
  // Try Page Rules approach - redirect menubuildr.com/* to app.menubuildr.com/*
  console.log("=== Creating Page Rule for redirect ===");
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

  console.log("Page Rule result:", JSON.stringify(pageRule, null, 2));

  if (!pageRule.success) {
    console.log("\nPage Rule failed, trying Redirect Rules (Bulk Redirects)...");
    
    // Try creating a redirect rule via rulesets
    const rulesets = await cfAPI(`/zones/${CF_ZONE_ID}/rulesets`);
    console.log("Existing rulesets:", JSON.stringify(rulesets.result?.map(r => ({ id: r.id, name: r.name, phase: r.phase })), null, 2));
  }

  // Also list existing page rules
  console.log("\n=== Existing Page Rules ===");
  const existingRules = await cfAPI(`/zones/${CF_ZONE_ID}/pagerules`);
  console.log(JSON.stringify(existingRules, null, 2));
}
main().catch(console.error);
