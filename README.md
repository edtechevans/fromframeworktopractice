# From Framework to Practice — AISG Teachers Teaching Teachers

Official programme for **Monday, 2 November 2026** at AISG Science Park.

## Programme

- **Three blocks, nine listings per block, 27 listings total.**
- The organisers' 27-row allocation workbook is the source of session titles, presenter names and audiences. Descriptions are edited/condensed from the submitted blurbs for ease of online reading.
- TLF facets are editorially inferred connections to AISG's six facets: Personalization, Agency, Authenticity, Creativity, Collaboration, Taking Action. They are not presenter-endorsed labels.
- Tim Evans presents **MacBook Setup for Success: Less Friction, More Flow** in Blocks 1 and 3, and **MAP Growth in Practice: From Evidence to Engagement for All** in Block 2. The MAP session uses the AISG TLF vocabulary of Personalization, Agency and Engagement for All. MacBook sessions have no artificial TLF-facet labels.
- The repeat of **The Classroom as the Third Teacher** in Blocks 1 and 3 is provisional; confirmation is still required.
- Rooms and block times have not been supplied, so none are fabricated.
- Review pool logistics, presenter title cleanup and the shorter guided reading proposal before opening bookings.
- Faculty-first UI: desktop and mobile use the same expandable, inline session description; every session has a one-click **Choose** action. Search title, presenters, blurbs and facet tags within each block. The optional TLF-facet and audience preferences rank rather than hide sessions. A compact selections summary is maintained, with keyboard-operable block tabs and screen-reader status announcements.

## Registration

The existing Supabase Edge Function and stable booking IDs `b1-s01` through `b3-s09` are retained. Registration remains controlled by the connected Supabase setting. The website does **not** issue test booking confirmations while registration is closed. Pending sessions, if added in the future, are ineligible for booking.

### Before opening registration

The backend catalogue has been reconciled to exactly 27 session IDs (nine in each block), at 15 places per session. The obsolete `s10` records have been removed, and duplicate-email, session-capacity, invalid-ID and wrong-block checks have passed a rolled-back database test. Before opening public registration, confirm the provisional repeat, presenters, rooms and timings, and verify the browser-to-Edge-Function journey.

## Deployment

GitHub Pages deploys automatically when the `main` branch changes using `.github/workflows/deploy-pages.yml`.

## Reporting and operations (October 2026)

- Browser sign-up posts `name`, `email` and three session IDs to the `from-framework-to-practice-register` Supabase Edge Function. Data is stored in Supabase rather than in the public GitHub Pages repository.
- The Edge Function reads `fftp_settings`, `fftp_sessions`, `fftp_registration_choices`; the `fftp_register` database function processes bookings. The database function checks one selection per block, atomic 15-place limits and case-insensitive duplicate emails.
- On 26 October 2026, the Supabase project (`ncrwtmhjrgsritsluipz`) was successfully restored and validated as **ACTIVE_HEALTHY**. Its session catalogue contains 27 IDs (nine per block), all with 15 places, and no existing registrations. Booking remained **closed** after testing.
- Private, non-exposed views are implemented in the `fftp_reports` schema: `faculty_registrations`, `session_availability`, and `event_summary`. Anonymous and regular authenticated users have no read permissions. See [ORGANISER_REPORTS.md](ORGANISER_REPORTS.md) for access instructions and CSV exports.
- The decorative TLF framework artwork and hero landscape were removed to bring the programme higher on the page. TLF facets remain in session tags and filters.
