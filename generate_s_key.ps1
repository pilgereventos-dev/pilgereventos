
$KeyPath = "$env:USERPROFILE\.ssh\id_ed25519_pilgereventos"
Write-Host "Generating key at $KeyPath"
ssh-keygen -t ed25519 -C "pilgereventos-dev" -f $KeyPath -N ""
Write-Host "Done"
