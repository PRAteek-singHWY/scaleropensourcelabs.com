# Member photos

Drop one image per person here and reference it from `content/people.ts`:

```ts
{ name: "Full Name", photo: "/people/full-name.jpg", … }
```

## Two frames, two crops

There are two places a photo can land, and they want different crops. Check which
list the person is in before cropping.

| Where | Shape | Crop | Minimum |
| --- | --- | --- | --- |
| `ACHIEVERS`, `CORE_TEAM`, `ALUMNI` — the Hall of Fame cards | 4:5 tall | Portrait | 832 x 1040 |
| `TEAM_OFFICERS`, `TEAM_LEADS`, `TEAM_SHADOWS` — the org chart | Circle | **Square** | 448 x 448 |

The chart's circles render at 112px (officers), 96px (leads) and 72px (shadows), so
448px square covers the largest at 2x with room spare. A tall crop in a circular
frame keeps only the middle band of the image, which usually means a chin and a
forehead — crop square, and **leave headroom**, because the corners get clipped by
the radius.

## What works in both

- **Portrait orientation** for the 4:5 frame — a square or landscape crop gets
  centre-cropped and heads drift out of frame. Shoot or crop tall.
- **Face in the upper half** for 4:5; **face centred** for the circles.
  `object-fit: cover` crops from the centre outward in both.
- **`.jpg` for photographs**, `.webp` if you have it. Not `.png` — a portrait as
  PNG is several times the bytes for no visible gain.
- Keep each file **under ~300 KB**. The whole hall loads on one page — at
  twenty-five portraits, 300 KB each is already a 7.5 MB page.

## What is not needed

A studio, matching backgrounds, or everyone photographed the same day. A phone
portrait in daylight against a plain wall is fine and looks more like a club than
a prospectus does.

## If there is no photo

Leave `photo` off entirely. `Portrait.tsx` renders a designed monogram — initials
over a tint derived from the person's name — at the same aspect and radius as a
photograph, so in the org chart it fills the circle instead. It is a deliberate
state, not a broken image, so a half-populated hall or a chart still awaiting
photos looks intentional. Do not add a placeholder image to fill the gap.

The team currently ships with no photos at all, which is why the chart reads
as monograms. Adding them is a one-line change per person and needs no layout work.

## Permission

A photo needs the same consent as the name.

- For `ACHIEVERS`, `CORE_TEAM` and `ALUMNI`, `consented: true` covers both, and it
  is not to be set on someone else's behalf.
- `TEAM_*` has no `consented` field, because holding a team office is the
  club's own structure to state. A **photo** is still that person's to give — ask
  before adding one.
