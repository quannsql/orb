"""
Twitter/X scraper using Twikit — extracted from original main.py.
"""

import os
import asyncio
from twikit import Client
import twikit.user

# ─── Monkey Patches ───
original_init = twikit.user.User.__init__

def patched_init(self, client, data):
    try:
        original_init(self, client, data)
    except KeyError:
        pass

twikit.user.User.__init__ = patched_init

# ─── Configuration ───
DATA_DIR = os.getenv("DATA_DIR", "./data")
COOKIES_FILE = os.path.join(DATA_DIR, "cookies.json")
os.makedirs(DATA_DIR, exist_ok=True)

DEFAULT_HANDLES = [
    "visegrad24",
    "warsurv",
    "KobeissiLetter",
]

client = Client("en-US")

# Bypass ClientTransaction issues
client.client_transaction.init = lambda *a, **k: asyncio.sleep(0)
client.client_transaction.generate_transaction_id = lambda *a, **k: "dummy"


async def _ensure_login():
    """Authenticate with Twitter using cookies or credentials."""
    TWITTER_USERNAME = os.getenv("TWITTER_USERNAME")
    TWITTER_EMAIL = os.getenv("TWITTER_EMAIL")
    TWITTER_PASSWORD = os.getenv("TWITTER_PASSWORD")
    AUTH_TOKEN = os.getenv("AUTH_TOKEN")
    CT0 = os.getenv("CT0")

    try:
        if os.path.exists(COOKIES_FILE):
            print("[Twitter] Loading cookies from", COOKIES_FILE)
            client.load_cookies(COOKIES_FILE)
        elif AUTH_TOKEN and CT0:
            print("[Twitter] Using AUTH_TOKEN and CT0 from environment")
            client.set_cookies({"auth_token": AUTH_TOKEN, "ct0": CT0})
            client.save_cookies(COOKIES_FILE)
        else:
            if not all([TWITTER_USERNAME, TWITTER_EMAIL, TWITTER_PASSWORD]):
                raise Exception(
                    "Missing Twitter credentials or AUTH_TOKEN/CT0"
                )
            print("[Twitter] Logging in with credentials...")
            await client.login(
                auth_info_1=TWITTER_USERNAME,
                auth_info_2=TWITTER_EMAIL,
                password=TWITTER_PASSWORD,
            )
            client.save_cookies(COOKIES_FILE)
            print("[Twitter] Login successful. Cookies saved.")
    except Exception as e:
        print("[Twitter] Login failed:", str(e))
        raise


async def collect_tweets(
    handles: list[str] | None = None,
    max_items: int = 5,
) -> list[str]:
    """
    Collect latest tweets from specified handles.

    Returns:
        List of formatted tweet strings: '@handle: "tweet text"'
    """
    handles = handles or DEFAULT_HANDLES

    try:
        await _ensure_login()
    except Exception as e:
        print(f"[Twitter] Authentication failed: {e}")
        return []

    all_tweets = []
    for handle in handles:
        try:
            print(f"[Twitter] Fetching tweets for @{handle}...")
            user = await client.get_user_by_screen_name(handle)
            if not user:
                continue

            tweets = await client.get_user_tweets(user.id, "Tweets")
            count = 0
            for tweet in tweets:
                if count >= max_items:
                    break
                text = tweet.text.replace("\n", " ")
                all_tweets.append(f'@{handle}: "{text}"')
                count += 1

            await asyncio.sleep(2)  # Rate limit avoidance
        except Exception as e:
            print(f"[Twitter] Error fetching @{handle}: {e}")
            continue

    print(f"[Twitter] Collected {len(all_tweets)} tweets from {len(handles)} handles")
    return all_tweets
