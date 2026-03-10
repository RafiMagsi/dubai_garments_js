from __future__ import annotations

import string


def to_lead_code(lead_id: str) -> str:
    alphabet = string.digits + string.ascii_uppercase
    number = int(lead_id.replace("-", ""), 16)
    base36 = ""
    while number:
        number, rem = divmod(number, 36)
        base36 = alphabet[rem] + base36
    return (base36 or "0").rjust(6, "0")[-6:]
