<!-- frontmatter: {
    "title":"Human IO",
    "date":"2026-02-07",
    "platform":"NCC CTF",
    "event":"MasterCard CTF",
    "category":"Crypto",
    "difficulty":"Easy",
    "tags":["encoding","dna"],
    "summary":"Decoded a DNA-style base-4 encoding to recover the hidden message.",
    "image":""
} -->

# Human IO

## TL;DR

- **Entry:** Given a long string over A/C/G/T.
- **Execution:** Tried permutations of the 2-bit mapping for A/C/G/T until ASCII decoded cleanly.

---

## Recon

### Provided data

```text
CTGTCTAGCTAGCTAGCGCACTCTCGTGCTTAAGCACTGACACTCCGGCTACAGCCCCGGCTGCCCCCCTAGCATACCGGCTATCGCCAGCGCCGGAGCGCGCGAGACCTAGAGAGCCGGAGCAAGCCCCGGAGAGCTGACACCCTCGAGCACTGTAGCGCCGGAGTAAGAAAGAACTAGCTACCTACCGGC
```

---

## Vulnerability Analysis

The ciphertext uses only four symbols (A, C, G, T), which is characteristic of base-4/DNA encoding. We can decode it by mapping symbols to permutation or bits.

---

## Exploitation

```python
import itertools
import pathlib

path = pathlib.Path("human-io.txt")
ct = path.read_text(encoding="ascii").strip()

symbols = ["A", "C", "G", "T"]
bitpairs = ["00", "01", "10", "11"]

for perm in itertools.permutations(bitpairs):
    mapping = dict(zip(symbols, perm))
    bits = "".join(mapping[ch] for ch in ct)
    out = bytes(int(bits[i:i+8], 2) for i in range(0, len(bits), 8))
    if all(32 <= b <= 126 or b in (10, 13) for b in out):
        print(mapping)
        print(out.decode("ascii"))
```

