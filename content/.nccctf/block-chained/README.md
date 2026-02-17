<!-- frontmatter: {
    "title":"Block Chained",
    "date":"2026-02-07",
    "platform":"NCC CTF",
    "event":"MasterCard CTF",
    "category":"Crypto",
    "difficulty":"Easy",
    "tags":["xor","base64","mask"],
    "summary":"Recovered the message by base64-decoding and undoing a repeating XOR mask.",
    "image":""
} -->

# Block Chained

## TL;DR

- **Entry:** Given a long base64 string.
- **Execution:** Decoded base64, then XORed blocks with a repeated `deadbeef` mask length until readable ASCII appeared.

---

## Recon

### Provided data

```text
sM7djKrLxaSwnemwisWNsLWe57DvneGEkJ3JsKedy536ntKpgcvfi+rPi5Lerb7v3q2+796tvu/erb7v3q2+796tvu/erb7v3q2+796tvu/erb7v3q2+796tvu/erb7v3q2+796tvu/erb7v3q2+796tvu/erb7v3q2+796tvu/erb7v3q2+796tvu/erb7v3q2+796tvu/erb7v3q2+796tvu/erb7v3q2+796tvu/erb7v3q2+796tvu/erb7v3q2+796tvu/erb7v3q2+796tvu/erb7v3q2+796tvu/erb7v3q2+7w==
```

---

## Vulnerability Analysis

The payload is base64 text that becomes repeating 16-byte blocks after decoding. 

![](./nccctf/block-chained/cyberchef_deadbeef.png)

The solution hints at a fixed XOR mask (`deadbeef`) repeated across each block; once the correct mask length is used, the plaintext becomes readable.

---

## Exploitation

```python
import base64
import pathlib

def decode(data: str):
    raw = base64.b64decode(data)
    print(f"Raw hex: {raw.hex()}")
    for i in range(10):
        mask = bytes.fromhex("deadbeef" * i)
        out = bytearray()
        for j in range(0, len(raw), 16):
            blk = raw[j : j + 16]
            out.extend(bytes(a ^ b for a, b in zip(blk, mask)))
        print(bytes(out).rstrip(b"\x00").decode("utf-8", errors="replace"))

path = pathlib.Path("block-chained.txt")
data = path.read_text(encoding="ascii").strip()
decode(data)
```
