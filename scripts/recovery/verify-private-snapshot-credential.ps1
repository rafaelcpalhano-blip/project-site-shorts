param([Parameter(Mandatory = $true)][string]$LiteralFile)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try {
    $item = [IO.FileInfo]::new($LiteralFile)
    if (-not $item.Exists -or (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)) { throw 'refused' }
    $acl = [IO.File]::GetAccessControl($item.FullName)
    $type = [Security.Principal.SecurityIdentifier]
    $current = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    if ($acl.GetOwner($type).Value -ne $current) { throw 'refused' }
    $rules = @($acl.GetAccessRules($true, $true, $type))
    if ($rules.Count -ne 2) { throw 'refused' }
    $seen = @{}
    foreach ($rule in $rules) {
        $sid = $rule.IdentityReference.Value
        if (($sid -ne $current -and $sid -ne 'S-1-5-18') -or $seen.ContainsKey($sid) -or
            [int]$rule.AccessControlType -ne 0 -or [int]$rule.FileSystemRights -ne 2032127 -or
            [int]$rule.InheritanceFlags -ne 0 -or [int]$rule.PropagationFlags -ne 0) { throw 'refused' }
        $seen[$sid] = $true
    }
    if (-not $seen.ContainsKey($current) -or -not $seen.ContainsKey('S-1-5-18')) { throw 'refused' }
    [Console]::Out.WriteLine('{"schema":1,"private":true}')
} catch { [Console]::Out.WriteLine('{"schema":1,"private":false}') }
