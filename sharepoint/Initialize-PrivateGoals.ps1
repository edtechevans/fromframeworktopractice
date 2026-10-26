#Requires -Version 7.4.6
#Requires -Modules PnP.PowerShell
<#
.SYNOPSIS
Creates a NEW private goals list. Run only in the school's SharePoint tenant.
.DESCRIPTION
Uses delegated, interactive Microsoft sign-in. The list starts administrator-only.
Each item receives unique permissions before any goal text is written.
Staff receive read-only list access only after every item ACL has been verified.
No staff goal text is printed. Existing lists are never overwritten.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][Uri]$SiteUrl,
    [Parameter(Mandatory = $true)][Guid]$ClientId,
    [Parameter(Mandatory = $true)][string]$PrivateDataPath,
    [string]$ListTitle = "FFTP Professional Goals 2627"
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if ($SiteUrl.Scheme -ne "https" -or $SiteUrl.Host -notmatch "^[a-zA-Z0-9-]+\.sharepoint\.(com|cn)$") {
    throw "Use the school's HTTPS SharePoint web URL."
}
$data = Get-Content -LiteralPath $PrivateDataPath -Raw | ConvertFrom-Json
if ($data.schemaVersion -ne 1 -or $data.academicYear -notmatch "^\d{4}-\d{2}$") {
    throw "Unsupported private import schema."
}
$records = @($data.records)
if ($records.Count -eq 0) { throw "The private import is empty." }
$seenEmails = @{}
foreach ($record in $records) {
    if ($record.email -notmatch "^[^@\s]+@aisgz\.org$" -or $record.academicYear -ne $data.academicYear) {
        throw "Invalid staff identity or academic year in private import."
    }
    $key = $record.email.Trim().ToLowerInvariant()
    if ($seenEmails.ContainsKey($key)) { throw "Duplicate staff email in private import." }
    $seenEmails[$key] = $true
}

$connection = Connect-PnPOnline -Url $SiteUrl.AbsoluteUri -ClientId $ClientId -Interactive -ReturnConnection
$ctx = Get-PnPContext -Connection $connection
$web = $ctx.Web
$ctx.Load($web)
$ctx.Load($web.CurrentUser)
$ctx.Load($web.Lists)
$ctx.ExecuteQuery()
if (@($web.Lists | Where-Object { $_.Title -eq $ListTitle }).Count -gt 0) {
    throw "The target list already exists. Review it administratively; this initializer never overwrites an existing list."
}
$adminId = $web.CurrentUser.Id
$readRole = $web.RoleDefinitions.GetByType([Microsoft.SharePoint.Client.RoleType]::Reader)
$ctx.Load($readRole)
$ctx.ExecuteQuery()

# Resolve ALL accounts before creating the list or writing private data.
$resolved = @()
$seenIds = @{}
foreach ($record in $records) {
    $user = $web.EnsureUser($record.email)
    $ctx.Load($user)
    $ctx.ExecuteQuery()
    if ($user.PrincipalType -ne [Microsoft.SharePoint.Client.Utilities.PrincipalType]::User -or [string]::IsNullOrWhiteSpace($user.Email) -or $user.Email.ToLowerInvariant() -ne $record.email.ToLowerInvariant()) {
        throw "A workbook email did not resolve to the same Microsoft account. Correct the mapping before importing."
    }
    if ($seenIds.ContainsKey([string]$user.Id)) { throw "Two workbook addresses resolve to the same Microsoft user." }
    $seenIds[[string]$user.Id] = $true
    $resolved += [PSCustomObject]@{ Record = $record; User = $user }
}

$info = New-Object Microsoft.SharePoint.Client.ListCreationInformation
$info.Title = $ListTitle
$info.Description = "FFTP goals import pending verification."
$info.TemplateType = [int][Microsoft.SharePoint.Client.ListTemplateType]::GenericList
$list = $web.Lists.Add($info)
$ctx.Load($list)
$ctx.ExecuteQuery()

# Do not copy site members, visitors or any broad access groups.
$list.BreakRoleInheritance($false, $true)
$list.EnableVersioning = $false
$list.EnableAttachments = $false
$list.NoCrawl = $true
$list.OnQuickLaunch = $false
$list.Update()
$ctx.Load($list)
$ctx.ExecuteQuery()
$null = Get-PnPProperty -ClientObject $list -Property HasUniqueRoleAssignments -Connection $connection
if (-not $list.HasUniqueRoleAssignments) { throw "The list is still inheriting permissions." }

$schemas = @(
    '<Field Type="Text" Name="StaffKey" StaticName="StaffKey" DisplayName="Staff key" Indexed="TRUE" EnforceUniqueValues="TRUE" Required="TRUE" MaxLength="255" />',
    '<Field Type="User" Name="Staff" StaticName="Staff" DisplayName="Staff" UserSelectionMode="PeopleOnly" Mult="FALSE" Indexed="TRUE" Required="TRUE" />',
    '<Field Type="Text" Name="AcademicYear" StaticName="AcademicYear" DisplayName="Academic year" Required="TRUE" MaxLength="16" />',
    '<Field Type="Text" Name="ChosenFacet" StaticName="ChosenFacet" DisplayName="Chosen Facet" MaxLength="255" />',
    '<Field Type="Note" Name="ChosenDomain" StaticName="ChosenDomain" DisplayName="Chosen Domain" RichText="FALSE" AppendOnly="FALSE" NumLines="4" />',
    '<Field Type="Note" Name="ProfessionalGoal" StaticName="ProfessionalGoal" DisplayName="Professional Goal" RichText="FALSE" AppendOnly="FALSE" NumLines="12" />'
)
foreach ($schema in $schemas) {
    $null = $list.Fields.AddFieldAsXml($schema, $true, [Microsoft.SharePoint.Client.AddFieldOptions]::AddFieldInternalNameHint)
}
$ctx.ExecuteQuery()

function Add-ReadAssignment($target, $user) {
    # Sharing an item can already have created a Limited Access assignment on its parent.
    $ctx.Load($target.RoleAssignments)
    $ctx.ExecuteQuery()
    foreach ($assignment in $target.RoleAssignments) {
        $ctx.Load($assignment.Member)
        $ctx.Load($assignment.RoleDefinitionBindings)
    }
    $ctx.ExecuteQuery()
    $existing = @($target.RoleAssignments | Where-Object { $_.Member.Id -eq $user.Id })
    if ($existing.Count -gt 1) { throw "Ambiguous principal permission assignment." }
    if ($existing.Count -eq 1) {
        if (@($existing[0].RoleDefinitionBindings | Where-Object { $_.Id -eq $readRole.Id }).Count -eq 0) {
            $existing[0].RoleDefinitionBindings.Add($readRole)
            $existing[0].Update()
        }
    } else {
        $bindings = New-Object Microsoft.SharePoint.Client.RoleDefinitionBindingCollection($ctx)
        $bindings.Add($readRole)
        $null = $target.RoleAssignments.Add($user, $bindings)
    }
    $ctx.ExecuteQuery()
}

function Assert-PrivateItem($item, $staffId) {
    $ctx.Load($item)
    $ctx.Load($item.RoleAssignments)
    $ctx.ExecuteQuery()
    $null = Get-PnPProperty -ClientObject $item -Property HasUniqueRoleAssignments -Connection $connection
    if (-not $item.HasUniqueRoleAssignments) { throw "An item is inheriting list permissions." }
    $allowedIds = @([int]$adminId, [int]$staffId) | Select-Object -Unique
    $actualIds = @()
    foreach ($assignment in $item.RoleAssignments) {
        $ctx.Load($assignment.Member)
        $ctx.Load($assignment.RoleDefinitionBindings)
    }
    $ctx.ExecuteQuery()
    foreach ($assignment in $item.RoleAssignments) {
        $principalId = [int]$assignment.Member.Id
        if ($allowedIds -notcontains $principalId) { throw "Unexpected principal on a private item." }
        $actualIds += $principalId
        if ($principalId -eq $staffId -and $staffId -ne $adminId) {
            $roles = @($assignment.RoleDefinitionBindings)
            if ($roles.Count -ne 1 -or $roles[0].Id -ne $readRole.Id) { throw "A staff item grant is not read-only." }
        }
    }
    foreach ($allowedId in $allowedIds) {
        if ($actualIds -notcontains $allowedId) { throw "An expected item principal is missing." }
    }
}

$created = @()
foreach ($entry in $resolved) {
    $record = $entry.Record
    $user = $entry.User
    $item = $list.AddItem((New-Object Microsoft.SharePoint.Client.ListItemCreationInformation))
    $staffValue = New-Object Microsoft.SharePoint.Client.FieldUserValue
    $staffValue.LookupId = $user.Id
    # Initial items contain identity metadata only. The list is still admin-only.
    $item["Title"] = "Professional growth focus"
    $item["StaffKey"] = $data.academicYear + "|" + $record.email.ToLowerInvariant()
    $item["Staff"] = $staffValue
    $item["AcademicYear"] = $data.academicYear
    $item.Update()
    $ctx.Load($item)
    $ctx.ExecuteQuery()
    $item.BreakRoleInheritance($false, $false)
    $ctx.ExecuteQuery()
    if ($user.Id -ne $adminId) { Add-ReadAssignment $item $user }
    Assert-PrivateItem $item $user.Id
    # Private content is written only AFTER its ACL has been validated.
    $item["ChosenFacet"] = [string]$record.chosenFacet
    $item["ChosenDomain"] = [string]$record.chosenDomain
    $item["ProfessionalGoal"] = [string]$record.professionalGoal
    $item.Update()
    $ctx.ExecuteQuery()
    $created += [PSCustomObject]@{ Item = $item; User = $user }
}

# Verify every item again before granting list-level read access.
foreach ($entry in $created) { Assert-PrivateItem $entry.Item $entry.User.Id }
foreach ($entry in $resolved) {
    if ($entry.User.Id -ne $adminId) { Add-ReadAssignment $list $entry.User }
}
$list.Description = "FFTP staff-item-read-v1; year=" + $data.academicYear
$list.Update()
$ctx.ExecuteQuery()
Write-Host ("Prepared " + $created.Count + " private staff records. No goal text was written to the console.")
Write-Host ("List ID: " + $list.Id)
Write-Host "Finish with the two-account permission checks in SHAREPOINT_GOALS.md before inviting faculty."
