$token = "c9ac3218-98bc-43cf-850a-0713d7fd05b3"
$endpoint = "https://backboard.railway.com/graphql/v2"
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

function Invoke-RailwayAPI($query, $variables = @{}) {
    $body = @{ query = $query; variables = $variables } | ConvertTo-Json -Depth 10 -Compress
    try {
        $resp = Invoke-WebRequest -Uri $endpoint -Method Post -Headers $headers -Body $body -UseBasicParsing
        return ($resp.Content | ConvertFrom-Json)
    } catch {
        Write-Host "HTTP Error response: $($_.ErrorDetails.Message)" -ForegroundColor Red
        return $null
    }
}

# Try different workspace queries
Write-Host "=== Try 1: me with workspaces ===" -ForegroundColor Cyan
$r1 = Invoke-RailwayAPI '{ me { id name workspaces { id name } } }'
Write-Host ($r1 | ConvertTo-Json -Depth 10)

Write-Host "`n=== Try 2: externalWorkspaces ===" -ForegroundColor Cyan
$r2 = Invoke-RailwayAPI '{ externalWorkspaces { id name } }'
Write-Host ($r2 | ConvertTo-Json -Depth 10)
