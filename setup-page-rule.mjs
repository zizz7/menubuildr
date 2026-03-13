const CF_TOKEN = "4z18boNVN8RCCEgTHHLJWRuLe4yhNe51V38vqI7r";
const ZONE_ID = "db27fa7e0a03291dbc03565b187a613c";
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
  // Step 1: Create page rule to redirect menubuildr.com/* -> https://app.menubuildr.com/$1
  console.log("Creating page rule for menubuildr.com -> app.menubuildr.com redirect...");
  const ruleData = {
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
    priority: 1,
    status: "active"
  };

  const result = await cfAPI(`/zones/${ZONE_ID}/pagerules`, "POST", ruleData);
  if (result.success) {
    console.log("Page rule created successfully! ID:", result.result.id);
  } else {
    console.log("Failed to create page rule:", JSON.stringify(result.errors));
  }

  // Step 2: Verify the root domain CNAME is proxied (required for page rules to work)
  console.log("\nChecking DNS records...");
  const records = await cfAPI(`/zones/${ZONE_ID}/dns_records?name=menubuildr.com&type=CNAME`);
  if (records.success && records.result.length > 0) {
    const record = records.result[0];
    console.log(`Root CNAME: ${record.content} (proxied: ${record.proxied})`);
    if (!record.proxied) {
      console.log("Enabling proxy on root domain...");
      const update = await cfAPI(`/zones/${ZONE_ID}/dns_records/${record.id}`, "PATCH", { proxied: true });
      console.log("Proxy enabled:", update.success);
    } else {
      console.log("Proxy already enabled.");
    }
  }

  // Step 3: Test the redirect
  console.log("\nTesting redirect (waiting 5 seconds for propagation)...");
  await new Promise(r => setTimeout(r, 5000));
  
  try {
    const res = await fetch("https://menubuildr.com", { redirect: "manual" });
    console.log("Status:", res.status);
    console.log("Location:", res.headers.get("location"));
    if (res.status === 301 && res.headers.get("location")?.includes("app.menubuildr.com")) {
      console.log("\n✅ Redirect is working! menubuildr.com -> app.menubuildr.com");
    } else {
      console.log("\n⚠️ Redirect may not be active yet. Give it a minute and try again.");
    }
  } catch (e) {
    console.log("Test error:", e.message);
  }
}

main().catch(console.error);
