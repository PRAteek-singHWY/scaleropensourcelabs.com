# Member photos

Drop one image per person here and reference it from `content/club.ts`:

```ts
{ name: "Full Name", photo: "/people/full-name.jpg", … }
```

## What works

- **Portrait orientation.** The frame is 4:5, so a square or landscape crop gets
  centre-cropped and heads drift out of frame. Shoot or crop tall.
- **At least 832 x 1040** (the frame renders 416 x 520 at 2x). Smaller looks soft
  on a retina screen, which is most phones.
- **Face in the upper half.** `object-fit: cover` crops from the centre outward.
- **`.jpg` for photographs**, `.webp` if you have it. Not `.png` — a portrait as
  PNG is several times the bytes for no visible gain.
- Keep each file **under ~300 KB**. Fourteen of these load on one page.

## What is not needed

A studio, matching backgrounds, or everyone photographed the same day. A phone
portrait in daylight against a plain wall is fine and looks more like a club than
a prospectus does.

## If there is no photo

Leave `photo` off entirely. `Portrait.tsx` renders a designed monogram — initials
over a tint derived from the person's name — at the same aspect and radius as a
photograph. It is a deliberate state, not a broken image, so a half-populated hall
still looks intentional. Do not add a placeholder image to fill the gap.

## Permission

A photo needs the same consent as the name. `consented: true` covers both, and it
is not to be set on someone else's behalf.
