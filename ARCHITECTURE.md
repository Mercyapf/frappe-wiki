# Architecture

## Overview
- Backend app lives in `wiki/` (Frappe app, Python).
- Frontend SPA lives in `frontend/` (Vue + Frappe UI) and is shipped to `/assets/wiki/frontend`.

## DocTypes in Use
Source of truth for schema is `wiki/wiki/doctype/**/**/*.json`.

- Migrate To Wiki (`wiki/wiki/doctype/migrate_to_wiki/migrate_to_wiki.json`)
  - Admin utility to migrate legacy docs into Wiki.
  - Creates legacy sidebar entries and Wiki Pages from filesystem paths in `wiki/wiki/doctype/migrate_to_wiki/migrate_to_wiki.py`.
- Wiki App Switcher List Table (`wiki/wiki/doctype/wiki_app_switcher_list_table/wiki_app_switcher_list_table.json`)
  - Child table that powers the app switcher list in Wiki Settings.
  - Links to `Wiki Space`.
- Wiki Feedback (`wiki/wiki/doctype/wiki_feedback/wiki_feedback.json`)
  - Stores ratings and feedback for a wiki page.
  - Links to `Wiki Page` and (external) `Wiki Document`.
- Wiki Group Item (`wiki/wiki/doctype/wiki_group_item/wiki_group_item.json`)
  - Child table for sidebar group entries (label + page link + visibility).
  - Links to `Wiki Page`; used by `Wiki Space.wiki_sidebars`.
- Wiki Page (`wiki/wiki/doctype/wiki_page/wiki_page.json`)
  - Core content DocType, rendered as website pages via `WebsiteGenerator`.
  - Owns markdown content, route, publish/guest access flags, and metadata.
  - Creates `Wiki Page Revision` entries on insert/update (see `wiki/wiki/doctype/wiki_page/wiki_page.py`).
- Wiki Page Patch (`wiki/wiki/doctype/wiki_page_patch/wiki_page_patch.json`)
  - Contribution workflow for edits or new pages, including review status.
  - Links to `Wiki Page` and users (`raised_by`, `approved_by`), can create new pages.
- Wiki Page Revision (`wiki/wiki/doctype/wiki_page_revision/wiki_page_revision.json`)
  - Stores a snapshot of page content + message + author.
  - Child table `Wiki Page Revision Item` links revisions to pages.
- Wiki Page Revision Item (`wiki/wiki/doctype/wiki_page_revision_item/wiki_page_revision_item.json`)
  - Child table that links a revision to one or more `Wiki Page` records.
- Wiki Settings (`wiki/wiki/doctype/wiki_settings/wiki_settings.json`)
  - Global wiki configuration (logos, navbar, search, JS, feedback).
  - Includes child tables for navbar items (external `Top Bar Item`) and app switcher list.
- Wiki Sidebar (`wiki/wiki/doctype/wiki_sidebar/wiki_sidebar.json`)
  - Legacy sidebar grouping DocType still used by the migration flow.
  - Newer sidebar structure uses `Wiki Space` + `Wiki Group Item`.
- Wiki Space (`wiki/wiki/doctype/wiki_space/wiki_space.json`)
  - Top-level space for grouping pages and navigation.
  - Holds `wiki_sidebars` (`Wiki Group Item`), navbar items, and space branding.
  - Creates a root group in external `Wiki Document` for v3 migration (see `wiki/wiki/doctype/wiki_space/wiki_space.py`).

External DocTypes referenced by links:
- `User` (review/approval).
- `Top Bar Item` (navbar config).
- `Wiki Document` (v3 structure and root group creation).
- `Wiki Sidebar Item` (legacy migration; defined outside this app).

## Frontend (Frappe UI)
- SPA is initialized in `frontend/src/main.js` and wrapped by `FrappeUIProvider` in `frontend/src/App.vue`.
- Uses `frappe-ui` resource helpers and UI components across pages and components in `frontend/src/**`.
- The compiled assets are referenced by `wiki/www/wiki.html`.

## Public Page Rendering
- Wiki pages are rendered by `Wiki Page` (WebsiteGenerator) with context built in
  `wiki/wiki/doctype/wiki_page/wiki_page.py` (metadata, sidebar, TOC, revisions, etc.).
- `/wiki` route uses a Vue SPA entry point:
  - `wiki/www/wiki.html` loads `/assets/wiki/frontend/assets/*` and injects boot data.
  - `wiki/www/wiki.py` provides the boot context (CSRF token, site info).
- `/contributions` and `/drafts` are server-rendered Jinja pages:
  - Templates: `wiki/www/contributions.html`, `wiki/www/drafts.html`.
  - Context + pagination APIs: `wiki/www/contributions.py`, `wiki/www/drafts.py`.
