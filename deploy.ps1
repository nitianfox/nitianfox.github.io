# ============================================================
#  NTFOX 博客 —— 一键部署到 Cloudflare Pages
#  用法（在 D:\NTFOX 下）：
#     .\deploy.ps1                          # 用默认项目名 ntfox 上传
#     .\deploy.ps1 -Project ntfox-portfolio # 指定 Cloudflare Pages 项目名
#     .\deploy.ps1 -SiteUrl https://ntfox.pages.dev
#  首次使用前：npx wrangler login   （只需一次，浏览器里授权）
# ============================================================
param(
    [string]$Project = 'ntfox',
    [string]$SiteUrl = ''
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

Write-Host '=== 1/3 生成站点地址 ===' -ForegroundColor Cyan
if ($SiteUrl) {
    $env:SITE_URL = $SiteUrl
} elseif (-not $env:SITE_URL) {
    $env:SITE_URL = "https://$Project.pages.dev"
}
Write-Host "  SITE_URL = $env:SITE_URL"

Write-Host '=== 2/3 构建（astro build + pagefind 索引）===' -ForegroundColor Cyan
pnpm build
if ($LASTEXITCODE -ne 0) { throw '构建失败，已中止部署' }
Write-Host ("  dist: {0} MB" -f [math]::Round((Get-ChildItem 'dist' -Recurse -File | Measure-Object Length -Sum).Sum / 1MB, 1))

Write-Host '=== 3/3 上传到 Cloudflare Pages ===' -ForegroundColor Cyan
npx wrangler pages deploy dist --project-name=$Project --commit-dirty=true
if ($LASTEXITCODE -ne 0) { throw '上传失败（先跑一次 npx wrangler login 授权）' }

Write-Host ''
Write-Host "完成！线上地址：$env:SITE_URL" -ForegroundColor Green
Write-Host '（首次部署后到 Cloudflare 控制台 Pages -> 你的项目 -> Custom domains 可以绑自己的域名）'
