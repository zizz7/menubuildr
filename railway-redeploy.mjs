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
  // First, let's check the current service instance config to verify rootDirectory is set
  console.log("=== Checking Server service instance ===");
  const serverInstance = await railwayAPI(`
    query($environmentId: String!, $serviceId: String!) {
      serviceInstance(environmentId: $environmentId, serviceId: $serviceId) {
        buildCommand
        startCommand
        rootDirectory
        healthcheckPath
        builder
      }
    }
  `, { environmentId: ENV_ID, serviceId: SERVER_ID });
  console.log("Server instance:", JSON.stringify(serverInstance.data, null, 2));

  console.log("\n=== Checking Dashboard service instance ===");
  const dashInstance = await railwayAPI(`
    query($environmentId: String!, $serviceId: String!) {
      serviceInstance(environmentId: $environmentId, serviceId: $serviceId) {
        buildCommand
        startCommand
        rootDirectory
        healthcheckPath
        builder
      }
    }
  `, { environmentId: ENV_ID, serviceId: DASHBOARD_ID });
  console.log("Dashboard instance:", JSON.stringify(dashInstance.data, null, 2));

  // Now let's also fix the Postgres situation.
  // The raw Docker postgres doesn't expose DATABASE_URL.
  // We need to set up proper postgres variables and construct DATABASE_URL ourselves.
  // First, let's set POSTGRES_USER and POSTGRES_PASSWORD on the postgres service
  console.log("\n=== Setting up Postgres credentials ===");
  const pgPassword = "pg_" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const setPgVars = await railwayAPI(`
    mutation($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }
  `, {
    input: {
      projectId: PROJECT_ID,
      environmentId: ENV_ID,
      serviceId: DB_ID,
      variables: {
        POSTGRES_DB: "railway",
        POSTGRES_USER: "postgres",
        POSTGRES_PASSWORD: pgPassword,
        PGDATA: "/var/lib/postgresql/data/pgdata",
        DATABASE_URL: `postgresql://postgres:${pgPassword}@postgres.railway.internal:5432/railway`
      }
    }
  });
  console.log("Postgres vars set:", setPgVars.errors ? JSON.stringify(setPgVars.errors) : "OK");

  // Now update server DATABASE_URL to point to postgres internal URL
  console.log("\n=== Updating Server DATABASE_URL ===");
  const setServerDb = await railwayAPI(`
    mutation($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }
  `, {
    input: {
      projectId: PROJECT_ID,
      environmentId: ENV_ID,
      serviceId: SERVER_ID,
      variables: {
        DATABASE_URL: `postgresql://postgres:${pgPassword}@postgres.railway.internal:5432/railway`
      }
    }
  });
  console.log("Server DATABASE_URL set:", setServerDb.errors ? JSON.stringify(setServerDb.errors) : "OK");

  // Trigger redeployments
  console.log("\n=== Triggering Server redeployment ===");
  const redeployServer = await railwayAPI(`
    mutation($serviceId: String!, $environmentId: String!) {
      serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
    }
  `, { serviceId: SERVER_ID, environmentId: ENV_ID });
  console.log("Server redeploy:", redeployServer.errors ? JSON.stringify(redeployServer.errors) : "OK");

  console.log("\n=== Triggering Dashboard redeployment ===");
  const redeployDash = await railwayAPI(`
    mutation($serviceId: String!, $environmentId: String!) {
      serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
    }
  `, { serviceId: DASHBOARD_ID, environmentId: ENV_ID });
  console.log("Dashboard redeploy:", redeployDash.errors ? JSON.stringify(redeployDash.errors) : "OK");

  console.log("\n=== Done! Waiting for builds... ===");
  console.log("Server URL: https://server-production-19e5.up.railway.app");
  console.log("Dashboard URL: https://dashboard-production-a138.up.railway.app");
  console.log(`Postgres password: ${pgPassword}`);
}

main().catch(console.error);
