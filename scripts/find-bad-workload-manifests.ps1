$dirs = @(
    'C:\Program Files\dotnet\metadata\workloads',
    'C:\Program Files\dotnet\sdk-manifests'
)

foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) { continue }

    Write-Host "Scanning: $dir"
    Get-ChildItem $dir -Recurse -Filter *.json -ErrorAction SilentlyContinue | ForEach-Object {
        $path = $_.FullName
        $length = $_.Length
        if ($length -eq 0) {
            Write-Host "EMPTY: $path"
            return
        }

        try {
            $first = Get-Content -Path $path -Encoding Byte -TotalCount 1 -ErrorAction Stop
        } catch {
            Write-Host "ERROR reading first byte: $path - $_"
            return
        }

        if ($null -eq $first -or $first.Count -eq 0) {
            Write-Host "EMPTY (read failed): $path"
            return
        }

        if ($first[0] -eq 0) {
            Write-Host "NULLBYTE: $path (length $length)"
            return
        }
    }
}
