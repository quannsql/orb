"""
Autonomous sweep scheduler — runs 24/7 on Railway.
Smart frequency adjustment based on threat level.
"""

import os
import asyncio
import time
import random
from datetime import datetime, timezone
from dataclasses import dataclass

from agents.orchestrator import AgentOrchestrator
from collectors.aggregator import collect_all_osint
from storage.redis_client import (
    get_alert_history,
    save_alert_to_history,
    get_recent_hotspots,
    is_cooldown_active,
    set_cooldown,
    save_debate_transcript,
)


@dataclass
class SweepConfig:
    """Configuration for autonomous sweep scheduling."""
    base_interval: int = 1800      # 30 minutes default
    min_interval: int = 600        # 10 minutes (high alert mode)
    max_interval: int = 3600       # 60 minutes (calm mode)
    cooldown_seconds: int = 1800   # 30 minutes between sweeps


class AutonomousScheduler:
    """
    Background scheduler that runs sweep cycles autonomously.

    Features:
        - Smart frequency adjustment based on threat level
        - CRITICAL → increases to every 10 minutes
        - LOW/ELEVATED → decreases to every 60 minutes
        - Collects OSINT from all sources before each sweep
        - Writes results directly to Redis for frontend to read
    """

    def __init__(self, config: SweepConfig | None = None):
        self.config = config or SweepConfig()
        self.current_interval = self.config.base_interval
        self.running = False
        self.sweep_count = 0
        self.last_threat_level = "UNKNOWN"

        # Load from env if available
        env_interval = os.getenv("SWEEP_INTERVAL_SECONDS")
        if env_interval:
            self.config.base_interval = int(env_interval)
            self.current_interval = int(env_interval)

    async def _execute_sweep(self) -> dict | None:
        """Execute a single sweep cycle with multi-agent debate."""
        self.sweep_count += 1
        start_time = time.time()
        print(
            f"\n{'='*60}\n"
            f"[ORB Autonomous] Sweep #{self.sweep_count} starting at "
            f"{datetime.now(timezone.utc).isoformat()}\n"
            f"Current interval: {self.current_interval}s | "
            f"Last threat: {self.last_threat_level}\n"
            f"{'='*60}"
        )

        try:
            # 1. Collect OSINT data from all sources
            print("[ORB Autonomous] Phase 0: Collecting OSINT data...")
            osint_data = await collect_all_osint()
            print(f"[ORB Autonomous] Collected {len(osint_data)} OSINT items")

            # 2. Get recent hotspots to avoid
            recent_hotspots = get_recent_hotspots(limit=5)
            print(f"[ORB Autonomous] Recent hotspots to avoid: {recent_hotspots}")

            # 3. Build directive based on data availability
            if osint_data:
                directive = (
                    "Analyze the collected OSINT intelligence and identify "
                    "the most critical ongoing crisis. Extract the hotspot "
                    "location, type, and coordinates from the data."
                )
            else:
                directive = (
                    "No live OSINT data available. Use your internal knowledge "
                    "of current (2025/2026) real-world geopolitical events to "
                    "identify the most critical ongoing crisis globally. "
                    "Choose a different region from recent hotspots."
                )

            # 4. Run multi-agent debate
            print("[ORB Autonomous] Starting multi-agent debate...")
            orchestrator = AgentOrchestrator(
                on_phase_update=self._log_phase
            )
            debate_result = await orchestrator.run_sweep_debate(
                osint_data=osint_data,
                recent_hotspots=recent_hotspots,
                directive=directive,
            )

            # 5. Extract final report
            final_report = debate_result.final_report
            if not final_report or not final_report.get("hotspot"):
                print("[ORB Autonomous] WARNING: No valid report generated")
                return None

            # Ensure required fields
            final_report["id"] = f"SENTINEL-{random.randint(1000, 9999)}"
            final_report["timestamp"] = datetime.now(timezone.utc).isoformat()
            final_report["debateSummary"] = debate_result.debate_summary
            final_report["debateDuration"] = debate_result.total_duration_seconds

            # 6. Save to Redis
            save_alert_to_history(final_report)
            set_cooldown(self.config.cooldown_seconds)

            # 7. Save debate transcript
            save_debate_transcript(
                final_report["id"],
                [
                    {"round": i + 1, "messages": round_data}
                    for i, round_data in enumerate(debate_result.rounds)
                ],
            )

            duration = time.time() - start_time
            print(
                f"\n[ORB Autonomous] Sweep #{self.sweep_count} COMPLETE "
                f"in {duration:.1f}s\n"
                f"Alert: {final_report.get('title', 'N/A')}\n"
                f"Threat Level: {final_report.get('threatLevel', 'N/A')}\n"
                f"Confidence: {final_report.get('overallConfidence', 'N/A')}%\n"
                f"Debate: {debate_result.debate_summary}\n"
            )

            return final_report

        except Exception as e:
            duration = time.time() - start_time
            print(
                f"[ORB Autonomous] Sweep #{self.sweep_count} FAILED "
                f"after {duration:.1f}s: {e}"
            )
            import traceback
            traceback.print_exc()
            return None

    def _adjust_interval(self, threat_level: str):
        """Adjust sweep frequency based on threat level."""
        old_interval = self.current_interval
        self.last_threat_level = threat_level

        if threat_level == "CRITICAL":
            self.current_interval = self.config.min_interval
        elif threat_level == "HIGH":
            self.current_interval = 1200  # 20 minutes
        elif threat_level == "ELEVATED":
            self.current_interval = self.config.base_interval
        else:
            # Gradually increase interval (calm down)
            self.current_interval = min(
                self.current_interval + 300,
                self.config.max_interval,
            )

        if old_interval != self.current_interval:
            print(
                f"[ORB Autonomous] Interval adjusted: "
                f"{old_interval}s → {self.current_interval}s "
                f"(threat: {threat_level})"
            )

    async def _log_phase(self, phase: str, detail: str):
        """Callback for orchestrator progress updates."""
        print(f"  [Debate] {phase}: {detail}")

    async def run_forever(self):
        """
        Main autonomous loop — runs until process is killed.
        Called once at application startup.
        """
        self.running = True
        print(
            f"[ORB Autonomous] Starting autonomous scheduler\n"
            f"  Base interval: {self.config.base_interval}s\n"
            f"  Min interval: {self.config.min_interval}s\n"
            f"  Max interval: {self.config.max_interval}s\n"
        )

        # Initial delay to let the app fully start
        await asyncio.sleep(10)

        while self.running:
            try:
                result = await self._execute_sweep()

                if result:
                    threat_level = result.get("threatLevel", "ELEVATED")
                    self._adjust_interval(threat_level)
                else:
                    # Failed sweep — wait base interval
                    self.current_interval = self.config.base_interval

            except Exception as e:
                print(f"[ORB Autonomous] Unexpected error in loop: {e}")
                self.current_interval = self.config.base_interval

            print(
                f"[ORB Autonomous] Next sweep in {self.current_interval}s "
                f"({self.current_interval // 60} minutes)"
            )
            await asyncio.sleep(self.current_interval)

    def stop(self):
        """Stop the autonomous loop."""
        self.running = False
        print("[ORB Autonomous] Scheduler stopped")

    async def run_once(self) -> dict | None:
        """Run a single sweep (for manual/API triggers)."""
        return await self._execute_sweep()
