const TOKEN = "c9ac3218-98bc-43cf-850a-0713d7fd05b3";
const ENDPOINT = "https://backboard.railway.com/graphql/v2";
const PROJECT_ID = "91b0d3de-ddfc-4e11-b697-9ac0951ea7dd";
const ENV_ID = "7a481a98-7346-431c-b9a0-5db1de9b9790";
const SERVER_ID = "c86c866e-c968-4f24-9e34-c5cbf52db095";
const DASHBOARD_ID = "d04dcdd9-2e78-427f-b93c-4aee1662c3d7";

async function railwayAPI(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error("API Error:", JSON.stringify(json.errors, null, 2));
  }
  return json;
}

async function main() {
  // Step 1: Introspect serviceInstanceUpdate
  console.log("=== Introspecting serviceInstanceUpdate ===");
  const intro = await railwayAPI(`{
    __type(name: "Mutation") {
      fields {
        name
        args { name type { name kind ofType { name kind } } }
      }
    }
  }`);
  const siuField = intro.data.__type.fields.find(f => f.name === "serviceInstanceUpdate");
  if (siuField) {
    console.log("serviceInstanceUpdate args:", JSON.stringify(siuField.args, null, 2));
  }

  // Step 2: Introspect ServiceInstanceUpdateInput
  console.log("\n=== Introspecting ServiceInstanceUpdateInput ===");
  const siuInput = await railwayAPI(`{
    __type(name: "ServiceInstanceUpdateInput") {
      inputFields { name type { name kind ofType { name kind } } }
    }
  }`);
  if (siuInput.data?.__type) {
    console.log("Fields:", siuInput.data.__type.inputFields.map(f => 
      `${f.name}: ${f.type.name || f.type.kind + ' of ' + (f.type.ofType?.name || '?')}`
    ).join('\n  '));
  }

  // Step 3: Try to configure server with correct mutation format
  console.log("\n=== Configuring Server service ===");
  const configServer = await railwayAPI(`
    mutation($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
      serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
    }
  `, {
    serviceId: SERVER_ID,
    environmentId: ENV_ID,
    input: {
      buildCommand: "npm install && npx prisma generate && npm run build",
      startCommand: "npx prisma migrate deploy && node dist/server.js",
      healthcheckPath: "/api/health",
      rootDirectory: "/server",
    }
  });
  console.log("Server config result:", JSON.stringify(configServer, null, 2));

  // Step 4: Configure dashboard
  console.log("\n=== Configuring Dashboard service ===");
  const configDash = await railwayAPI(`
    mutation($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
      serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
    }
  `, {
    serviceId: DASHBOARD_ID,
    environmentId: ENV_ID,
    input: {
      buildCommand: "npm install && npm run build",
      startCommand: "node .next/standalone/server.js",
      rootDirectory: "/dashboard",
    }
  });
  console.log("Dashboard config result:", JSON.stringify(configDash, null, 2));
}

main().catch(console.error);
