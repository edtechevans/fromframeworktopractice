# TTT presenter portraits and roles

## Current progress (26 October 2026)

The site has hover/focus/tap profiles for all **30 named presenters**. Seven presenter images are linked from pages that explicitly identify the subject by name:

| Presenter | Image / current role source |
| --- | --- |
| Tim Evans | [AISG public leadership page](https://www.aisgz.org/about-us/leadership) |
| Jamie Robb | [AISG public leadership page](https://www.aisgz.org/about-us/leadership) |
| Ralph Emmerink | [AISG public leadership page](https://www.aisgz.org/about-us/leadership) |
| Tania Mansfield | [AISG public leadership page](https://www.aisgz.org/about-us/leadership) |
| Samantha Rogers | [AISG public leadership page](https://www.aisgz.org/about-us/leadership) |
| Silky Vyas | [ACAMIS Technology Conference 2026](https://www.acamis.org/technology-conference-2026) |
| Fuad Hasanagic | [AIFE: AI and Creativity presenter bio](https://aife.community/21cl/ai-and-creativity-what-helps-what-hurts-and-what-to-do-about-it/) |

The direct image URLs, exact person-name match and short job titles are recorded in `speaker-profiles.js`. Three additional job titles have been included where public sources support them (Emma Ryan, Elliot Fijman, Siddhartha Bose). Others show a neutral **Presenter** label pending verification.

**Images are not stored in this GitHub repository.** They are loaded from the source websites at the time a faculty member opens the profile. The source sites can change or restrict hotlinking; if a photo fails to load, initials display instead. For AISG assets, the app makes one fallback request to the corresponding public AISG OSS host.

## Completing the remaining 23 photos

The Ramsnet staff directory requires school login and cannot be accessed from this ChatGPT session. The user has approved image use for this project, but there is no authenticated browser session here. To collect the remaining speaker headshots:

1. Open the signed-in Ramsnet directory in ChatGPT Work's cloud browser (sign in yourself) or export only the 23 remaining named speaker portraits from your authorised school account. Do not send credentials in chat.
2. Verify each image matches the displayed faculty name and obtain the current job title.
3. Crop/resize to a square portrait (prefer 320–600px WebP) and upload to `assets/speakers/` if permanent local hosting is desired.
4. Update the speaker's `photo` in `speaker-profiles.js` to `./assets/speakers/firstname-lastname.webp`, and populate their `role`.
5. Check the popup on desktop and touch devices. Avoid unverified lookalikes from search results.

## Design and privacy

- The programme displays **presenters only**, not all staff in the protected directory.
- The popover appears on hover/focus/click/tap and shows the speaker's portrait (or initials), name, and role.
- This remains a public school event website. No directory credentials, staff contact details, registration email addresses or private directory records are published.
- The `photo` field accepts local approved WebP images and URLs from the three explicitly allowlisted public source hosts (AISG, ACAMIS and AIFE); other URLs are ignored until reviewed.
