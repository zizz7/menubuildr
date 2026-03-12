const TOKEN = "c9ac3218-98bc-43cf-850a-0713d7fd05b3";
const ENDPOINT = "https://backboard.railway.com/graphql/v2";
const PROJECT_ID = "91b0d3de-ddfc-4e11-b697-9ac0951ea7dd";
const ENV_ID = "7a481a98-7346-431c-b9a0-5db1de9b9790";
const SERVER_ID = "c86c866e-c968-4f24-9e34-c5cbf52db095";
const DASHBOARD_ID = "d04dcdd9-2e78-427f-b93c-4aee1662c3d7";
const DB_ID = "5e578ab8-3fb4-4f2d-a6d9-661988503203";

async function railwayAPI(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Authorization": `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function main() {
  for (const [name, serviceId] of [["server", SERVER_ID], ["dashboard", DASHBOARD_ID], ["postgres", DB_ID]]) {
    const deps = await railwayAPI(`
      query($input: DeploymentListInput!) {
        deployments(input: $input, first: 3) {
          edges { node { id status createdAt } }
        }
      }
    `, { input: { projectId: PROJECT_ID, environmentId: ENV_ID, serviceId } });
    
    console.log(`\n=== ${name} deployments ===`);
    if (deps.data?.deployments?.edges) {
      for (const edge of deps.data.deployments.edges) {
        const d = edge.node;
        console.log(`  ${d.status} - ${d.createdAt} (${d.id.slice(0,8)})`);
      }
      
      // Get build logs for latest
      const latest = deps.data.deployments.edges[0]?.node;
      if (latest && (latest.status === "FAILED" || latest.status === "BUILDING")) {
        console.log(`  --- Build logs (last 20 lines) ---`);
        const logs = await railwayAPI(`
          query($deploymentId: String!) {
            buildLogs(deploymentId: $deploymentId, limit: 20) { message }
          }
        `, { deploymentId: latest.id });
        if (logs.data?.buildLogs) {
          for (const log of logs.data.buildLogs.slice(-20)) {
            console.log(`    ${log.message}`);
          }
        }
      }
    }
  }
}

main().catch(console.error);
