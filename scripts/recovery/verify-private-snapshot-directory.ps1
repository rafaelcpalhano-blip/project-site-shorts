param([Parameter(Mandatory = $true)][string]$LiteralDirectory)
# Read-only inspection. Never creates a directory or changes an ACL.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try {
    $item = [IO.DirectoryInfo]::new($LiteralDirectory)
    if (-not $item.Exists -or (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)) { throw 'refused' }
    $acl = [IO.Directory]::GetAccessControl($item.FullName)
    $sidType = [Security.Principal.SecurityIdentifier]
    $currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    if (-not $acl.AreAccessRulesProtected -or $acl.GetOwner($sidType).Value -ne $currentSid) { throw 'refused' }
    $rules = @($acl.GetAccessRules($true, $true, $sidType))
    if ($rules.Count -ne 2) { throw 'refused' }
    $seen = @{}
    foreach ($rule in $rules) {
        $sid = $rule.IdentityReference.Value
        if (($sid -ne $currentSid -and $sid -ne 'S-1-5-18') -or $seen.ContainsKey($sid)) { throw 'refused' }
        if ($rule.IsInherited -or $rule.AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or
            [int]$rule.FileSystemRights -ne [int][Security.AccessControl.FileSystemRights]::FullControl -or
            [int]$rule.InheritanceFlags -ne 3 -or [int]$rule.PropagationFlags -ne 0) { throw 'refused' }
        $seen[$sid] = $true
    }
    if (-not $seen.ContainsKey($currentSid) -or -not $seen.ContainsKey('S-1-5-18')) { throw 'refused' }
    [Console]::Out.WriteLine('{"schema":1,"private":true}')
} catch {
    # Never print identities, paths, ACEs, exception messages or document data.
    [Console]::Out.WriteLine('{"schema":1,"private":false}')
}
