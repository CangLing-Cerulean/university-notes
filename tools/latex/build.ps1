param(
    [string]$TectonicPath = 'tectonic'
)

$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$courseRoot = Join-Path $repoRoot '微积分甲/微积分甲1'
$compiler = Get-Command $TectonicPath -ErrorAction Stop
$env:TECTONIC_CACHE_DIR = Join-Path $repoRoot 'tmp/latex-runtime/cache'
$books = @('01-知识讲义与例题.tex', '02-期末真题与解析.tex')

foreach ($book in $books) {
    $sourcePath = Join-Path $courseRoot $book
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "找不到完整源文件：$sourcePath"
    }
    & $compiler.Source --outdir $courseRoot $sourcePath
    if ($LASTEXITCODE -ne 0) {
        throw "LaTeX 编译失败：$book"
    }
}
