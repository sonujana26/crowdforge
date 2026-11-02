param([string]$Editor = $env:UNITY_EDITOR)
$ErrorActionPreference = 'Stop'
if (-not $Editor -or -not (Test-Path -LiteralPath $Editor -PathType Leaf)) { throw 'Set UNITY_EDITOR to Unity 6 Editor\Unity.exe.' }
$forgeRoot = Split-Path -Parent $PSScriptRoot
$forgeProject = Join-Path $forgeRoot 'unity\CrowdForge'
$forgeLog = Join-Path $forgeRoot 'unity\checks.log'
$forgeChecks = Start-Process -FilePath $Editor -ArgumentList @('-batchmode', '-projectPath', ('"{0}"' -f $forgeProject), '-executeMethod', 'CrowdForge.Editor.ForgeChecks.Run', '-logFile', ('"{0}"' -f $forgeLog)) -WindowStyle Hidden -PassThru
if (-not $forgeChecks.WaitForExit(240000)) { $forgeChecks.Kill(); throw 'Unity checks exceeded four minutes. Inspect unity/checks.log.' }
if ($forgeChecks.ExitCode -ne 0) { throw "Unity checks failed: $($forgeChecks.ExitCode). Inspect unity/checks.log." }
Get-Content -LiteralPath (Join-Path $forgeRoot 'unity\checks-result.json')
