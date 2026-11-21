# Dose Right!

Dosage calculation practice for CHEM 3A, built on textbook Sections 1.4.4, 1.4.5, 11.3 and 11.4.

Current version: 1.4

Play: https://itsdrdan.github.io/dosage/

Modes: Factor Builder, Syringe Lab, Weight Dosing, IV Pump, IV Fluids & Dilution, Patient Cases, Skill Check.
Deep links: `?mode=setup|syringe|weight|iv|percent|cases|quiz`, `?mode=cases&path=dental`, `?mode=percent&focus=solutions|dilution`.

Still seven mode buttons. Error checks, estimating, label reading and safe charting rotate into the practice modes. Patient Cases has one program menu with 29 cases, including a nursing library for oral, injection, IV, pediatric, critical care, and intake and output math. Fix My Mistakes appears in Skill Check only when a student has misses.

Orders and limits are invented, and so are most drug names. This is math practice, not dosing guidance.

## Editing

Edit `tools/page-src.html` and `tools/engine-src.js`, then run:

```bash
node tools/build.js
```

```bash
node tools/check.js
```

The checker needs the `games` repo beside this one, for `brand/chemparse.v2.js`.

Copyright (c) 2026 Daniel Kwasniewski (ItsDrDan). All rights reserved. See LICENSE.
