"""Create or promote a PitchProof administrator account using PostgreSQL."""

import asyncio
import getpass
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from app.auth.security import hash_password  # noqa: E402
from app.database import UsersRepository, setup_database  # noqa: E402


async def main() -> None:
    email = input("Admin email: ").strip().lower()
    name = input("Admin name: ").strip()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise SystemExit("Enter a valid email address.")
    if not name:
        raise SystemExit("Admin name cannot be empty.")

    password = getpass.getpass("Admin password (12+ characters): ")
    confirmation = getpass.getpass("Confirm password: ")
    if len(password) < 12:
        raise SystemExit("Admin passwords must be at least 12 characters long.")
    if len(password.encode("utf-8")) > 72:
        raise SystemExit("Admin passwords must be no more than 72 UTF-8 bytes.")
    if password != confirmation:
        raise SystemExit("Passwords do not match.")

    await setup_database()
    existing = await UsersRepository.find_one({"email": email})
    now = datetime.now(timezone.utc)
    if existing:
        await UsersRepository.update_one(
            {"id": existing["id"]},
            {"$set": {
                "name": name,
                "password_hash": hash_password(password),
                "role": "admin",
            }}
        )
    else:
        await UsersRepository.insert_one({
            "name": name,
            "email": email,
            "password_hash": hash_password(password),
            "role": "admin",
            "created_at": now,
            "last_login_at": now,
        })
    print(f"Administrator account ready for {email}.")


if __name__ == "__main__":
    asyncio.run(main())
