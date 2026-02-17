<!-- frontmatter: {
    "title":"Hidden Deep Into My Heart",
    "date":"2026-02-13",
    "platform":"TryHackMe",
    "event":"Love at First Breach",
    "category":"Web",
    "difficulty":"Easy",
    "tags":["Robots.txt Disclosure","Credential Exposure","Forced Browsing"],
    "summary":"Enumerated a hidden admin path from robots.txt, extracted leaked credentials from comments, authenticated to the admin portal, and recovered the flag.",
    "image":"description.png"
} -->

# Hidden Deep Into My Heart

## TL;DR

- **Entry:** `robots.txt` discloses a hidden vault path and leaks a credential-like secret in a comment.
- **Execution:** Enumerate under `/cupids_secret_vault/`, discover `/administrator`, and authenticate with leaked creds.
- **PrivEsc:** Not required (direct admin access from exposed credentials).
- **Loot:** Flag visible in the authenticated admin dashboard.

---

## Context

![](assets/description.png)

This challenge is part of the **Love at First Breach (2026)** event on TryHackMe.

---

## Recon

### 1) Inspect `robots.txt`

`/robots.txt` reveals both a sensitive path and a likely password string:

```txt
User-agent: *
Disallow: /cupids_secret_vault/*

# cupid_arrow_2026!!!
```

Findings:

- Hidden content namespace: `/cupids_secret_vault/`
- Credential candidate: `cupid_arrow_2026!!!`

### 2) Enumerate hidden directory

```bash
ffuf -u http://<TARGET_IP>:5000/cupids_secret_vault/FUZZ \
  -w /usr/share/seclists/Discovery/Web-Content/common.txt
```

Relevant result:

```txt
administrator [Status: 200]
```

---

## Exploitation

### 1) Access admin login panel

![](assets/administrator_login.png)

Discovered endpoint:

- `http://<TARGET_IP>:5000/cupids_secret_vault/administrator`

### 2) Authenticate with leaked credentials

Used:

- Username: `admin`
- Password: `cupid_arrow_2026!!!`

Login succeeds and grants access to the admin dashboard.

### 3) Retrieve flag

![](assets/admin_dashboard_flag.png)

Flag is directly exposed on the authenticated dashboard page.

## Notes & Mitigations

1. Do not place credentials/secrets in source comments, HTML, or `robots.txt`.
2. Treat `robots.txt` as public metadata; never list sensitive/private paths.
3. Enforce strong auth controls on admin routes (MFA, lockout/rate limiting).
4. Remove hardcoded/default admin credentials and rotate compromised secrets.
5. Restrict admin interfaces by network policy (VPN/IP allowlist) where possible.

