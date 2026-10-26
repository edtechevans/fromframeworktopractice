# Personal professional growth tile

The programme now has a tile above session selection for **Chosen Facet**, **Chosen Domain**, and **Professional Goal**. It is prepared for a SharePoint migration. The public GitHub Pages site displays a neutral placeholder and makes no goals-data request.

## What still needs to happen at migration

This repository is a static website, not an installable SPFx package. Deploy it through the school's approved SharePoint app/SPFx hosting workflow, create the private list with the supplied initializer, and verify access using two ordinary faculty accounts. Copying files or signing into Microsoft alone does not provision the private data source. An iframe still hosted on GitHub cannot use this same-origin SharePoint connection.

An SPFx full-page app is the recommended SharePoint host. Keep the app in the SharePoint authenticated origin and pass the hosting web URL through `goal-settings.js`; in an SPFx integration this is `context.pageContext.web.absoluteUrl`. Do not depend on or modify SharePoint's surrounding page DOM. The application's own tile DOM is independent of session registration.

When loaded as the classic script in `index.html`, the tile mounts automatically. If bundled as a CommonJS/SPFx module, call its exported `mount(window, document)` after inserting the application's own markup and configuration. Mount once per app instance, retain the returned cleanup function, and call it from the web part's `onDispose` so private content and event handlers are removed during SharePoint navigation.

## Identity and permissions

1. `goal-tile.js` reads the current user from the authenticated SharePoint `/_api/web/currentuser` endpoint.
2. It checks the private list's unique-permission flag and the initializer's completed-import marker.
3. It requests only that SharePoint user's record for the configured academic year, selecting the three display fields and the owner/year verification fields. It never accepts an identity from the signup form, URL parameters or browser storage.
4. It checks the signed-in identity again before showing the result. Foreign owners, duplicate matches, an account change or an unfinished import produce an empty tile state.

**SharePoint item permissions are the security boundary.** The initializer removes inherited list permissions, applies a separate read-only staff grant to each item, verifies each item's ACL before writing its goal text, and verifies all items again before granting list-level read access. List queries and direct item URLs must therefore remain protected even if a reader changes JavaScript or removes the browser's query filter.

Each item is readable by its assigned staff member and the importing administrator. SharePoint site collection/tenant administrators retain their normal administrative capabilities. The tile still asks for only the current user's own record, including for administrators.

The frontend does not cache goal records in local/session storage, publish an employee dataset, or send goals to the event-registration backend. It clears displayed values when the page is hidden or restored from browser history and reloads the signed-in identity. Goal prose is inserted as inert text nodes; recognised facet names retain the TLF colours.

## Prepare the workbook privately

Use Python 3.9 or later; the converter uses only the standard library. Run from the website checkout:

```bash
python3 sharepoint/prepare_goals.py /private/AISG-goals.xlsx --check-only
python3 sharepoint/prepare_goals.py /private/AISG-goals.xlsx --output /private/2026-27.goals.private.json
```

The converter reads worksheet `Goals` and the columns `Email`, `Chosen Domain`, `Chosen Facet`, and `Goal 1 goal statement`. Names are not used for identity matching or included in the payload. It rejects duplicate/non-AISG emails, unrecognised facet values and oversized text. `Pending selection` and `Other` are preserved as recorded, without an invented facet. It refuses to write private data inside the website checkout or overwrite an existing output.

Keep the workbook and generated JSON in approved private storage outside the website repository and its deployment artifact. The `.gitignore` rules are a secondary safeguard, not a substitute for this separation.

## Create the private SharePoint list

Use PowerShell 7.4.6 or later, PnP.PowerShell and the school's approved delegated Entra app registration. The importing account must have permission to create the list and manage its permissions. Sign in interactively; no password or token belongs in source code.

```powershell
./sharepoint/Initialize-PrivateGoals.ps1 -SiteUrl https://YOUR-TENANT.sharepoint.com/sites/YOUR-SITE -ClientId YOUR-APP-GUID -PrivateDataPath /private/2026-27.goals.private.json
```

The default list is **FFTP Professional Goals 2627**. The script resolves every workbook email to a Microsoft/SharePoint user before creating the list, rejects two addresses resolving to the same user, and refuses to overwrite an existing list. Staff receive read-only access. A partial failure leaves the list without the completed-import marker; investigate it as an administrator before retrying with a new, reviewed list. The script does not delete a failed import automatically.

The list columns are:

| Internal name | Type | Purpose |
| --- | --- | --- |
| StaffKey | Unique indexed text | Academic year and normalised email, used only during import |
| Staff | Single person, indexed | Authenticated SharePoint owner ID |
| AcademicYear | Text | Example: 2026-27 |
| ChosenFacet | Text | Source facet selection |
| ChosenDomain | Plain multiline text | Source domain selection |
| ProfessionalGoal | Plain multiline text | Source professional goal |

New private content must always be written after its item permissions are established. Do not add goal-bearing rows by a normal bulk spreadsheet import, restore inheritance, share items broadly, or give staff edit rights to the list. Use a reviewed administrator update process for later goal changes, preserving the same item ACL and owner.

## Connect the tile

In the SharePoint copy, configure `goal-settings.js` with the hosting web URL, list title and academic year. A normal `/sites/name` or `/teams/name` SharePoint web can be detected automatically; explicitly configure subsites and SPFx wrappers without classic page context. Requests are restricted to the current SharePoint origin. No Microsoft client secret is needed in the browser.

The tile shows a concise goal with **Read full goal** for longer statements. Records with pending selections stay pending. A person with no linked record receives a message asking them to contact Tim Evans; another person's record is never substituted.

## Required live checks before faculty use

Use two ordinary faculty test accounts; an administrator account is not suitable for testing denied access.

- Account A sees only A's facet, domain and goal; account B sees only B's.
- While signed in as B, removing the query filter still returns no A data; requesting A's item ID directly is denied or not found.
- Neither account can update its owner, goal, item permissions or list configuration.
- Signing out/switching accounts and restoring a browser tab does not leave the previous person's goal visible.
- Check pending/missing records, long statements and the existing session booking journey with its 20-person caps.

The repository's ten Node tests cover the client identity/filter contract, independent account requests, denied/ambiguous/mismatched records, account changes, inert goal text and the public no-data state. Run `node --test tests/goal-tile.test.cjs`. The private workbook converter has been validated against the supplied source. The SharePoint initializer and actual tenant permissions have **not** been executed or verified in this environment; complete the live checks during migration.

## Primary references

- [Microsoft: SharePoint Framework and current-user SSO](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/sharepoint-framework-overview)
- [Microsoft: full-page SharePoint apps](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/web-parts/single-part-app-pages)
- [Microsoft: custom permissions on SharePoint securable objects](https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/set-custom-permissions-on-a-list-by-using-the-rest-interface)
- [PnP: interactive authentication](https://pnp.github.io/powershell/cmdlets/Connect-PnPOnline.html)
- [PnP: explicitly loading CSOM properties](https://pnp.github.io/powershell/cmdlets/Get-PnPProperty.html)
