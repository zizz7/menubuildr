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
  // Step 1: Delete menubuildr.com from Railway — cert won't provision for apex
  console.log("=== Deleting menubuildr.com from Railway ===");
  const del = await railwayGQL(`mutation { customDomainDelete(id: "9fe3e01d-3b82-4d82-8ff3-04f0cf5556b8") }`);
  console.log("Delete:", JSON.stringify(del));

  await new Promise(r => setTimeout(r, 1000));
