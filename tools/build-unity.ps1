param([string]$Editor = $env:UNITY_EDITOR)
$ErrorActionPreference = 'Stop'
if (-not $Editor -or -not (Test-Path -LiteralPath $Editor -PathType Leaf)) {
    throw 'Set UNITY_EDITOR to your installed Unity 6 Editor\Unity.exe. Web Build Support and an activated license are required.'
}
$forgeRoot = Split-Path -Parent $PSScriptRoot
$forgeProject = Join-Path $forgeRoot 'unity\CrowdForge'
$forgeLog = Join-Path $forgeRoot 'unity\build.log'
$unityBuild = Start-Process -FilePath $Editor -ArgumentList @('-batchmode', '-quit', '-buildTarget', 'WebGL', '-projectPath', ('"{0}"' -f $forgeProject), '-executeMethod', 'CrowdForge.Editor.ForgeBuild.Web', '-logFile', ('"{0}"' -f $forgeLog)) -WindowStyle Hidden -PassThru -Wait
if ($unityBuild.ExitCode -ne 0) { throw "Unity exited with code $($unityBuild.ExitCode). Inspect $forgeLog if present; otherwise verify installation and license setup." }
node (Join-Path $PSScriptRoot 'stage-unity.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Unity artifact staging failed.' }
