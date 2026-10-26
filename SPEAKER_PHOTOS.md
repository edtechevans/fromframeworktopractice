# TTT presenter portraits and roles

## Verified catalogue — 26 October 2026

All **30 presenters** in the published programme have been matched to their labelled record in the [AISG Ramsnet faculty/staff directory](https://www.aisgz.org/ramsnet-caregiver/directory-faculty-staff/), using the user's authorised, signed-in session. No other faculty profiles are included in the event website.

| Programme name | Directory name | Directory job title |
| --- | --- | --- |
| Adrienne Johnson | Adrienne Johnson | Lower Elementary School Librarian |
| Amelie Sun | Amelie Sun | Early Years Counselor |
| Angela McCloskey | Angela Mc Closkey | Grade 1 Teacher |
| Ashley Faulkenberry | Ashley Faulkenberry | Elementary School EAL Teacher |
| Audrey Lawler | Audrey Lawler | Upper Elementary School Homeroom Teacher |
| Brittany Zhuang | Brittany Zhuang | Elementary School Counselor |
| Brittney Young | Brittney Young | Secondary Counselor |
| Elliot Fijman | Elliot Fijman | Elementary School Instructional Coach |
| Emma Ryan | Emma Ryan | Assistant Athletics and Activities Director/Secondary Health and PE Teacher |
| Fuad Hasanagic | Fuad Hasanagic | Secondary Language Acquisition Teacher |
| Jake Charles | Jake Charles | Elementary School EAL Teacher |
| Jamie Robb | Jamie Robb | Head of School |
| Laurie MacNaughton | Laurie MacNaughton | Grade 5 Teacher |
| Leighanna Stewart | Leighanna Stewart | Grade 2 Teacher |
| Lotus Zhou | Lotus Zhou | Upper Elementary School Mandarin Teacher |
| Marlee Charlton | Marlee Charlton | Secondary Individuals and Societies Teacher |
| Meagan Elderkin | Meagan Elderkin | Grade 2 Teacher |
| Mike Morrison | Michael Morrison | Grade 2 Teacher |
| Nedra Brown | Nedra Brown | University and Future Pathways Counselor |
| Ralph Emmerink | Ralph Emmerink | IB MYP Coordinator |
| Roneil Omadat | Roneil Omadat | Secondary Individuals and Societies Teacher |
| Samantha Rogers | Samantha Rogers | Student Support Services Coordinator |
| Santisha Sonilal | Santisha Sonilal | Secondary Design Teacher |
| Siddhartha Bose | Siddhartha Bose | Secondary Visual Arts Teacher |
| Silky Vyas | Silky Vyas | Secondary Librarian and Information Literacy Specialist/EE Coordinator |
| Tania Mansfield | Tania Mansfield | Upper Elementary Assistant Principal/PYP Coordinator |
| Tim Evans | Tim Evans | Learning Technologies and Data Coordinator |
| Will Henry | Will Henry | Grade 3 Teacher |
| Yizhou Liu | Yizhou Liu | University and Future Pathways Counselor |
| Zachary Brooks | Zachary Brooks | Aquatics Coordinator |

The programme uses **Angela McCloskey**, shown as **Angela Mc Closkey** in Ramsnet, and **Mike Morrison**, listed as **Michael Morrison**. These aliases are explicit in `speaker-profiles.js`. Brittany Zhuang and Brittney Young have separate records and portraits.

## Image delivery

- All 30 portraits are versioned in `assets/speakers/` and served by GitHub Pages alongside the programme. The browser does not need a Ramsnet login or an image-server referrer.
- The original image URL is retained as `sourcePhoto` in the presenter catalogue for future maintenance. It is provenance metadata, not a browser fallback.
- Images preserve their original proportions, are resized to at most 640 pixels on either side, and are encoded as WebP without source EXIF metadata. The UI crops them into its existing circular portrait frame.
- The existing initials fallback remains available if a local asset fails to load.

## Scope and checks

- The 30 catalogue keys match the programme's 30 unique presenter names exactly.
- Each portrait was taken from the image element in the same labelled directory card as its job title; all 30 original image files have different SHA-256 hashes.
- No credentials, cookies, staff email addresses, telephone numbers or other directory fields are stored in this repository.
- The registration implementation, session catalogue, backend settings and 20-person session limits are unchanged by this update.
- When replacing a portrait, verify the labelled directory record, update its local asset and provenance, and check the profile with hover, keyboard focus and tap/click.
