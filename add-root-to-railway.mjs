const RAILWAY_TOKEN = "c9ac3218-98bc-43cf-850a-0713d7fd05b3";
const PROJECT_ID = "91b0d3de-ddfc-4e11-b697-9ac0951ea7dd";
const ENV_ID = "7a481a98-7346-431c-b9a0-5db1de9b9790";
const DASHBOARD_SERVICE_ID = "d04dcdd9-2e78-427f-b93c-4aee1662c3d7";

async function railwayGQL(query) {
  return (await fetch("https://backboard.railway.com/graphql/v2", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RAILWAY_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  })).json();
}

async function main() {
  console.log("=== Adding menubuildr.com to Railway ===");
  const add = await railwayGQL(`
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
  console.log(JSON.stringify(add, null, 2));
}
main().catch(console.error);
