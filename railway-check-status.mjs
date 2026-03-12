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
  // Check project status with services and deployments
  console.log("=== Project Status ===");
  const project = await railwayAPI(`
    query($id: String!) {
      project(id: $id) {
        id
        name
        services {
          edges {
            node {
              id
              name
              repoTriggers { branch repository }
            }
          }
        }
      }
    }
  `, { id: PROJECT_ID });
  
  if (project.data) {
    for (const edge of project.data.project.services.edges) {
      const svc = edge.node;
      console.log(`\nService: ${svc.name} (${svc.id})`);
      console.log(`  Repo triggers:`, JSON.stringify(svc.repoTriggers));
    }
  } else {
    console.log("Error:", JSON.stringify(project.errors));
  }

  // Check deployments
  console.log("\n=== Recent Deployments ===");
  const deps = await railwayAPI(`
    query($projectId: String!, $environmentId: String!) {
      deployments(
        input: { projectId: $projectId, environmentId: $environmentId }
        first: 10
      ) {
        edges {
          node {
            id
            status
            createdAt
            service { name }
          }
        }
      }
    }
  `, { projectId: PROJECT_ID, environmentId: ENV_ID });

  if (deps.data) {
    for (const edge of deps.data.deployments.edges) {
      const d = edge.node;
      console.log(`  ${d.service?.name || 'unknown'}: ${d.status} (${d.createdAt})`);
    }
  } else {
    console.log("Error:", JSON.stringify(deps.errors));
  }

  // Check variables for server
  console.log("\n=== Server Variables ===");
  const vars = await railwayAPI(`
    query($projectId: String!, $environmentId: String!, $serviceId: String!) {
      variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
    }
  `, { projectId: PROJECT_ID, environmentId: ENV_ID, serviceId: SERVER_ID });
  if (vars.data) {
    const v = vars.data.variables;
    for (const [key, val] of Object.entries(v)) {
      const display = key.includes('SECRET') || key.includes('KEY') ? '***' : val;
      console.log(`  ${key} = ${display}`);
    }
  }

  // Check variables for dashboard
  console.log("\n=== Dashboard Variables ===");
  const dashVars = await railwayAPI(`
    query($projectId: String!, $environmentId: String!, $serviceId: String!) {
      variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
    }
  `, { projectId: PROJECT_ID, environmentId: ENV_ID, serviceId: DASHBOARD_ID });
  if (dashVars.data) {
    for (const [key, val] of Object.entries(dashVars.data.variables)) {
      console.log(`  ${key} = ${val}`);
    }
  }
}

main().catch(console.error);
