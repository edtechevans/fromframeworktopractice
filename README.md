# From Framework to Practice — Session Sign-up

Static GitHub Pages registration site for AISG's **From Framework to Practice** Teachers Teach Teachers event on November 2, 2026.

## Current state

- Three session blocks
- Ten session options per block
- One choice required per block
- 15-person live capacity per session
- First and last name only
- No attendee login
- Responsive AISG-inspired navy / red visual system
- Accessible keyboard-selectable session cards and live form feedback
- Shared registrations and capacity are stored in Supabase through a public Edge Function; the browser never receives a service-role key or participant list

Registration is intentionally **closed** in the database until the final 30 session titles, presenter names, and blurbs are added.

## Update session content

Edit `sessions.js`. Keep the existing `id`, `block`, and `slot` values unchanged. You can freely update:

- `title`
- `presenters`
- `blurb`

The live capacity is linked to the stable session ID, not to the title.

## Opening registration

Set `public.fftp_settings.registration_open` to `true` in the connected Supabase project after the final programme has been checked.

## Deployment

`.github/workflows/deploy-pages.yml` publishes the repository root to GitHub Pages whenever `main` changes.
