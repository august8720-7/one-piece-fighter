param(
    [Parameter(Mandatory=$true,Position=0)][string]$Program,
    [Parameter(ValueFromRemainingArguments=$true)][string[]]$CommandArguments
)
$ErrorActionPreference = 'Stop'
$projectRootD = $PSScriptRoot
if (![System.IO.Path]::GetFullPath($projectRootD).StartsWith('D:\',[System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Run the active D-drive workspace only.'
}
$taskCacheD = 'D:/one-piece-fighter-crossover-0922/tools/cache1013'
$taskEnvD = @{
    TEMP='temp'; TMP='temp'; TMPDIR='temp'; npm_config_cache='npm'; UV_CACHE_DIR='uv'; PIP_CACHE_DIR='pip';
    HF_HOME='huggingface'; TORCH_HOME='torch'; CUDA_CACHE_PATH='cuda'; TRITON_CACHE_DIR='triton';
    NUMBA_CACHE_DIR='numba'; GRADIO_TEMP_DIR='gradio'; PYTHONPYCACHEPREFIX='python'; XDG_CACHE_HOME='general';
    HF_HUB_CACHE='huggingface/hub'; HUGGINGFACE_HUB_CACHE='huggingface/hub'; HF_ASSETS_CACHE='huggingface/assets';
    TORCHINDUCTOR_CACHE_DIR='torchinductor'; MPLCONFIGDIR='matplotlib'
}
foreach($entryD in $taskEnvD.GetEnumerator()) {
    $pathD = Join-Path $taskCacheD $entryD.Value
    New-Item -ItemType Directory -Path $pathD -Force | Out-Null
    [Environment]::SetEnvironmentVariable($entryD.Key,$pathD,'Process')
}
$env:PYTHONDONTWRITEBYTECODE='1'
$env:PYTHONUTF8='1'
$env:GRADIO_ANALYTICS_ENABLED='False'
Set-Location -LiteralPath $projectRootD
& $Program @CommandArguments
exit $LASTEXITCODE
