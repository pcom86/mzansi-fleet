$file = "c:\Users\pmaseko\mzansi fleet\frontend\src\app\components\users\users.component.ts"

# Read file with default encoding
$lines = Get-Content $file

# Find and replace the corrupted lines
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match '^\s+<span>[^<]*</span>$' -and $lines[$i] -match 'span>.*ðŸ') {
        # Check which button this is for
        if ($i -gt 0 -and $lines[$i-1] -match 'btn-action-password') {
            $lines[$i] = '                      <span>&#128274;</span>'
            Write-Host "Fixed password icon at line $($i+1)"
        }
        elseif ($i -gt 0 -and $lines[$i-1] -match 'btn-action-delete') {
            $lines[$i] = '                      <span>&#128465;</span>'
            Write-Host "Fixed delete icon at line $($i+1)"
        }
    }
}

# Save the file
$lines | Set-Content $file -Encoding UTF8
Write-Host "File updated successfully"
