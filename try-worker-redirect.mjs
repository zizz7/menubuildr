const CF_TOKEN = "4z18boNVN8RCCEgTHHLJWRuLe4yhNe51V38vqI7r";
const CF_ZONE_ID = "db27fa7e0a03291dbc03565b187a613c";
const CF_API = "https://api.cloudflare.com/client/v4";

async function cfAPI(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: { "Authorization": `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${CF_API}${path}`, opts);
  return res.json();
}

async function main() {
  // Check what API permissions we have
  console.log("=== Checking API Token Permissions ===");
  const verify = await cfAPI("/user/tokens/verify");
  console.log("Token verify:", JSON.stringify(verify, null, 2));

  // Try to create a redirect rule using the newer Redirect Rules API
  console.log("\n=== Trying Redirect Rules (Single Redirects) ===");
  const redirectRule = await cfAPI(`/zones/${CF_ZONE_ID}/rulesets/phases/http_request_dynamic_redirect/entrypoint`, "PUT", {
    rules: [
      {
        expression: '(http.host eq "menubuildr.com")',
        description: "Redirect menubuildr.com to app.menubuildr.com",
        action: "redirect",
        action_parameters: {
          from_value: {
            status_code: 301,
            target_url: {
              expression: 'concat("https://app.menubuildr.com", http.request.uri.path)'
            },
            preserve_query_string: true
          }
        }
      }
    ]
  });
  console.log("Redirect Rule result:", JSON.stringify(redirectRule, null, 2));
}
main().catch(console.error);
