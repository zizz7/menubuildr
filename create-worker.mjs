const CF_TOKEN = "4z18boNVN8RCCEgTHHLJWRuLe4yhNe51V38vqI7r";
const CF_ACCOUNT_ID = "64580b14f8214492cd3b62346cab9ec2";
const CF_ZONE_ID = "db27fa7e0a03291dbc03565b187a613c";
const CF_API = "https://api.cloudflare.com/client/v4";

const WORKER_SCRIPT = `
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Rewrite the host to app.menubuildr.com
  url.hostname = 'app.menubuildr.com'
  
  // Fetch from the origin (app.menubuildr.com)
  const originRequest = new Request(url.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'manual',
  })
  
  const response = await fetch(originRequest)
  
  // Return the response as-is
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}
`;

async function main() {
  // Step 1: Create/update the Worker script
  console.log("=== Creating Worker: menubuildr-landing ===");
  const formData = new FormData();
  formData.append('script', new Blob([WORKER_SCRIPT], { type: 'application/javascript' }), 'worker.js');
  formData.append('metadata', new Blob([JSON.stringify({
    main_module: 'worker.js',
    compatibility_date: '2024-01-01',
  })], { type: 'application/json' }));

  const workerRes = await fetch(
    `${CF_API}/accounts/${CF_ACCOUNT_ID}/workers/scripts/menubuildr-landing`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${CF_TOKEN}` },
      body: formData,
    }
  );
  const workerData = await workerRes.json();
  console.log("Worker create:", JSON.stringify(workerData, null, 2));

  if (!workerData.success) {
    // Try service worker format instead of module
    console.log("\nTrying service worker format...");
    const res2 = await fetch(
      `${CF_API}/accounts/${CF_ACCOUNT_ID}/workers/scripts/menubuildr-landing`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${CF_TOKEN}`,
          'Content-Type': 'application/javascript',
        },
        body: WORKER_SCRIPT,
      }
    );
    const data2 = await res2.json();
    console.log("Worker create (v2):", JSON.stringify(data2, null, 2));
    if (!data2.success) return;
  }

  // Step 2: Create a Worker Route for menubuildr.com/*
  console.log("\n=== Creating Worker Route ===");
  const routeRes = await fetch(`${CF_API}/zones/${CF_ZONE_ID}/workers/routes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pattern: 'menubuildr.com/*',
      script: 'menubuildr-landing',
    }),
  });
  const routeData = await routeRes.json();
  console.log("Route create:", JSON.stringify(routeData, null, 2));
}
main().catch(console.error);
