<!-- frontmatter: {
    "title":"Valenfind",
    "date":"2026-02-13",
    "platform":"TryHackMe",
    "event":"Love at First Breach",
    "category":"Web",
    "difficulty":"Medium",
    "tags":["LFI"],
    "summary":"Exploited a path traversal/LFI in dynamic layout loading to read application source, recover an admin API token, and dump the SQLite user database via an internal export endpoint.",
    "image":"thm_valenfind.png"
} -->

# Valenfind

## TL;DR

- **Entry:** A client-side feature calls `/api/fetch_layout?layout=...` with user-controlled input, enabling path traversal/LFI.
- **Execution:** Use LFI to read `app.py`, extract `ADMIN_API_KEY`, and identify privileged endpoints.
- **PrivEsc:** Reuse the leaked admin token against `/api/admin/export_db`.
- **Loot:** Downloaded `leak.db` and extracted user records, including the admin account row containing the flag location.

---

## Context

![](assets/thm_valenfind.png)

This challenge is part of the **Love at First Breach (2026)** event on TryHackMe.

The description hints the app was "vibe coded," so source inspection was the first move.

---

## Recon

### Source code hint in profile page

Reviewing front-end source on the profile page revealed the dynamic layout feature:

![](assets/dynamic_theme_lfi_source_code.png)

The JavaScript shows a `layout` query parameter being sent directly to backend layout fetch logic.

---

## Vulnerability Analysis

Root cause: untrusted `layout` input reaches a server-side file read path with insufficient canonicalization/allowlisting.

Evidence (front-end call path):

```html
function loadTheme(layoutName) {
  // Feature: Dynamic Layout Fetching
  // Vulnerability: 'layout' parameter allows LFI
  fetch(`/api/fetch_layout?layout=${layoutName}`)
}
```

Why exploitable:

- `layout` is attacker-controlled.
- Backend appears to resolve this into a filesystem path.
- Traversal payloads can escape intended template directories and read arbitrary local files.

---

## Exploitation

### 1) Confirm LFI

Use traversal payloads against `/api/fetch_layout` to read system files:

![](assets/lfi_exploitation_etcpasswd.png)

Successful reads of `/etc/passwd` confirm LFI/path traversal.

### 2) Read application source

Pull `app.py` through the same primitive:

![](assets/apppy.png)

From source code:

- recovered `ADMIN_API_KEY`
- discovered privileged endpoint: `/api/admin/export_db`

### 3) Dump database with leaked admin token

![](assets/export_db_api.png)

```bash
curl -sS \
  -H "X-Valentine-Token: <ADMIN_API_KEY>" \
  "http://<TARGET_IP>:5000/api/admin/export_db" \
  -o leak.db
```

### 4) Extract sensitive data

```bash
sqlite3 leak.db ".tables"
sqlite3 leak.db "SELECT * FROM users;"
```

The dump includes the admin row (`cupid`) and the flag-bearing address field.

---

## Notes & Mitigations

1. Enforce strict allowlists for layout/theme names (`[a-z0-9_-]` IDs only), not file paths.
2. Resolve paths server-side and verify they stay within a fixed template directory.
3. Remove secrets from source; load admin credentials from environment/secret manager.
4. Replace static admin tokens with short-lived, scoped credentials.
5. Gate admin export endpoints behind proper authz and audit logging.
6. Encrypt and hash sensitive user data (never store plaintext passwords).

