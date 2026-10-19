$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$candidateRoot = 'D:/one-piece-fighter-crossover-0922/roster-0929/six-game1014/candidate/six-delivery1017-20261017T085518801664Z'
$site = [System.IO.Path]::GetFullPath($candidateRoot + '/package/2026-10-17T09-05-09-094Z/site')
$expectedVersion = '8748810e5251b0493455bc8b516d8223bce448b5b2f777597f551e7243bb94f9'
$port = 4360
$url = 'http://127.0.0.1:4360/?art=anime&scope=full&quality=high'

function Assert-ServingPackage {
    $received = Invoke-RestMethod -Uri "http://127.0.0.1:$port/delivery-build.json" -TimeoutSec 5
    if ($received.version -ne $expectedVersion) { throw 'Port 4360 returned a different package version. No process was stopped.' }
}

try {
    $localReceipt = Get-Content -Raw -LiteralPath (Join-Path $site 'delivery-build.json') | ConvertFrom-Json
    if ($localReceipt.version -ne $expectedVersion -or !(Test-Path -LiteralPath (Join-Path $site 'index.html'))) {
        throw 'The frozen six-person package is missing or has a different version. Do not rebuild or replace it through this launcher.'
    }
    $listeners = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
    if ($listeners.Count -gt 0) {
        $owners = @($listeners.OwningProcess | Select-Object -Unique)
        if ($owners.Count -ne 1 -or @($listeners | Where-Object LocalAddress -ne '127.0.0.1').Count -gt 0) {
            throw 'Port 4360 is occupied by an unexpected service or non-loopback listener. No process was stopped.'
        }
        $owner = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $owners[0])
        $line = [string]$owner.CommandLine
        $directory = [regex]::Match($line, '(?:^|\s)--directory(?:\s+|=)(?:"([^"]+)"|(\S+))')
        $servedRoot = if ($directory.Groups[1].Success) { $directory.Groups[1].Value } else { $directory.Groups[2].Value }
        if ($owner.Name -notmatch '^python(?:\d+(?:\.\d+)*)?\.exe$' -or $line -notmatch '(?:^|\s)-m\s+http\.server\s+4360(?:\s|$)' -or !$directory.Success -or
            ![string]::Equals([System.IO.Path]::GetFullPath($servedRoot).TrimEnd([char]'\'), $site, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Port 4360 belongs to PID $($owners[0]) and is not this exact frozen package directory. No process was stopped."
        }
        Assert-ServingPackage
        Write-Host "Reusing same-directory local six-person service, PID $($owners[0])."
        Write-Host "Local candidate only; mix feedback/public release remain separate. $url"
        exit 0
    }

    # The .cmd enters through run-d1013.ps1; retain its D-only cache environment.
    if (!$env:TEMP -or ![System.IO.Path]::GetFullPath($env:TEMP).StartsWith('D:\', [System.StringComparison]::OrdinalIgnoreCase)) {
        throw 'Run through the six-person .cmd launcher or run-d1013.ps1 so task caches remain on D.'
    }
    $logs = Join-Path $candidateRoot 'launcher-logs'
    New-Item -ItemType Directory -Path $logs -Force | Out-Null
    $note = Join-Path $logs 'README.md'
    if (!(Test-Path -LiteralPath $note)) { Set-Content -LiteralPath $note -Encoding UTF8 -Value '# Six-person local launcher logs1017: unique stdout/stderr and process receipts; no browser opening, no publication, no cleanup.' }
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-ffff'
    $stdout = Join-Path $logs ($stamp + '-stdout.log')
    $stderr = Join-Path $logs ($stamp + '-stderr.log')
    $python = (Get-Command python -CommandType Application | Select-Object -First 1).Source
    $service = Start-Process -FilePath $python -ArgumentList @('-u','-m','http.server',"$port",'--bind','127.0.0.1','--directory',('"' + $site + '"')) -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if ($service.HasExited) { throw "Local service exited. See $stderr" }
        try { Assert-ServingPackage; $ready = $true; break } catch { Start-Sleep -Milliseconds 200 }
    }
    if (!$ready) { throw "Local service did not become ready. See $stderr. No existing process was stopped." }
    $bound = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop)
    if (@($bound | Where-Object { $_.OwningProcess -ne $service.Id -or $_.LocalAddress -ne '127.0.0.1' }).Count -gt 0) {
        throw 'Port 4360 changed owner while starting. No existing process was stopped.'
    }
    @{ pid=$service.Id; site=$site; version=$expectedVersion; url=$url; stdout=$stdout; stderr=$stderr; browserOpened=$false; publicPublished=$false } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $logs ($stamp + '-service.json')) -Encoding UTF8
    Write-Host "Started hidden loopback-only local service, PID $($service.Id)."
    Write-Host "Local candidate only; mix feedback/public release remain separate. $url"
    Write-Host "Logs: $logs"
} catch {
    Write-Error $_
    exit 1
}
