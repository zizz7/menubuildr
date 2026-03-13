const CF_TOKEN = "4z18boNVN8RCCEgTHHLJWRuLe4yhNe51V38vqI7r";
const CF_ZONE_ID = "db27fa7e0a03291dbc03565b187a613c";
const CF_API = "https://api.cloudflare.com/client/v4";
const ACCOUNT_ID_URL = "/accounts";

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
  // First get account ID
  console.log("=== Getting Account ID ===");
  const accounts = await cfAPI("/accounts");
  console.log("Accounts:", JSON.stringify(accounts, null, 2));

  if (!accounts.success || !accounts.result?.length) {
    console.log("Cannot get account ID. Trying zone details...");
    const zone = await cfAPI(`/zones/${CF_ZONE_ID}`);
    console.log("Zone account:", zone.result?.account);
    return;
  }
}
main().catch(console.error);
