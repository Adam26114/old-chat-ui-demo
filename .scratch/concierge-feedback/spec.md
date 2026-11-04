# November 4 concierge feedback

Status: resolved

Baseline fcc3971. Reference user-supplied November 4 DOCX and chatbot.zip.

- Render the animated dots with 'Preparing your reply…' directly after the guest
  message while pending. Suppress empty optimistic assistant rows, including
  avatars/timestamps/entrances. Animate completed replies once.
- Replace assistant copy controls with device-local short times, full accessible
  date/time, ISO datetime. Persist one creation timestamp across tabs/reloads.
  Legacy records without time must not gain fabricated timestamps.
- Support optional VITE_RECAPTCHA_SITE_KEY/VITE_RECAPTCHA_ENDPOINT and additive
  recaptcha_site_key/recaptcha_endpoint props. Use supplied development settings
  in ignored local WBE config. Missing either bypasses verification.
- When configured, load/reuse Google v3 once, execute action usermessage with a
  fresh token each send, POST {token}, require HTTP success and success:true.
  On failure/timeout preserve draft (including new edits), show retry feedback,
  and send/persist nothing. Guard duplicate sends and invalidate checks on
  restart/disconnect/unmount/configuration changes. Retry fresh tokens/SDK loads.
- Relay and persist severe like error. Map user_info and three configuration
  codes per reference, accepting invalid _structure alias. Use Unknown error
  fallback. Retain timeout/restart handling.
- Suppress consecutive inbound chat events by type/raw message before fanout
  and history. Reset on new guest submission, different event or session restart.
- Verify local fixture failure/success flows, timestamps, legacy records, shared
  tabs, duplicate errors and legitimate repeated replies in Chromium/WebKit.
  Run typecheck/lint, two WBE builds and landing build. Publish concierge-feedback
  and main atomically, feature : concierge-feedback, leave clean main.


## Results

- 80 Chromium/WebKit browser checks passed, including 28 feedback/verification checks.
- Typechecking, linting, production/staging WBE builds and landing build passed.
- Desktop pending state and mobile completed replies visually inspected with
  controlled local fixtures. No page errors. Current widget previews refreshed.
- Local development reCAPTCHA values configured in ignored WBE local file.
  Verification tests stub Google and the endpoint; live service not exercised.

## Standards review

The SDK initially checked execute() at script load. It now waits for ready()
before checking execute(), including secondary-runtime loading. Staged-readiness
regressions pass in both browsers. Standards recheck has 0 remaining findings.

## Spec review

The same SDK readiness finding was fixed and independently rechecked. Pending
UI, timestamps/history, severe events, deduplication resets, draft restoration,
optional configuration and stale-result cancellation meet the approved plan.
Spec recheck has 0 remaining findings.
