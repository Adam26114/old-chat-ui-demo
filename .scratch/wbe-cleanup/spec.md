# WBE-only cleanup

Status: resolved

## Request

Keep only the WBE integration and remove unused WBE2, Myroompass, and dead code.

## Scope

- Retain the Bay Hotel guest page, favicon, green-and-ivory concierge,
  shadcn/ui, assistant-ui, and WBE production/staging widget outputs.
- Remove WBE2/Myroompass commands, local mode files, stale output directories,
  host auth listeners, and worker messages only used by those listeners.
- Build the guest page with the production WBE configuration.
- Remove unused Recoil state infrastructure, jsrsasign-util, legacy chat CSS,
  starter logos, and unreferenced chat-server JSON samples.
- Preserve WBE props/exports, JWT fields, Socket.IO authentication/chat,
  server logout/expiry, host trigger events, storage, and worker fallback.
- Update current documentation and the lockfile to describe the WBE-only setup.

## Verification

Use the existing guest-page and widget browser seams and suite. This is a
cleanup, so no new product behavior or implementation-coupled tests are needed.
Run typechecking, linting, both WBE widget builds, and the landing build.
Review against baseline 127d36e before committing and publishing the feature
branch and main using the established Git workflow.

## Results

- Typechecking and linting passed.
- All 36 Chromium/WebKit browser checks passed using development.wbe with
  isolated fixture configuration.
- Production/staging WBE widget builds and the production WBE landing build passed.
- Package and lockfile dependencies agree; four packages were removed including
  the two unused direct dependencies and their exclusive dependencies.
- The six obsolete local mode files and four obsolete build trees were removed.
- The landing JavaScript bundle shrank by 60.30 kB (1,120.56 to 1,060.26 kB).

## Standards

Manual review against 127d36e found no documented-standard violations or
actionable new code smells. The removals simplify existing code without adding
interfaces or abstractions.

## Spec

Manual review found no missing requirements or scope creep. WBE JWT fields,
props/exports, server logout/expiry and trigger handling, storage, and worker
fallback remain intact; only unused integration paths are removed.

Parallel review agents were dispatched but could not complete because of the
account usage limit. The parent completed both review axes locally.

Findings: Standards 0; Spec 0.
