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
