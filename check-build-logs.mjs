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
  const deployId = '0deeb0de'; // Latest failed dashboard deploy
  
  // Get full deployment ID first
  const dashServiceId = 'd04dcdd9-2e78-427f-b93c-4aee1662c3d7';
  const envId = '7a481a98-7346-431c-b9a0-5db1de9b9790';
  
  const result = await query(`query($serviceId: String!, $envId: String!) { 
    deployments(input: { serviceId: $serviceId, environmentId: $envId }, first: 1) { 
      edges { node { id status } } 
    } 
  }`, { serviceId: dashServiceId, envId });
  
  const fullId = result.data?.deployments?.edges?.[0]?.node?.id;
  console.log('Full deploy ID:', fullId);
  
  // Get build logs
  const logs = await query(`query($deploymentId: String!) {
    buildLogs(deploymentId: $deploymentId, limit: 100) {
      message
      timestamp
    }
  }`, { deploymentId: fullId });
  
  if (logs.data?.buildLogs) {
    for (const log of logs.data.buildLogs) {
      console.log(log.message);
    }
  } else {
    console.log('No build logs found:', JSON.stringify(logs));
  }
}
main().catch(console.error);
