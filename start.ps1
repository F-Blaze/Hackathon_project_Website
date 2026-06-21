$ErrorActionPreference = 'Stop'
$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
$bundledPython = 'C:\Users\Owner\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'

if ($pythonCommand) {
  $python = $pythonCommand.Source
} elseif (Test-Path -LiteralPath $bundledPython) {
  $python = $bundledPython
} else {
  throw 'Python 3 is required to run the local static server.'
}

Write-Host 'CircuitMentor AI is running at http://127.0.0.1:4173'
& $python -m http.server 4173 --bind 127.0.0.1 --directory $PSScriptRoot
