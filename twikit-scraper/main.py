"""
ORB Brain — Multi-Agent Intelligence Server
FastAPI application running on Railway.

Endpoints:
    POST /scrape         — Twitter scraper (legacy, kept for compatibility)
    POST /run-sweep      — Trigger multi-agent debate sweep
    POST /simulate       — Butterfly simulation with debate
    GET  /health         — Health check with source status
    GET  /status         — Scheduler status
"""

import os
import asyncio
import time
import traceback
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment
load_dotenv(".env.local")
load_dotenv()

# API security
API_KEY = os.getenv("API_KEY", "default_secret_key")

# ─── Scheduler instance (global) ───
scheduler = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start autonomous scheduler on app startup."""
    global scheduler
    from scheduler.autonomous import AutonomousScheduler, SweepConfig

    scheduler = AutonomousScheduler(SweepConfig())

    # Launch autonomous loop as background task
    loop_task = asyncio.create_task(scheduler.run_forever())
    print("[ORB Brain] Autonomous scheduler launched as background task")

    yield

    # Shutdown
    if scheduler:
        scheduler.stop()
    loop_task.cancel()
    print("[ORB Brain] Scheduler stopped")


app = FastAPI(
    title="ORB Brain — Multi-Agent Intelligence Server",
    version="2.0.0",
    lifespan=lifespan,
)


# ═══════════════════════════════════════════════════════════
# Request/Response Models
# ═══════════════════════════════════════════════════════════

class ScrapeRequest(BaseModel):
    handles: List[str]
    max_items: int = 10
    api_key: str


class SweepRequest(BaseModel):
    force: bool = False


class SimulateRequest(BaseModel):
    lng: float
    lat: float
    scenario: str


def _verify_api_key(x_api_key: Optional[str] = Header(None, alias="X-API-Key")):
    """Verify API key from header."""
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")


# ═══════════════════════════════════════════════════════════
# Legacy Endpoint: Twitter Scraper
# ═══════════════════════════════════════════════════════════

@app.post("/scrape")
async def scrape_tweets(req: ScrapeRequest):
    """Legacy Twitter scraper endpoint."""
    if req.api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

    from collectors.twitter import collect_tweets

    try:
        tweets = await collect_tweets(
            handles=req.handles,
            max_items=req.max_items,
        )
        return {"tweets": tweets}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Scraping failed: {str(e)}"
        )


# ═══════════════════════════════════════════════════════════
# New: Multi-Agent Sweep
# ═══════════════════════════════════════════════════════════

@app.post("/run-sweep")
async def run_sweep(
    req: SweepRequest = SweepRequest(),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
):
    """
    Trigger a multi-agent debate sweep.

    If force=false, respects cooldown. If force=true, runs immediately.
    Returns the final synthesized alert with debate metadata.
    """
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

    from storage.redis_client import (
        is_cooldown_active,
        get_alert_history,
        get_debate_transcript,
    )

    # Check cooldown (unless forced)
    if not req.force and is_cooldown_active():
        history = get_alert_history()
        if history:
            latest = history[0]
            latest["cached"] = True
            # Attach debate transcript if available
            transcript = get_debate_transcript(latest.get("id", ""))
            if transcript:
                latest["debateTranscript"] = transcript
            return latest
        # No cached data, run anyway
        pass

    # Run sweep
    global scheduler
    if scheduler:
        result = await scheduler.run_once()
        if result:
            # Attach debate transcript
            from storage.redis_client import get_debate_transcript
            transcript = get_debate_transcript(result.get("id", ""))
            if transcript:
                result["debateTranscript"] = transcript
            return result

    raise HTTPException(
        status_code=500,
        detail="Sweep execution failed — no result generated",
    )


# ═══════════════════════════════════════════════════════════
# New: Butterfly Simulation with Debate
# ═══════════════════════════════════════════════════════════

@app.post("/simulate")
async def simulate_butterfly(
    req: SimulateRequest,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
):
    """
    Run butterfly simulation with multi-agent debate.
    Returns cascading impact analysis with confidence scores and dissent.
    """
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

    from storage.redis_client import get_butterfly_cache, set_butterfly_cache
    from agents.orchestrator import AgentOrchestrator

    # Check cache first
    cached = get_butterfly_cache(req.scenario, req.lng, req.lat)
    if cached:
        print(f"[ORB Brain] Serving cached butterfly simulation")
        return {**cached, "cached": True}

    try:
        # Run multi-agent debate simulation
        orchestrator = AgentOrchestrator()
        debate_result = await orchestrator.run_butterfly_debate(
            lng=req.lng,
            lat=req.lat,
            scenario=req.scenario,
        )

        final_report = debate_result.final_report
        final_report["debateSummary"] = debate_result.debate_summary
        final_report["debateDuration"] = debate_result.total_duration_seconds
        final_report["debateTranscript"] = [
            {"round": i + 1, "messages": round_data}
            for i, round_data in enumerate(debate_result.rounds)
        ]

        # Cache result
        set_butterfly_cache(req.scenario, req.lng, req.lat, final_report)

        return final_report

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Simulation failed: {str(e)}",
        )


# ═══════════════════════════════════════════════════════════
# Health & Status
# ═══════════════════════════════════════════════════════════

@app.get("/health")
async def health_check():
    """Health check with component status."""
    from storage.redis_client import get_redis

    status = {
        "status": "ok",
        "version": "2.0.0",
        "components": {
            "scheduler": "running" if scheduler and scheduler.running else "stopped",
            "redis": "unknown",
            "pollinations": "configured" if os.getenv("POLLINATIONS_API_KEY") else "missing",
            "twitter": "configured" if os.getenv("AUTH_TOKEN") or os.getenv("TWITTER_USERNAME") else "missing",
        },
    }

    # Check Redis
    try:
        redis = get_redis()
        redis.ping()
        status["components"]["redis"] = "connected"
    except Exception:
        status["components"]["redis"] = "disconnected"

    return status


@app.get("/status")
async def scheduler_status():
    """Get detailed scheduler status."""
    if not scheduler:
        return {"running": False}

    return {
        "running": scheduler.running,
        "sweep_count": scheduler.sweep_count,
        "current_interval_seconds": scheduler.current_interval,
        "current_interval_minutes": scheduler.current_interval // 60,
        "last_threat_level": scheduler.last_threat_level,
    }


# ═══════════════════════════════════════════════════════════
# Entry Point
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
