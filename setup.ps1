# Setup Script for bolt-socket

Write-Host "🚀 Setting up bolt-socket..." -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
Write-Host "Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green
Write-Host ""

# Install root dependencies
Write-Host "📦 Installing root dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Root dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install root dependencies" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Install core package dependencies
Write-Host "📦 Installing core package dependencies..." -ForegroundColor Yellow
Set-Location packages\core
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Core package dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install core dependencies" -ForegroundColor Red
    exit 1
}

# Build core package
Write-Host "🔨 Building core package..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Core package built successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to build core package" -ForegroundColor Red
    exit 1
}

Set-Location ..\..
Write-Host ""

# Install examples dependencies
Write-Host "📦 Installing examples dependencies..." -ForegroundColor Yellow
Set-Location examples
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Examples dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install examples dependencies" -ForegroundColor Red
    exit 1
}

Set-Location ..
Write-Host ""

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✨ Setup Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Read QUICK-START.md for a quick introduction"
Write-Host "  2. Run examples:"
Write-Host "     cd examples"
Write-Host "     npm run example:all"
Write-Host ""
Write-Host "  3. Review PHASE-1-COMPLETE.md for detailed documentation"
Write-Host ""
Write-Host "Happy coding! 🎉" -ForegroundColor Cyan
