I found the likely issue: the Featured tile exists in the DOM, but on mobile it has no fixed height/aspect ratio when real data loads, so only a thin/white separator-like bar is visible. The global Featured query is returning a valid featured listing, so this is a mobile layout/rendering problem, not a missing-data problem.

Plan:
1. Update the Featured tile link on the homepage to have a stable mobile height/aspect ratio, while keeping the current 2x2 desktop bento layout unchanged.
2. Make the loading placeholder use the same mobile/desktop dimensions as the real Featured tile so it cannot collapse.
3. Add a safer image selection that sorts a copied image array instead of mutating query data during render.
4. Verify the mobile preview at 393px shows the Featured listing card above “Women Seek Man” instead of the white bar.