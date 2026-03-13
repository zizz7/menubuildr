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
  // Get full introspection of the domain status
  const result = await railwayGQL(`{
    customDomain(id: "2cfc7939-5b51-41c1-aceb-3369c80cc1d8", projectId: "${PROJECT_ID}") {
      id
      domain
      status {
        dnsRecords {
          requiredValue
          currentValue
          status
          hostlabel
          zone
        }
      }
    }
  }`);
  console.log("Custom domain detail:", JSON.stringify(result, null, 2));

  // Also check latest deployment status
  const deployResult = await railwayGQL(`{
    deployments(
      first: 1
      input: {
        projectId: "${PROJECT_ID}"
        environmentId: "${ENV_ID}"
        serviceId: "${DASHBOARD_SERVICE_ID}"
      }
    ) {
      edges {
        node {
          id
          status
          createdAt
        }
      }
    }
  }`);
  console.log("\nLatest deployment:", JSON.stringify(deployResult, null, 2));
}
main().catch(console.error);
