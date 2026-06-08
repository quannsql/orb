import os
import asyncio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from twikit import Client
import twikit.user
from typing import List
import traceback
from dotenv import load_dotenv

# Load local environment variables if present
load_dotenv('.env.local')
load_dotenv()

# --- MONKEY PATCHES TO FIX TWIKIT BUGS ---
# 1. Fix User.__init__ KeyError: 'urls'
original_init = twikit.user.User.__init__
def patched_init(self, client, data):
    try:
        original_init(self, client, data)
    except KeyError:
        pass
twikit.user.User.__init__ = patched_init
# -----------------------------------------

app = FastAPI(title="Twikit Scraper API")

# Setup environment variables for login
TWITTER_USERNAME = os.getenv("TWITTER_USERNAME")
TWITTER_EMAIL = os.getenv("TWITTER_EMAIL")
TWITTER_PASSWORD = os.getenv("TWITTER_PASSWORD")
AUTH_TOKEN = os.getenv("AUTH_TOKEN")
CT0 = os.getenv("CT0")

# API Security Key
API_KEY = os.getenv("API_KEY", "default_secret_key")

# Railway persistent volume mount path (fallback to local ./data)
DATA_DIR = os.getenv("DATA_DIR", "./data")
COOKIES_FILE = os.path.join(DATA_DIR, "cookies.json")

os.makedirs(DATA_DIR, exist_ok=True)

client = Client('en-US')

# 2. Fix ClientTransaction "Couldn't get KEY_BYTE indices" by completely bypassing it
client.client_transaction.init = lambda *a, **k: asyncio.sleep(0)
client.client_transaction.generate_transaction_id = lambda *a, **k: "dummy"

async def ensure_login():
    try:
        if os.path.exists(COOKIES_FILE):
            print("Loading cookies from", COOKIES_FILE)
            client.load_cookies(COOKIES_FILE)
        elif AUTH_TOKEN and CT0:
            print("Using AUTH_TOKEN and CT0 from environment to bypass login...")
            client.set_cookies({"auth_token": AUTH_TOKEN, "ct0": CT0})
            client.save_cookies(COOKIES_FILE)
        else:
            print("No cookies found. Logging in with credentials...")
            if not all([TWITTER_USERNAME, TWITTER_EMAIL, TWITTER_PASSWORD]):
                raise Exception("Missing Twitter credentials or AUTH_TOKEN/CT0 in environment variables.")
            
            await client.login(
                auth_info_1=TWITTER_USERNAME,
                auth_info_2=TWITTER_EMAIL,
                password=TWITTER_PASSWORD
            )
            client.save_cookies(COOKIES_FILE)
            print("Login successful. Cookies saved.")
    except Exception as e:
        print("Login failed:", str(e))
        raise e

class ScrapeRequest(BaseModel):
    handles: List[str]
    max_items: int = 10
    api_key: str

@app.post("/scrape")
async def scrape_tweets(req: ScrapeRequest):
    if req.api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

    try:
        await ensure_login()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")

    all_tweets = []
    
    try:
        for handle in req.handles:
            print(f"Fetching tweets for {handle}...")
            user = await client.get_user_by_screen_name(handle)
            if not user:
                continue
                
            tweets = await client.get_user_tweets(user.id, 'Tweets')
            count = 0
            for tweet in tweets:
                if count >= req.max_items:
                    break
                text = tweet.text.replace("\n", " ")
                all_tweets.append(f"@{handle}: \"{text}\"")
                count += 1
                
            # Sleep briefly to avoid rate limits
            await asyncio.sleep(2)
            
        return {"tweets": all_tweets}
    except Exception as e:
        print("Scraping failed with error:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
