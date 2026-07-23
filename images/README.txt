Drop your real photos into this folder using these exact filenames.
Until a file exists, the site shows an elegant gradient placeholder
automatically — nothing breaks if you add them one at a time.

hero-main.jpg      Large hero photo (patient smiling / studio). Landscape, min 1200x1000px.
doctor-1.jpg       Lead doctor portrait. Works well as landscape or portrait — it's
                   cropped to fit automatically.
doctor-2.jpg       Second doctor portrait (only shows once a second profile card
                   is added back into the #doctors section in index.html).
doctor-3.jpg       Third doctor portrait (same note as above).

Smile Gallery — before/after case tabs (Case 1 / 2 / 3 in the Smile Gallery
section). Each case is its own before/after pair, switched with the tab
buttons above the slider — you don't need to duplicate any HTML to add one,
just drop the photos in with these filenames:
before-1.jpg / after-1.jpg   Case 1
before-2.jpg / after-2.jpg   Case 2
before-3.jpg / after-3.jpg   Case 3

To rename the case labels or the one-line note under the slider, edit the
data-note text and button label on each ".ba-tab" button in index.html.

Tips:
- Keep each before/after pair framed identically (same zoom, angle, lighting)
  so the drag comparison looks convincing.
- JPG or WEBP both work — just keep the filename + extension matching
  what's referenced in index.html, or update the <img src="..."> / data-*
  paths to match.
- Compress large photos before adding them (under ~300KB each is plenty
  for web) so the site stays fast.
