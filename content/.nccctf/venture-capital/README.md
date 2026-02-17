<!-- frontmatter: {
    "title":"Venture Capital",
    "date":"2026-02-07",
    "platform":"NCC CTF",
    "event":"MasterCard CTF",
    "category":"Crypto",
    "difficulty":"Hard",
    "tags":["aes-ctr","keystream-reuse","oracle"],
    "summary":"Recovered the admin wallet and flag response by abusing AES-CTR keystream reuse via a known-plaintext oracle.",
    "image":""
} -->

# Venture Capital

## TL;DR

- **Entry:** Encrypted API responses in AES-CTR with a single global nonce.
- **Execution:** Use a known-plaintext response to recover the keystream, decrypt `/wallets/all`, then send funds to the admin wallet to leak the flag message.

---

## Recon

### Provided materials

- Full server source code (`crypto/venture-capital/`), including crypto utilities and API routes.
- `Dockerfile` + `entrypoint.sh` for a self-contained test environment.

### Server logic

The server is an API to manage crypto wallets. Wallets are stored in a single table and include an `on_return` field.

`crypto/venture-capital/lib/models/wallet.py`
```python
class Wallet(Base):
    __tablename__ = "wallets"
    id: Mapped[str] = mapped_column(
        "id", primary_key=True, unique=True, default=lambda _: str(uuid4())
    )
    wallet: Mapped[str] = mapped_column("wallet_id", Text, unique=False, nullable=False)
    crypto: Mapped[str] = mapped_column(
        "crypto_type", nullable=False, unique=False, default="btc"
    )
    amount: Mapped[int] = mapped_column(
        "amount", Integer, unique=False, nullable=False, default=0
    )
    on_return: Mapped[str] = mapped_column(
        "on_return_msg", Text, nullable=False, default=""
    )
```

Encryption is a single global AES-CTR keystream in `lib/core/crypto.py`:
```python
NONCE = os.urandom(12)
KEY = os.urandom(32)

def crypt(s: str | bytes, key: bytes = KEY, nonce: bytes = NONCE) -> str:
    ctr = Counter.new(32, prefix=nonce, initial_value=0, little_endian=False)
    cipher = AES.new(key, AES.MODE_CTR, counter=ctr)
    o = s
    if isinstance(s, str):
        o = s.encode("utf-8")
    return standard_b64encode(cipher.encrypt(o)).decode("ascii")
```

An admin wallet is created at startup with the flag as `on_return` in `crypto/venture-capital/main.py`:
```python
with dbconnection() as sess:
    sess.add(
        Wallet(
            wallet=wallet,
            on_return=flag,
        )
    )
```

### Response behavior

All replies are wrapped in a `Reply` model that encrypts the `message` field.

`lib/routes/wallets.py`
```python
class Reply(BaseModel):
    message: str
    @field_validator("message", mode="before")
    @classmethod
    def process_content(cls, msg):
        if isinstance(msg, str):
            return crypt(msg.strip())
        if isinstance(msg, bytes):
            return crypt(msg)
        raise RuntimeError(f"invalid type passed into model, was type {type(msg)}")
```

We need a way to decrypt messages. 
`/wallets/all` filters wallets containing `ADMIN` and pickles their IDs in `lib/routes/wallets.py`:
```python
@router.get("/all", response_model=Reply)
async def get_wallets():
    try:
        with dbconnection() as sess:
            wallets: list[Wallet] = (
                sess.query(Wallet).filter(Wallet.wallet.contains("ADMIN")).all()
            )
            dump = pickle.dumps(list(map(lambda x: x.wallet, wallets)))
            ...
            return Reply(message=dump)
```

Also, `/wallets/create` returns a predictable response.
```python
@router.post("/create", response_model=Reply, status_code=201)
async def create_wallet(response: Response, payload: CreateWalletModel):
...
            return Reply(message=f"created wallet {payload.wallet}")
```

So we can use it to recover a keystream long enough to decrypt the admin-wallet list.
```python
def make_keystream(min_len: int) -> bytes:
    size = max(64, min_len)
    while True:
        wallet_name = f"{os.urandom(4).hex()}" + ("A" * size) # To make sure the key stream is long enough
        resp = requests.post(
            f"{URL_BASE}/wallets/create", json={"wallet": wallet_name}
        ).json()
        ct = base64.b64decode(resp["message"])
        pt = f"created wallet {wallet_name}".encode()
        keystream = xor(ct, pt)
        if len(keystream) >= min_len:
            return keystream
        size *= 2
```

Finally, only `/wallets/send_funds` endpoint returns a wallet’s `on_return`.
```python
@router.post("/send_funds", response_model=Reply, status_code=200)
async def send_funds(response: Response, payload: SendFundsModel):
...
            return Reply(
                message=f"sent {payload.amount} to {to_wallet.wallet}. it replied {to_wallet.on_return}"
            )
```

To call that endpoint, we need access to an existing wallet:
```python
        with dbconnection() as sess:
            from_wallet: Wallet | None = sess.scalars(
                select(Wallet).where(Wallet.wallet == payload.from_wallet)
            ).one_or_none()

            if from_wallet is None:
                response.status_code = 400
                return Reply(
                    message=f"the sending wallet {payload.from_wallet} doesn't exist!"
                )
```

With enough funds: 
```python
            if from_wallet.amount < payload.amount:
                response.status_code = 400
                return Reply(
                    message=f"not enough funds to send from {from_wallet.wallet} to {to_wallet.wallet}"
                )
```

So we just need to create our own wallet and fund it.

## Exploitation

```python
# decrypt /wallets/all to get admin wallet list
resp = requests.get(f"{URL_BASE}/wallets/all").json()
ct2 = b64dec(resp["message"])
keystream = make_keystream(len(ct2))
pt2 = xor(ct2, keystream[: len(ct2)])
admin_wallets = pickle.loads(pt2)
admin = admin_wallets[0]
print("admin wallet:", admin)

# create & fund our wallet
my_wallet = "hacker"
requests.post(f"{URL_BASE}/wallets/create", json={"wallet": my_wallet})
requests.post(f"{URL_BASE}/wallets/add_funds", json={"wallet": my_wallet, "amount": 1})

# send funds to admin and decrypt response to get flag
resp = requests.post(f"{URL_BASE}/wallets/send_funds", json={
    "from_wallet": my_wallet,
    "to_wallet": admin,
    "amount": 1
}).json()
ct3 = b64dec(resp["message"])
if len(keystream) < len(ct3):
    keystream = make_keystream(len(ct3))
pt3 = xor(ct3, keystream[:len(ct3)])
print(pt3.decode())
```

---

## Notes / Mitigations

- Never reuse AES-CTR nonces; generate a fresh nonce per response and include it with the ciphertext.
- Prefer authenticated encryption like AES-GCM or ChaCha20-Poly1305 to prevent misuse and tampering.
- Avoid encrypting predictable templates with a shared keystream across endpoints.

