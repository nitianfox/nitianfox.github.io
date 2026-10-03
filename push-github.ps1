# ============================================================
#  把 NTFOX 推送到你自己的 GitHub 仓库
#  用法（在 D:\NTFOX 下，仓库要先在 GitHub 网页上建好、不要勾 README）：
#      .\push-github.ps1 -Repo https://github.com/你的用户名/ntfox.git
#      .\push-github.ps1 -Repo https://github.com/你的用户名/ntfox.git -Proxy http://127.0.0.1:7890
#  脚本会：① 解除 hosts 里的 github 黑洞（需要点一次 UAC）② 设置 remote ③ 推送
# ============================================================
param(
    [Parameter(Mandatory = $true)][string]$Repo,
    [string]$Proxy = 'http://127.0.0.1:7890'
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$hosts = "$env:SystemRoot\System32\drivers\etc\hosts"

Write-Host '=== 1/4 检查 hosts 黑洞 ===' -ForegroundColor Cyan
$content = Get-Content -LiteralPath $hosts -Raw
if ($content -match '(?m)^\s*127\.0\.0\.1\s+github\.com\s*$') {
    Write-Host '  发现 127.0.0.1 github.com，正在提权清理（会弹 UAC，请点“是”）…'
    $backup = "$hosts.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"
    Copy-Item -LiteralPath $hosts -Destination $backup -Force
    $lines = @(
        'github.com', 'api.github.com', 'codeload.github.com', 'raw.githubusercontent.com',
        'githubusercontent.com', 'raw.github.com', 'objects.githubusercontent.com',
        'camo.githubusercontent.com', 'avatars.githubusercontent.com', 'gist.github.com',
        'github.io', 'www.github.io', 'pages.github.com', 'githubapp.com', 'github.dev'
    )
    $script = @"
`$p = '$hosts'
`$t = [System.IO.File]::ReadAllText(`$p)
foreach (`$d in @($($lines | ForEach-Object { "'$_'" } | Join-String -Separator ','))) {
    `$t = [regex]::Replace(`$t, '(?m)^\s*127\.0\.0\.1\s+' + [regex]::Escape(`$d) + '\s*\r?\n?', '')
}
[System.IO.File]::WriteAllText(`$p, `$t, (New-Object System.Text.UTF8Encoding(`$false)))
"@
    $tmp = Join-Path $env:TEMP 'ntfox-unblock-hosts.ps1'
    Set-Content -LiteralPath $tmp -Value $script -Encoding UTF8
    Start-Process pwsh -Verb RunAs -Wait -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $tmp
    Write-Host "  已清理（原文件备份在 $backup）"
} else {
    Write-Host '  hosts 正常，无需处理'
}

Write-Host '=== 2/4 检查代理 ===' -ForegroundColor Cyan
$proxyAlive = $false
try {
    $c = New-Object System.Net.Sockets.TcpClient
    $c.Connect('127.0.0.1', ([int]([uri]$Proxy).Port)); $proxyAlive = $c.Connected; $c.Close()
} catch { $proxyAlive = $false }
if ($proxyAlive) {
    Write-Host "  代理 $Proxy 可用，推送时走它"
    $gitProxy = @('-c', "http.proxy=$Proxy", '-c', "https.proxy=$Proxy")
} else {
    Write-Host '  ⚠ 代理没在跑（FlClash 在 C:\Program Files\FlClash）。' -ForegroundColor Yellow
    Write-Host '    可以先去启动它并开启系统代理，再重跑本脚本；也可以直接试直连。' -ForegroundColor Yellow
    $gitProxy = @()
}

Write-Host '=== 3/4 设置 remote ===' -ForegroundColor Cyan
git remote remove origin 2>$null
git remote add origin $Repo
git remote -v | ForEach-Object { "  $_" }

Write-Host '=== 4/4 推送（首次会弹 GitHub 登录）===' -ForegroundColor Cyan
git push @gitProxy -u origin main
if ($LASTEXITCODE -ne 0) { throw '推送失败：检查仓库地址、登录状态与网络' }

Write-Host ''
Write-Host '完成！代码已经在你的 GitHub 仓库里了。' -ForegroundColor Green
Write-Host '下一步可以：把仓库连到 Cloudflare Pages（构建命令 pnpm build、输出目录 dist），或用 .\deploy.ps1 直接上传。'
