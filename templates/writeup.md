<!-- frontmatter: {
    "title":"Challenge Name",
    "date":"2026-02-07",
    "platform":"TryHackMe",
    "event":"",
    "category":"Web",
    "difficulty":"",
    "tags":["tag1","tag2"],
    "summary":"One-sentence overview of the attack path and result.",
    "image":""
} -->

# Challenge Name

## TL;DR

- **Entry:**
- **Execution:**
- **PrivEsc:**
- **Loot:**

---

## Recon

### Port scan

```bash
nmap -sV -Pn -oN nmap.txt <target>
```

### Content discovery

```bash
ffuf -w /path/to/wordlist -u http://<target>/FUZZ
```

---

## Vulnerability Analysis

Explain the root cause, evidence, and why it is exploitable.

---

## Exploitation

Step-by-step commands and outputs.

---

## Privilege Escalation

Show the path from user to root (or intended goal).

---

## Loot / Flags

```bash
cat flag.txt
```

---

## Notes / Mitigations

Short defensive takeaways.
