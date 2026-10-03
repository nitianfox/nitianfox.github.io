# ============================================================
#  一键发布：把 D:\NTFOX 的改动提交并推送到 GitHub（推上去后 Actions 会自动构建上线）
#  用法（在 D:\NTFOX 下）：
#      .\publish.ps1                          # 自动生成提交信息
#      .\publish.ps1 "改了作品集配图"           # 自定义提交信息
#  上线地址：https://nitianfox.github.io/   （推送后约 1-3 分钟生效）
# ============================================================
param(
    [string]$Message = ''
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw '找不到 git' }

# 0) 先看看有没有改动
$changed = git status --porcelain
if (-not $changed) {
    Write-Host '没有需要发布的改动（工作区是干净的）' -ForegroundColor Yellow
    exit 0
}
Write-Host '本次改动：' -ForegroundColor Cyan
$changed | ForEach-Object { "  $_" }

# 1) 提交
if (-not $Message) { $Message = "更新站点内容 ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))" }
git add -A
git -c user.name='NTFOX' -c user.email='1955237273@qq.com' commit -m $Message | Out-Host
if ($LASTEXITCODE -ne 0) { throw '提交失败' }

# 2) 推送（代理活着就走代理，GitHub 直连经常超时）
$proxy = 'http://127.0.0.1:7890'
$alive = $false
try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1', 7890); $alive = $c.Connected; $c.Close() } catch {}
if ($alive) {
    Write-Host "走代理 $proxy 推送…" -ForegroundColor Cyan
    git -c http.proxy=$proxy -c https.proxy=$proxy push
} else {
    Write-Host '代理没开，尝试直连推送（网络不好就去启动 FlClash 再重跑）…' -ForegroundColor Yellow
    git push
}
if ($LASTEXITCODE -ne 0) { throw '推送失败' }

Write-Host ''
Write-Host '已推送。GitHub Actions 会自动构建并部署，约 1-3 分钟后生效：' -ForegroundColor Green
Write-Host '  https://nitianfox.github.io/'
Write-Host '（在 GitHub 仓库的 Actions 页可以看到构建进度）'
