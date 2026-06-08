# Twikit Scraper Microservice (for Railway)

This is a lightweight Python FastAPI microservice that uses `twikit` to scrape tweets from X (Twitter).
It is designed to be deployed on [Railway.app](https://railway.app/).

## Deployment Instructions on Railway

1. Push this folder to a GitHub repository.
2. In Railway, click **New** -> **GitHub Repo** -> select the repository.
3. Add the following **Environment Variables** in Railway:
   - `TWITTER_USERNAME`: Your alt X account username
   - `TWITTER_EMAIL`: Your alt X account email
   - `TWITTER_PASSWORD`: Your alt X account password
   - `API_KEY`: A secret key you make up (e.g., `my_secret_key_123`)
   - `DATA_DIR`: `/app/data`
4. Add a **Volume** in Railway (to store `cookies.json` persistently):
   - Go to your service settings -> **Volumes** -> Add Volume
   - Set the mount path to `/app/data`
5. Railway will automatically detect `requirements.txt` and start the server using Uvicorn if you provide a start command.
   - Go to Settings -> **Deploy** -> **Custom Start Command**
   - Set it to: `uvicorn main:app --host 0.0.0.0 --port $PORT`

## Local Development

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```
