$shell = New-Object -ComObject Shell.Application
$thisPc = $shell.NameSpace(17)

function Recurse-Folder($folder, $depth = 0) {
    if ($depth -gt 3) { return }
    $indent = "  " * $depth
    try {
        $items = $folder.Items()
        foreach ($item in $items) {
            Write-Host "$indent- Name: $($item.Name) | IsFolder: $($item.IsFolder) | Path: $($item.Path)"
            if ($item.IsFolder) {
                try {
                    $subF = $item.GetFolder
                    if ($subF) {
                        Recurse-Folder $subF ($depth + 1)
                    }
                } catch {
                    Write-Host "$indent  (Error reading subfolder)"
                }
            }
        }
    } catch {
        Write-Host "$indent (Error getting items)"
    }
}

foreach ($item in $thisPc.Items()) {
    if ($item.Path -like "::*" -and $item.Name -notlike "*Network*" -and $item.Name -notlike "*Control Panel*") {
        Write-Host "MTP Device Found: $($item.Name)"
        $folder = $item.GetFolder
        if ($folder) {
            Recurse-Folder $folder 1
        }
    }
}
