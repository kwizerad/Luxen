# PDF Question Reconciliation Report

Generated: 2026-08-10T22:06:16.888Z

## Summary

- **Total parsed questions:** 362
- **Picture questions:** 76
- **Original issues:** 61 (56 missing correct answer, 5 multiple marked options)
- **Resolved using Questions.pdf:** 19
- **Remaining issues:** 42

## Resolved questions (19)

Correct-answer markers were found in `Questions.pdf` and applied.

### Corrected missing markers (16)

23, 24, 77, 93, 97, 159, 166, 184, 186, 201, 204, 205, 213, 233, 238, 241

### Corrected multiple markers (3)

183, 192, 220

## Questions still missing a correct answer marker (39)

These were found in `Questions.pdf` but had no clear correct-answer marker.

153, 158, 160, 252, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 295, 296, 323

## Questions with multiple conflicting markers (2)

324, 339

## Questions not found in Questions.pdf (1)

294

## Artifacts

- `scripts/ibibazo-questions.sql` — bulk INSERT, updated with 19 resolved answers.
- `scripts/parsed-questions.json` — parsed question data, updated with resolved answers.
- `scripts/ibibazo-report.json` — machine-readable issue report.
- `scripts/questions-pdf-check-report.json` — breakdown by reconciliation category.

## Note

`Questions.pdf` uses different question numbering, so reconciliation was performed by matching question text, not by question number.
