# Accessibility and Section 508

The Nest Student Concierge is designed toward Section 508 conformance using WCAG 2.0 Level AA as the baseline and WCAG 2.1/2.2 practices where practical.

## Implemented

- Semantic landmarks, headings, forms, and labels.
- A keyboard-visible skip link.
- Full keyboard access with high-contrast visible focus indicators.
- Minimum 44-pixel interactive targets and readable text sizing.
- Screen-reader live regions for chat, search status, and notifications.
- Responsive reflow and reduced-motion support.
- UTF-8 text and meaningful links instead of inactive placeholders.
- Student-facing admin access removed.

## Required Before Production

1. Test keyboard-only use, Windows High Contrast Mode, 200% and 400% zoom, and responsive reflow.
2. Test with NVDA, JAWS, and VoiceOver.
3. Run axe and Accessibility Insights, then manually review every finding.
4. Verify official Tougaloo brand colors meet contrast requirements.
5. Provide an accessibility statement and barrier-reporting process.
6. Review linked external services separately.
7. Remediate the academic-calendar PDF or provide an equivalent accessible HTML version.

Automated checks support accessibility work but do not establish Section 508 conformance by themselves.
