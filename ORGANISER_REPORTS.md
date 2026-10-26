# AISG TTT — Private sign-up reports

**Project:** `ncrwtmhjrgsritsluipz` (Supabase; `MIELA Learning`)

**Access:** [Supabase SQL Editor](https://supabase.com/dashboard/project/ncrwtmhjrgsritsluipz/sql/new). Log in with an authorised organiser/project-owner account.

The three reports below already exist in the database, under the private `fftp_reports` schema. The registration list contains personal information and **must not** be published on the GitHub Pages site or exposed through an unauthenticated API.

## 1. Faculty list — one line per person

Paste this query into Supabase SQL Editor, then click **Run**. To export the results, choose **Export → Download CSV** from the results area.

```sql
SELECT
    faculty_name AS "Name",
    email AS "Email",
    block_1_session AS "Block 1",
    block_2_session AS "Block 2",
    block_3_session AS "Block 3",
    registered_at_china AS "Registered (China time)"
FROM fftp_reports.faculty_registrations
ORDER BY faculty_name;
```

## 2. Session capacities — one line per session

```sql
SELECT
    block AS "Block",
    slot AS "Slot",
    session_title AS "Session",
    presenters AS "Presenter(s)",
    capacity AS "Capacity",
    booked AS "Registered",
    places_remaining AS "Remaining"
FROM fftp_reports.session_availability
ORDER BY block, slot;
```

## 3. Event overview

```sql
SELECT
    registered_faculty AS "Unique faculty",
    offered_sessions AS "Sessions",
    total_session_places AS "Total places across blocks",
    booked_places AS "Booked places"
FROM fftp_reports.event_summary;
```

Each faculty member chooses one session from each of the three blocks, so they take **three** workshop places. The maximum places per session are 15. Only people with suitable access to the Supabase project can see or download named registrations.

## Registration switch

Registration is currently **closed**. A project administrator can open it when programme details are final and the public form has been checked. The registration endpoint reads `public.fftp_settings.registration_open`, while the database function also refuses registrations when that setting is false.

The connected project's [Table Editor](https://supabase.com/dashboard/project/ncrwtmhjrgsritsluipz/editor) can be used to inspect the `fftp_settings` row, or the Supabase SQL Editor can be used to query its status:

```sql
SELECT registration_open FROM public.fftp_settings WHERE id = true;
```

Do not open public registration until room assignments, times and the provisional repeat session are confirmed.

## Implementation and privacy

- Session catalogue: `public.fftp_sessions` — exactly `b1-s01` through `b3-s09`.
- Session titles and presenter names: private `fftp_reports.session_catalog`, matched to the website catalogue at the last validation.
- Registrations: `public.fftp_registrations` and `public.fftp_registration_choices`, linked by registration ID.
- Private reports: `fftp_reports.faculty_registrations`, `fftp_reports.session_availability`, `fftp_reports.event_summary`; their views use `security_invoker=true` and no anonymous/authenticated grants.
- Bookings use a case-insensitive unique email index, session row locks for concurrency and a 15-person cap.
- A rolled-back database test on 26 October 2026 verified successful booking, duplicate rejection, over-capacity rejection, wrong-block and obsolete-ID rejection, and correct private report counts.
- The test left **zero** registrations and registration remains **closed**.
- The external HTTP form-to-Edge-Function journey was not fully tested because an HTTP client was not available in this session; verify a real booking before launch.
- If titles, presenters or session IDs later change on the website, update `fftp_reports.session_catalog` as well to keep organiser reports aligned.
