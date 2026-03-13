const CF_TOKEN = "4z18boNVN8RCCEgTHHLJWRuLe4yhNe51V38vqI7r";
const CF_ZONE_ID = "db27fa7e0a03291dbc03565b187a613c";
const CF_API = "https://api.cloudflare.com/client/v4";
const RAILWAY_TOKEN = "c9ac3218-98bc-43cf-850a-0713d7fd05b3";
const PROJECT_ID = "91b0d3de-ddfc-4e11-b697-9ac0951ea7dd";
const ENV_ID = "7a481a98-7346-431c-b9a0-5db1de9b9790";
const DASHBOARD_SERVICE_ID = "d04dcdd9-2e78-427f-b93c-4aee1662c3d7";

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
  // Step 1: Delete the page rule redirect
  console.log("=== Step 1: Remove page rule redirect ===");
  const rules = await cfAPI(`/zones/${CF_ZONE_ID}/pagerules`);
  if (rules.success) {
    for (const rule of rules.result) {
      console.log(`  Deleting rule: ${rule.id}`);
      const del = await cfAPI(`/zones/${CF_ZONE_ID}/pagerules/${rule.id}`, "DELETE");
      console.log(`  Deleted: ${del.success}`);
    }
  }

  // Step 2: Set Cloudflare SSL mode to Full
  console.log("\n=== Step 2: Set SSL mode to Full ===");
  const sslRes = await cfAPI(`/zones/${CF_ZONE_ID}/settings/ssl`, "PATCH", { value: "full" });
  console.log("SSL mode:", sslRes.success ? sslRes.result?.value : JSON.stringify(sslRes.errors));

  // Step 3: Add menubuildr.com back to Railway
  console.log("\n=== Step 3: Add menubuildr.com to Railway ===");
  const addRes = await railwayGQL(`
    mutation {
      customDomainCreate(input: {
        projectId: "${PROJECT_ID}"
        environmentId: "${ENV_ID}"
        serviceId: "${DASHBOARD_SERVICE_ID}"
        domain: "menubuildr.com"
      }) {
        id domain
        status { dnsRecords { requiredValue currentValue status hostlabel zone } }
      }
    }
  `);
  console.log("Railway add:", JSON.stringify(addRes, null, 2));

  const newDomain = addRes.data?.customDomainCreate;
  if (!newDomain) {
    console.log("Failed to add domain to Railway");
    return;
  }

  // Step 4: Update Cloudflare CNAME to new Railway target, proxied: true
  const cnameTarget = newDomain.status.dnsRecords[0]?.requiredValue;
  console.log(`\n=== Step 4: Update CNAME -> ${cnameTarget} (proxied: true) ===`);
  const records = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records?name=menubuildr.com&type=CNAME`);
  const rootRec = records.result?.[0];
  if (rootRec) {
    const upd = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records/${rootRec.id}`, "PUT", {
      type: "CNAME", name: "menubuildr.com", content: cnameTarget, proxied: true, ttl: 1,
    });
    console.log("Updated:", upd.success);
  }

  // Step 5: Verify
  console.log("\n=== Final DNS State ===");
  const final = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records`);
  for (const r of final.result) {
    console.log(`  ${r.type.padEnd(6)} ${r.name.padEnd(40)} -> ${r.content}  (proxied: ${r.proxied})`);
  }

  console.log("\n=== Railway Domain Status ===");
  const domCheck = await railwayGQL(`{
    domains(projectId: "${PROJECT_ID}", environmentId: "${ENV_ID}", serviceId: "${DASHBOARD_SERVICE_ID}") {
      customDomains { domain status { dnsRecords { requiredValue currentValue status } } }
    }
  }`);
  console.log(JSON.stringify(domCheck, null, 2));
}
main().catch(console.error);
