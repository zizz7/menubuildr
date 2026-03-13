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
    headers: {
      "Authorization": `Bearer ${RAILWAY_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

async function main() {
  // Step 1: Delete the menubuildr.com domain from Railway (cert won't provision)
  console.log("=== Step 1: Delete menubuildr.com from Railway ===");
  const deleteRes = await railwayGQL(`
    mutation { customDomainDelete(id: "2cfc7939-5b51-41c1-aceb-3369c80cc1d8") }
  `);
  console.log("Delete:", JSON.stringify(deleteRes));

  await new Promise(r => setTimeout(r, 2000));

  // Step 2: Re-add menubuildr.com to Railway dashboard service
  // This time Railway will give us a fresh CNAME target
  console.log("\n=== Step 2: Re-add menubuildr.com to Railway ===");
  const addRes = await railwayGQL(`
    mutation {
      customDomainCreate(input: {
        projectId: "${PROJECT_ID}"
        environmentId: "${ENV_ID}"
        serviceId: "${DASHBOARD_SERVICE_ID}"
        domain: "menubuildr.com"
      }) {
        id
        domain
        status {
          dnsRecords {
            requiredValue currentValue status hostlabel zone
          }
        }
      }
    }
  `);
  console.log("Add:", JSON.stringify(addRes, null, 2));

  if (addRes.errors) {
    console.log("Failed to add domain. Trying alternative approach...");
    return;
  }

  const newDomain = addRes.data.customDomainCreate;
  const cnameTarget = newDomain.status.dnsRecords.find(r => !r.requiredValue.startsWith("railway-verify"));
  const txtRecord = newDomain.status.dnsRecords.find(r => r.requiredValue.startsWith("railway-verify"));

  // Step 3: Update Cloudflare DNS - CNAME for root domain
  console.log("\n=== Step 3: Update Cloudflare DNS ===");
  const records = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records`);
  
  // Update root CNAME
  if (cnameTarget) {
    const rootRec = records.result.find(r => r.name === "menubuildr.com" && r.type === "CNAME");
    if (rootRec) {
      console.log(`Updating CNAME: menubuildr.com -> ${cnameTarget.requiredValue}`);
      const upd = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records/${rootRec.id}`, "PUT", {
        type: "CNAME", name: "menubuildr.com", content: cnameTarget.requiredValue, proxied: false, ttl: 1,
      });
      console.log("Updated:", upd.success);
    }
  }

  // Create TXT verification record if needed
  if (txtRecord) {
    const txtName = txtRecord.hostlabel ? `${txtRecord.hostlabel}.${txtRecord.zone}` : `_railway-verify.${txtRecord.zone}`;
    console.log(`Creating TXT: ${txtName} -> ${txtRecord.requiredValue}`);
    const existing = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records?name=${txtName}&type=TXT`);
    if (existing.success && existing.result.length > 0) {
      await cfAPI(`/zones/${CF_ZONE_ID}/dns_records/${existing.result[0].id}`, "PUT", {
        type: "TXT", name: txtName, content: txtRecord.requiredValue, proxied: false, ttl: 1,
      });
    } else {
      await cfAPI(`/zones/${CF_ZONE_ID}/dns_records`, "POST", {
        type: "TXT", name: txtName, content: txtRecord.requiredValue, proxied: false, ttl: 1,
      });
    }
    console.log("TXT record set");
  }

  // Step 4: Verify final state
  console.log("\n=== Final DNS State ===");
  const final = await cfAPI(`/zones/${CF_ZONE_ID}/dns_records`);
  for (const r of final.result) {
    console.log(`  ${r.type.padEnd(6)} ${r.name.padEnd(40)} -> ${r.content}  (proxied: ${r.proxied})`);
  }

  console.log("\n=== Railway Domain Status ===");
  const domainCheck = await railwayGQL(`{
    domains(projectId: "${PROJECT_ID}", environmentId: "${ENV_ID}", serviceId: "${DASHBOARD_SERVICE_ID}") {
      customDomains { id domain status { dnsRecords { requiredValue currentValue status hostlabel zone } } }
    }
  }`);
  console.log(JSON.stringify(domainCheck, null, 2));
}
main().catch(console.error);
