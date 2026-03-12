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
  // Step 1: Check deployment logs for server
  console.log("=== Server Deployment Logs ===");
  const serverDeps = await railwayAPI(`
    query($input: DeploymentListInput!) {
      deployments(input: $input, first: 1) {
        edges { node { id status } }
      }
    }
  `, { input: { projectId: PROJECT_ID, environmentId: ENV_ID, serviceId: SERVER_ID } });
  
  if (serverDeps.data?.deployments?.edges?.length > 0) {
    const depId = serverDeps.data.deployments.edges[0].node.id;
    console.log("Latest server deployment:", depId, serverDeps.data.deployments.edges[0].node.status);
    
    const logs = await railwayAPI(`
      query($deploymentId: String!) {
        buildLogs(deploymentId: $deploymentId, limit: 50) {
          message
          severity
        }
      }
    `, { deploymentId: depId });
    if (logs.data?.buildLogs) {
      for (const log of logs.data.buildLogs) {
        console.log(`  [${log.severity}] ${log.message}`);
      }
    } else {
      console.log("No build logs:", JSON.stringify(logs.errors));
    }
  }

  // Step 2: Check postgres variables to find DATABASE_URL
  console.log("\n=== Postgres Variables ===");
  const pgVars = await railwayAPI(`
    query($projectId: String!, $environmentId: String!, $serviceId: String!) {
      variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
    }
  `, { projectId: PROJECT_ID, environmentId: ENV_ID, serviceId: DB_ID });
  if (pgVars.data) {
    console.log("Postgres vars:", JSON.stringify(pgVars.data.variables, null, 2));
  }

  // Step 3: Check dashboard deployment logs
  console.log("\n=== Dashboard Deployment Logs ===");
  const dashDeps = await railwayAPI(`
    query($input: DeploymentListInput!) {
      deployments(input: $input, first: 1) {
        edges { node { id status } }
      }
    }
  `, { input: { projectId: PROJECT_ID, environmentId: ENV_ID, serviceId: DASHBOARD_ID } });
  
  if (dashDeps.data?.deployments?.edges?.length > 0) {
    const depId = dashDeps.data.deployments.edges[0].node.id;
    console.log("Latest dashboard deployment:", depId, dashDeps.data.deployments.edges[0].node.status);
    
    const logs = await railwayAPI(`
      query($deploymentId: String!) {
        buildLogs(deploymentId: $deploymentId, limit: 50) {
          message
          severity
        }
      }
    `, { deploymentId: depId });
    if (logs.data?.buildLogs) {
      for (const log of logs.data.buildLogs) {
        console.log(`  [${log.severity}] ${log.message}`);
      }
    } else {
      console.log("No build logs:", JSON.stringify(logs.errors));
    }
  }
}

main().catch(console.error);
