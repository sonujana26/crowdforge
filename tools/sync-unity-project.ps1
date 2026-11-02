param([Parameter(Mandatory = $true)][string]$Project)
$ErrorActionPreference = 'Stop'
$forgeRoot = Split-Path -Parent $PSScriptRoot
$forgeSource = Join-Path $forgeRoot 'unity\CrowdForge\Assets'
$forgeTargetProject = (Resolve-Path -LiteralPath $Project).Path
if (-not (Test-Path -LiteralPath (Join-Path $forgeTargetProject 'ProjectSettings\ProjectVersion.txt'))) {
    throw 'The destination must be an existing Unity project.'
}
$forgePackages = Get-Content -LiteralPath (Join-Path $forgeTargetProject 'Packages\manifest.json') -Raw | ConvertFrom-Json
if (-not $forgePackages.dependencies.'com.unity.render-pipelines.universal' -or -not $forgePackages.dependencies.'com.unity.inputsystem') {
    throw 'The target project needs URP and Input System. Its package settings were not changed.'
}
$forgeTarget = Join-Path $forgeTargetProject 'Assets\CrowdForge'
if ((Test-Path -LiteralPath $forgeTarget) -and -not (Test-Path -LiteralPath (Join-Path $forgeTarget 'CrowdForge-source.txt'))) {
    throw 'Assets/CrowdForge already exists without the sync marker. Inspect it before copying.'
}
New-Item -ItemType Directory -Force -Path $forgeTarget | Out-Null
foreach ($forgeFolder in @('Scripts', 'Editor', 'Plugins', 'Resources', 'Scenes')) {
    $forgeDirectory = Join-Path $forgeSource $forgeFolder
    if (Test-Path -LiteralPath $forgeDirectory) {
        Copy-Item -LiteralPath $forgeDirectory -Destination $forgeTarget -Recurse -Force
        $forgeMeta = $forgeDirectory + '.meta'
        if (Test-Path -LiteralPath $forgeMeta) { Copy-Item -LiteralPath $forgeMeta -Destination $forgeTarget -Force }
    }
}
Copy-Item -LiteralPath (Join-Path $forgeSource 'link.xml') -Destination $forgeTarget -Force
Set-Content -LiteralPath (Join-Path $forgeTarget 'CrowdForge-source.txt') -Value "Source: $forgeRoot\unity\CrowdForge`nSync only this directory; existing project settings and sample scenes are preserved."
Write-Output "CrowdForge source copied to $forgeTarget. Open CrowdForge > Open arena scene, then Play."
