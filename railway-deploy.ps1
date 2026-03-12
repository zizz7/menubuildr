$token = "c9ac3218-98bc-43cf-850a-0713d7fd05b3"
$endpoint = "https://backboard.railway.com/graphql/v2"
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
$workspaceId = "42ff1212-c6cf-4b2f-89e0-5cced0bb51ad"

function Invoke-RailwayAPI($query, $variables = @{}) {
    $body = @{ query = $query; variables = $variables } | ConvertTo-Json -Depth 10 -Compress
    try {
        $resp = Invoke-WebRequest -Uri $endpoint -Method Post -Headers $headers -Body $body -UseBasicParsing
        return ($resp.Content | ConvertFrom-Json)
    } catch {
        $errMsg = $_.ErrorDetails.Message
        if ($errMsg) {
            Write-Host "HTTP Error: $errMsg" -ForegroundColor Red
        } else {
            Write-Host "HTTP Error: $_" -ForegroundColor Red
        }
        return $null
    }
}

# ============================================================
# Step 1: Create project
# ============================================================
Write-Host "=== Step 1: Creating project ===" -ForegroundColor Cyan
$createProject = Invoke-RailwayAPI 'mutation($input: ProjectCreateInput!) { projectCreate(input: $input) { id name environments { edges { node { id name } } } } }' @{
    input = @{
        name = "menubuildr"
        workspaceId = $workspaceId
    }
}
if ($createProject.errors) {
    Write-Host "Error: $($createProject.errors | ConvertTo-Json -Depth 5)" -ForegroundColor Red
    exit 1
}
$projectId = $createProject.data.projectCreate.id
Write-Host "Project ID: $projectId"

# Get environment ID
$envEdges = $createProject.data.projectCreate.environments.edges
if ($envEdges -and $envEdges.Count -gt 0) {
    $envId = $envEdges[0].node.id
    Write-Host "Environment ID: $envId"
} else {
    # Fallback: query environments
    Write-Host "No environments in response, querying..." -ForegroundColor Yellow
    $envResult = Invoke-RailwayAPI 'query($id: String!) { project(id: $id) { environments { edges { node { id name } } } } }' @{ id = $projectId }
    $envId = $envResult.data.project.environments.edges[0].node.id
    Write-Host "Environment ID: $envId"
}

# ============================================================
# Step 2: Add PostgreSQL plugin/service
# ============================================================
Write-Host "`n=== Step 2: Adding PostgreSQL ===" -ForegroundColor Cyan
$createDb = Invoke-RailwayAPI 'mutation($input: ServiceCreateInput!) { serviceCreate(input: $input) { id name } }' @{
    input = @{
        projectId = $projectId
        name = "postgres"
        source = @{ image = "ghcr.io/railwayapp-templates/postgres-ssl:16" }
    }
}
if ($createDb.errors) {
    Write-Host "DB error: $($createDb.errors | ConvertTo-Json -Depth 5)" -ForegroundColor Red
    exit 1
}
$dbServiceId = $createDb.data.serviceCreate.id
Write-Host "PostgreSQL service: $dbServiceId"

# Set Postgres variables
Write-Host "Setting PostgreSQL variables..."
$pgVars = @{
    POSTGRES_DB = "railway"
    PGDATA = "/var/lib/postgresql/data/pgdata"
}
$setPgVars = Invoke-RailwayAPI 'mutation($input: VariableCollectionUpsertInput!) { variableCollectionUpsert(input: $input) }' @{
    input = @{
        projectId = $projectId
        environmentId = $envId
        serviceId = $dbServiceId
        variables = $pgVars
    }
}
if ($setPgVars.errors) {
    Write-Host "PG vars error: $($setPgVars.errors | ConvertTo-Json -Depth 5)" -ForegroundColor Red
}

# Add volume for postgres data
Write-Host "Adding volume for PostgreSQL data..."
$createVol = Invoke-RailwayAPI 'mutation($input: VolumeCreateInput!) { volumeCreate(input: $input) { id name } }' @{
    input = @{
        projectId = $projectId
        environmentId = $envId
        serviceId = $dbServiceId
        mountPath = "/var/lib/postgresql/data"
        name = "pgdata"
    }
}
if ($createVol.errors) {
    Write-Host "Volume error: $($createVol.errors | ConvertTo-Json -Depth 5)" -ForegroundColor Red
} else {
    Write-Host "Volume created: $($createVol.data.volumeCreate.id)"
}

Write-Host "Waiting 20s for PostgreSQL to start..."
Start-Sleep -Seconds 20

# ============================================================
# Step 3: Create Server service from GitHub
# ============================================================
Write-Host "`n=== Step 3: Creating Server service ===" -ForegroundColor Cyan
$createServer = Invoke-RailwayAPI 'mutation($input: ServiceCreateInput!) { serviceCreate(input: $input) { id name } }' @{
    input = @{
        projectId = $projectId
        name = "server"
        source = @{ repo = "zizz7/menubuildr" }
    }
}
if ($createServer.errors) {
    Write-Host "Server error: $($createServer.errors | ConvertTo-Json -Depth 5)" -ForegroundColor Red
    exit 1
}
$serverServiceId = $createServer.data.serviceCreate.id
Write-Host "Server service: $serverServiceId"

# Configure server service instance
Write-Host "Configuring server service..."
$configServer = Invoke-RailwayAPI 'mutation($input: ServiceInstanceUpdateInput!) { serviceInstanceUpdate(input: $input) }' @{
    input = @{
        serviceId = $serverServiceId
        environmentId = $envId
        source = @{
            repo = "zizz7/menubuildr"
            branch = "main"
            rootDirectory = "/server"
        }
        buildCommand = "npm install && npx prisma generate && npm run build"
        startCommand = "npx prisma migrate deploy && node dist/server.js"
        healthcheckPath = "/api/health"
    }
}
if ($configServer.errors) {
    Write-Host "Server config error: $($configServer.errors | ConvertTo-Json -Depth 5)" -ForegroundColor Red
} else {
    Write-Host "Server configured with root=/server"
}

# ============================================================
# Step 4: Create Dashboard service from GitHub
# ============================================================
Write-Host "`n=== Step 4: Creating Dashboard service ===" -ForegroundColor Cyan
$createDashboard = Invoke-RailwayAPI 'mutation($input: ServiceCreateInput!) { serviceCreate(input: $input) { id name } }' @{
    input = @{
        projectId = $projectId
        name = "dashboard"
        source = @{ repo = "zizz7/menubuildr" }
    }
}
if ($createDashboard.errors) {
    Write-Host "Dashboard error: $($createDashboard.errors | ConvertTo-Json -Depth 5)" -ForegroundColor Red
    exit 1
}
$dashboardServiceId = $createDashboard.data.serviceCreate.id
Write-Host "Dashboard service: $dashboardServiceId"

# Configure dashboard service instance
Write-Host "Configuring dashboard service..."
$configDashboard = Invoke-RailwayAPI 'mutation($input: ServiceInstanceUpdateInput!) { serviceInstanceUpdate(input: $input) }' @{
    input = @{
        serviceId = $dashboardServiceId
        environmentId = $envId
        source = @{
            repo = "zizz7/menubuildr"
            branch = "main"
            rootDirectory = "/dashboard"
        }
        buildCommand = "npm install && npm run build"
        startCommand = "node .next/standalone/server.js"
    }
}
if ($configDashboard.errors) {
    Write-Host "Dashboard config error: $($configDashboard.errors | ConvertTo-Json -Depth 5)" -ForegroundColor Red
} else {
    Write-Host "Dashboard configured with root=/dashboard"
}

# ============================================================
# Step 5: Generate domains
# ============================================================
Write-Host "`n=== Step 5: Generating domains ===" -ForegroundColor Cyan
$serverDomain = Invoke-RailwayAPI 'mutation($input: ServiceDomainCreateInput!) { serviceDomainCreate(input: $input) { domain } }' @{
    input = @{
        serviceId = $serverServiceId
        environmentId = $envId
    }
}
$serverUrl = ""
if ($serverDomain.data) {
    $serverUrl = $serverDomain.data.serviceDomainCreate.domain
    Write-Host "Server domain: https://$serverUrl"
} else {
    Write-Host "Server domain error: $($serverDomain.errors | ConvertTo-Json -Depth 5)" -ForegroundColor Red
}

$dashDomain = Invoke-RailwayAPI 'mutation($input: ServiceDomainCreateInput!) { serviceDomainCreate(input: $input) { domain } }' @{
    input = @{
        serviceId = $dashboardServiceId
        environmentId = $envId
    }
}
$dashUrl = ""
if ($dashDomain.data) {
    $dashUrl = $dashDomain.data.serviceDomainCreate.domain
    Write-Host "Dashboard domain: https://$dashUrl"
} else {
    Write-Host "Dashboard domain error: $($dashDomain.errors | ConvertTo-Json -Depth 5)" -ForegroundColor Red
}

# ============================================================
# Step 6: Set environment variables with actual domains
# ============================================================
Write-Host "`n=== Step 6: Setting environment variables ===" -ForegroundColor Cyan

# Server variables
$serverVars = @{
    PORT = "5000"
    NODE_ENV = "production"
    JWT_SECRET = "menubuildr-jwt-secret-prod-2026-change-me"
    JWT_EXPIRES_IN = "7d"
}
if ($dashUrl) {
    $serverVars["FRONTEND_URL"] = "https://$dashUrl"
}
# Reference postgres DATABASE_URL
$serverVars["DATABASE_URL"] = "`${{postgres.DATABASE_URL}}"

$setServerVars = Invoke-RailwayAPI 'mutation($input: VariableCollectionUpsertInput!) { variableCollectionUpsert(input: $input) }' @{
    input = @{
        projectId = $projectId
        environmentId = $envId
        serviceId = $serverServiceId
        variables = $serverVars
    }
}
if ($setServerVars.errors) {
    Write-Host "Server vars error: $($setServerVars.errors | ConvertTo-Json -Depth 5)" -ForegroundColor Red
} else {
    Write-Host "Server variables set (DATABASE_URL references postgres service)"
}

# Dashboard variables
$dashVars = @{
    PORT = "3000"
}
if ($serverUrl) {
    $dashVars["NEXT_PUBLIC_API_URL"] = "https://$serverUrl/api"
}

$setDashVars = Invoke-RailwayAPI 'mutation($input: VariableCollectionUpsertInput!) { variableCollectionUpsert(input: $input) }' @{
    input = @{
        projectId = $projectId
        environmentId = $envId
        serviceId = $dashboardServiceId
        variables = $dashVars
    }
}
if ($setDashVars.errors) {
    Write-Host "Dashboard vars error: $($setDashVars.errors | ConvertTo-Json -Depth 5)" -ForegroundColor Red
} else {
    Write-Host "Dashboard variables set"
}

# ============================================================
# Summary
# ============================================================
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Project ID:    $projectId"
Write-Host "Environment:   $envId"
Write-Host "PostgreSQL:    $dbServiceId"
Write-Host "Server:        $serverServiceId"
Write-Host "Dashboard:     $dashboardServiceId"
Write-Host ""
if ($serverUrl) { Write-Host "Server URL:    https://$serverUrl" -ForegroundColor Green }
if ($dashUrl) { Write-Host "Dashboard URL: https://$dashUrl" -ForegroundColor Green }
Write-Host ""
Write-Host "REMAINING MANUAL STEPS:" -ForegroundColor Yellow
Write-Host "1. Go to Railway dashboard and add these to the SERVER service:"
Write-Host "   - STRIPE_SECRET_KEY"
Write-Host "   - STRIPE_WEBHOOK_SECRET"
Write-Host "   - STRIPE_PRICE_ID"
Write-Host "   - CLOUDINARY_URL (optional)"
Write-Host "2. Add to DASHBOARD service:"
Write-Host "   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
Write-Host "3. Update JWT_SECRET to a strong random value"
Write-Host "4. Wait for builds to complete (~3-5 min)"
