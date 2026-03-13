const RAILWAY_TOKEN = "c9ac3218-98bc-43cf-850a-0713d7fd05b3";
const PROJECT_ID = "91b0d3de-ddfc-4e11-b697-9ac0951ea7dd";
const ENV_ID = "7a481a98-7346-431c-b9a0-5db1de9b9790";
const DASHBOARD_SERVICE_ID = "d04dcdd9-2e78-427f-b93c-4aee1662c3d7";

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
  // Step 1: Delete the existing menubuildr.com domain
  console.log("=== Deleting menubuildr.com from Railway ===");
  const deleteRes = await railwayGQL(`
    mutation {
      customDomainDelete(id: "0f84103f-b0a4-41c2-8e1b-d8c59d0f5cde")
    }
  `);
  console.log("Delete result:", JSON.stringify(deleteRes, null, 2));

  // Wait a moment
  await new Promise(r => setTimeout(r, 3000));

  // Step 2: Re-add menubuildr.com
  console.log("\n=== Re-adding menubuildr.com to Railway ===");
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
  console.log("Add result:", JSON.stringify(addRes, null, 2));
}
main().catch(console.error);
