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

Verify that the Supabase database has current rows and capacities for all 27 active session IDs and does **not** allow old `s10` options. Enforce that provisional/pending sessions are not bookable at the server as well as in the browser. Confirm the repeat, presenters, rooms, and timings first.

## Deployment

GitHub Pages deploys automatically when the `main` branch changes using `.github/workflows/deploy-pages.yml`.

## Reporting and operations (October 2026)

- Browser sign-up posts `name`, `email` and three session IDs to the `from-framework-to-practice-register` Supabase Edge Function. Data is stored in Supabase rather than in the public GitHub Pages repository.
- The Edge Function reads `fftp_settings`, `fftp_sessions`, `fftp_registration_choices`; the `fftp_register` database function processes bookings. The registration schema and private reporting query must be verified in the live database before enabling bookings.
- The linked Supabase project (`ncrwtmhjrgsritsluipz`) was reported **INACTIVE** by the Supabase connector on 26 October 2026, and table inspection was unavailable. Restore the project and validate its capacity/session catalogue (nine IDs per block) before opening registration.
- A secure organiser report should join attendee name/email with each block's session ID and title and registration timestamp, and offer a separate capacity summary; do not expose names and emails through public GitHub Pages or a public Edge Function.
- The decorative TLF framework artwork and hero landscape were removed to bring the programme higher on the page. TLF facets remain in session tags and filters.
