$token = "c9ac3218-98bc-43cf-850a-0713d7fd05b3"
$endpoint = "https://backboard.railway.com/graphql/v2"
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

$projectId = "91b0d3de-ddfc-4e11-b697-9ac0951ea7dd"
$envId = "7a481a98-7346-431c-b9a0-5db1de9b9790"
$serverServiceId = "c86c866e-c968-4f24-9e34-c5cbf52db095"
$dashboardServiceId = "d04dcdd9-2e78-427f-b93c-4aee1662c3d7"

function Invoke-RailwayAPI($query, $variables = @{}) {
    $body = @{ query = $query; variables = $variables } | ConvertTo-Json -Depth 10 -Compress
    try {
        $resp = Invoke-WebRequest -Uri $endpoint -Method Post -Headers $headers -Body $body -UseBasicParsing
        return ($resp.Content | ConvertFrom-Json)
    } catch {
        $errMsg = $_.ErrorDetails.Message
        if ($errMsg) { Write-Host "HTTP Error: $errMsg" -ForegroundColor Red }
        else { Write-Host "HTTP Error: $_" -ForegroundColor Red }
        return $null
    }
}

# First, let's introspect serviceInstanceUpdate to see the correct signature
Write-Host "=== Checking serviceInstanceUpdate signature ===" -ForegroundColor Cyan
$introQuery = '{ __type(name: "Mutation") { fields { name args { name type { name kind ofType { name kind } } } } } }'
$intro = Invoke-RailwayAPI $introQuery
if ($intro.data) {
    $siuField = $intro.data.__type.fields | Where-Object { $_.name -eq "serviceInstanceUpdate" }
    if ($siuField) {
        Write-Host "serviceInstanceUpdate args:"
        foreach ($arg in $siuField.args) {
            $typeName = if ($arg.type.name) { $arg.type.name } elseif ($arg.type.ofType) { "$($arg.type.kind) of $($arg.type.ofType.name)" } else { $arg.type.kind }
            Write-Host "  - $($arg.name): $typeName"
        }
    }
    
    # Also check serviceConnect mutation
    $scField = $intro.data.__type.fields | Where-Object { $_.name -eq "serviceConnect" }
    if ($scField) {
        Write-Host "`nserviceConnect args:"
        foreach ($arg in $scField.args) {
            $typeName = if ($arg.type.name) { $arg.type.name } elseif ($arg.type.ofType) { "$($arg.type.kind) of $($arg.type.ofType.name)" } else { $arg.type.kind }
            Write-Host "  - $($arg.name): $typeName"
        }
    }
} else {
    Write-Host "Introspection failed: $($intro.errors | ConvertTo-Json -Depth 5)" -ForegroundColor Red
}

# Let's also check ServiceInstanceUpdateInput fields
Write-Host "`n=== Checking ServiceInstanceUpdateInput fields ===" -ForegroundColor Cyan
$inputType = Invoke-RailwayAPI '{ __type(name: "ServiceInstanceUpdateInput") { inputFields { name type { name kind ofType { name kind } } } } }'
if ($inputType.data -and $inputType.data.__type) {
    Write-Host "ServiceInstanceUpdateInput fields:"
    foreach ($f in $inputType.data.__type.inputFields) {
        $typeName = if ($f.type.name) { $f.type.name } elseif ($f.type.ofType) { "$($f.type.kind) of $($f.type.ofType.name)" } else { $f.type.kind }
        Write-Host "  - $($f.name): $typeName"
    }
}

# Check ServiceSourceInput
Write-Host "`n=== Checking ServiceSourceInput fields ===" -ForegroundColor Cyan
$srcType = Invoke-RailwayAPI '{ __type(name: "ServiceSourceInput") { inputFields { name type { name kind ofType { name kind } } } } }'
if ($srcType.data -and $srcType.data.__type) {
    Write-Host "ServiceSourceInput fields:"
    foreach ($f in $srcType.data.__type.inputFields) {
        $typeName = if ($f.type.name) { $f.type.name } elseif ($f.type.ofType) { "$($f.type.kind) of $($f.type.ofType.name)" } else { $f.type.kind }
        Write-Host "  - $($f.name): $typeName"
    }
} else {
    Write-Host "ServiceSourceInput not found"
}
