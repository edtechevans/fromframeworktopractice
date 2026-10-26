# Speaker portraits and roles — AISG TTT

## Status

The website currently recognises **30 distinct presenters** from its 27 sessions, and provides a presenter-name popover on mouse hover, keyboard focus or tap. The popover shows a circular image, presenter's name and job role, with initials and “Presenter” used when an approved picture or verified role has not been supplied.

**No portraits have been copied from the sign-in-only Ramsnet caregiver/staff directory.** The GitHub Pages site is public, so putting photos in `assets/speakers/` makes them publicly accessible. Obtain appropriate school approval/usage permission before republishing directory portraits.

## Safest import process

1. Sign into the AISG Ramsnet directory **in your own authorised browser session**. Do not paste your password, session cookies or single-sign-on tokens into chat, GitHub or the website.
2. Export/download only the headshots of the **30 presenters** listed in `speaker-profiles.js`, with their current job titles. Do not export the full staff directory.
3. Confirm the school is comfortable with those particular photos and roles appearing on the public conference registration page.
4. Provide the approved image files to the website maintainer, ideally cropped square and optimised as WebP (around 320–600 px square); name the files `firstname-lastname.webp` and put them in `assets/speakers/`.
5. Update the matching person's entry in `speaker-profiles.js` with `"role": "Verified current job title"` and `"photo": "./assets/speakers/firstname-lastname.webp"`. Keep unavailable fields empty.
6. Preview on desktop and mobile, check all photo/name pairs, and push to GitHub.

## UI behaviour

- Hover over a speaker name to view the mini profile without leaving the session card.
- Tap or click the name on mobile or desktop to hold the mini profile open; tap elsewhere or press Escape to dismiss.
- The popup is positioned within the viewport, and a neutral initials avatar appears if the approved picture is missing or cannot load.
- No sign-up names or emails are added to this public profile catalogue.

**Important:** A directory image URL that requires login will not reliably load for faculty using the public site, and direct linking could expose private access parameters. Use approved, locally hosted images instead.
