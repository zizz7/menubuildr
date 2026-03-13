const RAILWAY_TOKEN = 'c9ac3218-98bc-43cf-850a-0713d7fd05b3';

async function query(q, vars = {}) {
  const res = await fetch('https://backboard.railway.com/graphql/v2', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RAILWAY_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, variables: vars })
  });
  return res.json();
}

async function main() {
  const serverServiceId = 'c86c866e-c968-4f24-9e34-c5cbf52db095';
  const dashServiceId = 'd04dcdd9-2e78-427f-b93c-4aee1662c3d7';
  const envId = '7a481a98-7346-431c-b9a0-5db1de9b9790';
  
  for (const [name, id] of [['Server', serverServiceId], ['Dashboard', dashServiceId]]) {
    const result = await query(`query($serviceId: String!, $envId: String!) { 
      deployments(input: { serviceId: $serviceId, environmentId: $envId }, first: 3) { 
        edges { node { id status createdAt } } 
      } 
    }`, { serviceId: id, envId });
    const deploys = result.data?.deployments?.edges;
    if (deploys && deploys.length > 0) {
      for (const edge of deploys) {
        const d = edge.node;
        console.log(`${name}: ${d.status} (created: ${d.createdAt}, id: ${d.id.substring(0,8)})`);
      }
    } else {
      console.log(`${name}: no deployments found`, JSON.stringify(result));
    }
  }
}
main().catch(console.error);
