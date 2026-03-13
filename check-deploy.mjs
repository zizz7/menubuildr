import https from 'https';

const query = JSON.stringify({
  query: `{
    deployments(first: 4, input: {
      projectId: "91b0d3de-ddfc-4e11-b697-9ac0951ea7dd",
      environmentId: "7a481a98-7346-431c-b9a0-5db1de9b9790"
    }) {
      edges {
        node {
          id
          status
          service { name }
          createdAt
        }
      }
    }
  }`
});

const options = {
  hostname: 'backboard.railway.app',
  path: '/graphql/v2',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer c9ac3218-98bc-43cf-850a-0713d7fd05b3'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    const edges = result.data?.deployments?.edges || [];
    edges.forEach(e => {
      const d = e.node;
      console.log(`${d.service?.name} | ${d.status} | ${d.createdAt}`);
    });
  });
});
req.write(query);
req.end();
