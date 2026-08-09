param(
    [string]$Action = "list",
    [string]$TargetFolder = "$env:TEMP\PisoPrint_MTP"
)

$shell = New-Object -ComObject Shell.Application
$thisPc = $shell.NameSpace(17)

# Document and image extensions supported for kiosk printing
$printableExts = @('.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.csv', '.rtf', '.jpg', '.jpeg', '.png', '.bmp', '.webp')

# Common Android user document folders
$priorityFolders = @('Download', 'Downloads', 'Documents', 'Document', 'DCIM', 'Pictures', 'WhatsApp', 'WhatsApp Documents', 'Telegram', 'WPS', 'Office', 'Canva', 'PDF')

function Sync-MtpItems($mtpFolderObj, $targetDirPath, $depth = 0) {
    if ($depth -gt 4) { return }
    
    if (-not (Test-Path $targetDirPath)) {
        New-Item -ItemType Directory -Path $targetDirPath -Force | Out-Null
    }
    
    $destFolderObj = $shell.NameSpace($targetDirPath)
    
    try {
        $items = $mtpFolderObj.Items()
        foreach ($item in $items) {
            $itemName = $item.Name
            
            if ($item.IsFolder) {
                # Skip system folders like .android, Android/data, etc.
                if ($itemName -notlike ".*" -and $itemName -ne "data" -and $itemName -ne "obb") {
                    # At root storage level, prioritize key user folders
                    if ($depth -eq 0) {
                        $isPriority = $false
                        foreach ($p in $priorityFolders) {
                            if ($itemName -like "*$p*") { $isPriority = $true; break }
                        }
                        if (-not $isPriority) { continue }
                    }
                    
                    $subPath = Join-Path $targetDirPath $itemName
                    $subF = $item.GetFolder
                    if ($subF) {
                        Sync-MtpItems $subF $subPath ($depth + 1)
                    }
                }
            } else {
                $ext = [System.IO.Path]::GetExtension($itemName).ToLower()
                if ($ext -in $printableExts) {
                    $destFile = Join-Path $targetDirPath $itemName
                    if (-not (Test-Path $destFile)) {
                        Write-Host "Copying: $itemName -> $targetDirPath"
                        $destFolderObj.CopyHere($item, 16 + 4)
                        Start-Sleep -Milliseconds 80
                    }
                }
            }
        }
    } catch {
        # Ignore inaccessible folders
    }
}

$mtpDevices = @()
foreach ($item in $thisPc.Items()) {
    if ($item.Path -like "::*" -and $item.Name -notlike "*Network*" -and $item.Name -notlike "*Control Panel*") {
        $mtpDevices += $item
    }
}

if ($Action -eq "list") {
    $result = @()
    foreach ($dev in $mtpDevices) {
        $folder = $dev.GetFolder
        $hasStorage = $false
        $rawPath = $dev.Path
        if ($folder) {
            foreach ($sub in $folder.Items()) {
                $hasStorage = $true
                break
            }
        }
        $result += [PSCustomObject]@{
            Name = $dev.Name
            RawPath = $rawPath
            IsReady = $hasStorage
        }
    }
    $result | ConvertTo-Json -Compress
}
elseif ($Action -eq "sync") {
    foreach ($dev in $mtpDevices) {
        $devFolder = $dev.GetFolder
        if ($devFolder) {
            foreach ($storageItem in $devFolder.Items()) {
                $storageFolder = $storageItem.GetFolder
                if ($storageFolder) {
                    Sync-MtpItems $storageFolder $TargetFolder 0
                }
            }
        }
    }
    Write-Host $TargetFolder
}
