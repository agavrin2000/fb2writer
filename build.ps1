$rids = "win-x64", "linux-x64"
foreach ($rid in $rids) {
    Write-Host "🚀 Building for $rid..." -ForegroundColor Cyan
    dotnet publish -c Release -r $rid --self-contained true -p:PublishSingleFile=true --tl:off
}
