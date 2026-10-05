"""E2E verification of F-01/F-02/F-03 fixes. Never prints cookie/token values."""
import base64
import json
import os
import urllib.request
import urllib.error

BASE = "http://localhost:3000"
JAR = "/tmp/nk-verify-jar.txt"


def call(method, path, body=None, cookie=None, origin=None, ctype="application/json"):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if data is not None:
        req.add_header("content-type", ctype)
    if origin:
        req.add_header("origin", origin)
    if cookie:
        req.add_header("cookie", cookie)

    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(),
        urllib.request.HTTPRedirectHandler(),
    )
    opener.addheaders = []
    try:
        with opener.open(req, timeout=60) as res:
            raw = res.read().decode("utf-8", "replace")
            status = res.status
            set_cookie = res.headers.get_all("set-cookie") or []
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        status = e.code
        set_cookie = e.headers.get_all("set-cookie") or []

    for header in set_cookie:
        if header.lower().startswith("nk_session="):
            value = header.split(";", 1)[0].split("=", 1)[1].strip()
            with open(JAR, "w") as fh:
                fh.write("# captured by verify script\n")
                for part in value.split("."):
                    fh.write(part + "\n")
                fh.write(".\n")

    out = {"status": status}
    try:
        parsed = json.loads(raw)
        out["code"] = (parsed.get("error") or {}).get("code")
        data_field = parsed.get("data")
        if isinstance(data_field, dict):
            for k in ("role", "adminRole", "id", "email"):
                if k in data_field:
                    out[k] = data_field[k]
        elif isinstance(data_field, list):
            out["count"] = len(data_field)
    except Exception:
        out["body_head"] = raw[:120]
    return out


def read_jar_value():
    if not os.path.exists(JAR):
        return None, 0
    token = None
    for line in open(JAR):
        line = line.strip()
        if not line or line.startswith("#") or line == ".":
            continue
        token = (token + "." + line) if token else line
    return token, len(token or "")


print("1. login admin (same-origin)")
r = call("POST", "/api/auth/login",
         {"email": "admin@ngekost.id", "password": "Password123!"},
         origin=BASE)
print("   ", r)

token, token_len = read_jar_value()
print("    token length:", token_len, "| has signature separator:", "." in (token or ""))

if token:
    body_b64, _, sig = token.partition(".")
    padded = body_b64 + "=" * (-len(body_b64) % 4)
    payload = json.loads(base64.urlsafe_b64decode(padded))
    print("    cookie payload keys:", sorted(payload.keys()))
    print("    leaks role/adminRole:", "role" in payload or "adminRole" in payload)

    good = f"nk_session={token}"
    print("2. legit session -> /api/me")
    print("   ", call("GET", "/api/me", cookie=good))
    print("3. legit session -> /api/admin/users")
    print("   ", call("GET", "/api/admin/users", cookie=good))

    print("4. tampered signature (1 char flipped)")
    flipped = ("B" if sig[0] != "B" else "C") + sig[1:]
    print("   ", call("GET", "/api/admin/users", cookie=f"nk_session={body_b64}.{flipped}"))

    print("5. unsigned forged payload (old F-01 exploit)")
    forged = base64.urlsafe_b64encode(
        json.dumps({"userId": "attacker", "email": "a@b.test", "role": "ADMIN",
                    "adminRole": "SUPER"}).encode()).decode().rstrip("=")
    print("   ", call("GET", "/api/admin/users", cookie=f"nk_session={forged}"))

    print("6. cross-site POST with valid admin cookie (CSRF)")
    print("   ", call("POST", "/api/admin/notices",
                     {"target": "semua", "title": "E2E CSRF", "body": "should be blocked"},
                     cookie=good, origin="https://evil.example"))

    print("7. cross-site POST without cookie (CSRF origin check only)")
    print("   ", call("POST", "/api/auth/login", {"email": "x@y.z", "password": "z"},
                     origin="https://evil.example"))

    print("8. same-origin POST without Origin header (fail-closed)")
    print("   ", call("POST", "/api/auth/login", {"email": "x@y.z", "password": "z"}))