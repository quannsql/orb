"""
Multi-Agent Debate Orchestrator.
Runs a structured 2-round debate pipeline between specialized agents.

Round 1: Independent Analysis (3 domain agents in parallel)
Round 2: Cross-Examination + Synthesis (Fact-Checker challenges, then Synthesizer merges)
"""

import asyncio
import json
import time
import random
from typing import Optional
from dataclasses import dataclass, field, asdict

from agents.pollinations import query_pollinations, extract_json
from agents.prompts import (
    MILITARY_ANALYST,
    ECONOMIC_ANALYST,
    SOCIO_POLITICAL_ANALYST,
    FACT_CHECKER,
    SYNTHESIZER,
    SWEEP_CONTEXT_TEMPLATE,
    BUTTERFLY_CONTEXT_TEMPLATE,
)


@dataclass
class AgentMessage:
    agent_role: str
    phase: str  # 'analysis' | 'cross_exam' | 'synthesis'
    content: dict
    confidence_score: int = 0
    timestamp: float = field(default_factory=time.time)


@dataclass
class DebateResult:
    rounds: list[list[dict]] = field(default_factory=list)
    final_report: dict = field(default_factory=dict)
    debate_summary: str = ""
    total_duration_seconds: float = 0
    phases_completed: int = 0


class AgentOrchestrator:
    """
    Orchestrates multi-agent debate for geopolitical intelligence analysis.

    2-Round Pipeline:
        Round 1: Independent Analysis (3 agents in parallel)
        Round 2: Cross-Examination + Synthesis (Fact-Checker → Synthesizer)
    """

    def __init__(self, on_phase_update=None):
        """
        Args:
            on_phase_update: Optional async callback(phase: str, detail: str)
                             for real-time progress tracking.
        """
        self.on_phase_update = on_phase_update

    async def _notify(self, phase: str, detail: str):
        """Notify progress listener if registered."""
        if self.on_phase_update:
            try:
                await self.on_phase_update(phase, detail)
            except Exception:
                pass  # Don't let notification errors break the pipeline

    async def _run_agent(
        self,
        system_prompt: str,
        user_prompt: str,
        agent_role: str,
        json_mode: bool = True,
    ) -> dict:
        """Run a single agent and parse its JSON response."""
        response_text = await query_pollinations(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            json_mode=json_mode,
            agent_role=agent_role,
        )
        return extract_json(response_text)

    # ───────────────────────────────────────────────────────
    # Phase 1: Independent Analysis
    # ───────────────────────────────────────────────────────

    async def _phase1_independent_analysis(
        self, context_prompt: str
    ) -> tuple[dict, dict, dict]:
        """Run 3 domain agents in parallel."""
        await self._notify("phase1", "Starting independent analysis — 3 agents in parallel")

        military_task = self._run_agent(
            MILITARY_ANALYST, context_prompt, "military"
        )
        economic_task = self._run_agent(
            ECONOMIC_ANALYST, context_prompt, "economic"
        )
        social_task = self._run_agent(
            SOCIO_POLITICAL_ANALYST, context_prompt, "social"
        )

        results = await asyncio.gather(
            military_task, economic_task, social_task,
            return_exceptions=True,
        )

        # Handle failures gracefully
        mil = results[0] if not isinstance(results[0], Exception) else {
            "status": "ERROR",
            "report": f"Military agent failed: {results[0]}",
            "confidenceScore": 0,
            "dissent": "",
        }
        econ = results[1] if not isinstance(results[1], Exception) else {
            "status": "ERROR",
            "report": f"Economic agent failed: {results[1]}",
            "confidenceScore": 0,
            "dissent": "",
        }
        soc = results[2] if not isinstance(results[2], Exception) else {
            "status": "ERROR",
            "report": f"Social agent failed: {results[2]}",
            "confidenceScore": 0,
            "dissent": "",
        }

        await self._notify(
            "phase1_complete",
            f"Independent analysis complete — MIL:{mil.get('status','?')} "
            f"ECON:{econ.get('status','?')} SOC:{soc.get('status','?')}"
        )
        return mil, econ, soc

    # ───────────────────────────────────────────────────────
    # Phase 2: Cross-Examination
    # ───────────────────────────────────────────────────────

    async def _phase2_cross_examination(
        self, mil: dict, econ: dict, soc: dict
    ) -> dict:
        """Fact-checker reviews all three analyses."""
        await self._notify("phase2", "Fact-Checker cross-examining all analyses")

        user_prompt = f"""Review the following three agent analyses and identify weaknesses, inconsistencies, and biases:

### MILITARY ANALYSIS:
```json
{json.dumps(mil, indent=2)}
```

### ECONOMIC ANALYSIS:
```json
{json.dumps(econ, indent=2)}
```

### SOCIAL ANALYSIS:
```json
{json.dumps(soc, indent=2)}
```

Provide your cross-examination in the JSON format specified in your system prompt."""

        result = await self._run_agent(
            FACT_CHECKER, user_prompt, "fact_checker"
        )
        await self._notify("phase2_complete", "Cross-examination complete")
        return result

    # ───────────────────────────────────────────────────────
    # Round 2b: Synthesis
    # ───────────────────────────────────────────────────────

    async def _round2_synthesis(
        self,
        mil: dict,
        econ: dict,
        soc: dict,
        cross_exam: dict,
        context_prompt: str,
    ) -> dict:
        """Synthesize all analyses + fact-checker feedback into final report."""
        await self._notify("round2_synthesis", "Synthesizing final report from debate results")

        user_prompt = f"""Synthesize the following debated analyses into a final cohesive report:

### ORIGINAL CONTEXT:
{context_prompt}

### MILITARY ANALYSIS:
```json
{json.dumps(mil, indent=2)}
```

### ECONOMIC ANALYSIS:
```json
{json.dumps(econ, indent=2)}
```

### SOCIAL ANALYSIS:
```json
{json.dumps(soc, indent=2)}
```

### FACT-CHECKER CROSS-EXAMINATION:
```json
{json.dumps(cross_exam, indent=2)}
```

Produce the final synthesized JSON report as specified in your system prompt."""

        result = await self._run_agent(
            SYNTHESIZER, user_prompt, "synthesizer"
        )

        # Ensure required fields
        if "id" not in result or not result["id"]:
            result["id"] = f"SENTINEL-{random.randint(1000, 9999)}"

        await self._notify("round2_complete", "Synthesis complete")
        return result

    # ───────────────────────────────────────────────────────
    # Public API: Run Full Debate
    # ───────────────────────────────────────────────────────

    async def run_sweep_debate(
        self,
        osint_data: list[str],
        recent_hotspots: list[str],
        directive: str = "",
    ) -> DebateResult:
        """
        Run a 2-round debate for sentinel sweep.

        Round 1: Independent Analysis (3 agents in parallel)
        Round 2: Cross-Examination + Synthesis

        Args:
            osint_data: List of OSINT intelligence items
            recent_hotspots: Recent hotspot names to avoid
            directive: Additional directive text

        Returns:
            DebateResult with full debate transcript and final report
        """
        start_time = time.time()
        debate = DebateResult()

        context_prompt = SWEEP_CONTEXT_TEMPLATE.format(
            osint_data="\n".join(f"- {item}" for item in osint_data)
            if osint_data
            else "No live OSINT data available. Use internal knowledge of current (2025/2026) global events.",
            recent_hotspots=json.dumps(recent_hotspots),
            directive=directive or "Identify the most critical ongoing geopolitical flashpoint globally.",
        )

        # Round 1: Independent Analysis (3 agents parallel)
        mil, econ, soc = await self._phase1_independent_analysis(context_prompt)
        debate.rounds.append([
            {"agent": "military", "phase": "analysis", "data": mil},
            {"agent": "economic", "phase": "analysis", "data": econ},
            {"agent": "social", "phase": "analysis", "data": soc},
        ])
        debate.phases_completed = 1

        # Round 2a: Cross-Examination
        cross_exam = await self._phase2_cross_examination(mil, econ, soc)
        debate.phases_completed = 2

        # Round 2b: Synthesis (uses original analyses + fact-checker feedback)
        final = await self._round2_synthesis(
            mil, econ, soc, cross_exam, context_prompt
        )
        debate.rounds.append([
            {"agent": "fact_checker", "phase": "cross_exam", "data": cross_exam},
            {"agent": "synthesizer", "phase": "synthesis", "data": final},
        ])

        debate.final_report = final
        debate.total_duration_seconds = time.time() - start_time
        debate.debate_summary = (
            f"2-round debate completed in {debate.total_duration_seconds:.1f}s. "
            f"Agents: MIL({mil.get('confidenceScore', '?')}%), "
            f"ECON({econ.get('confidenceScore', '?')}%), "
            f"SOC({soc.get('confidenceScore', '?')}%). "
            f"Fact-checker raised {len(cross_exam.get('inconsistencies', []))} inconsistencies."
        )

        await self._notify("complete", debate.debate_summary)
        return debate

    async def run_butterfly_debate(
        self,
        lng: float,
        lat: float,
        scenario: str,
    ) -> DebateResult:
        """
        Run a 2-round debate for butterfly simulation.

        Round 1: Independent Analysis (3 agents in parallel)
        Round 2: Cross-Examination + Synthesis

        Args:
            lng: Longitude of the event origin
            lat: Latitude of the event origin
            scenario: Description of the hypothetical event

        Returns:
            DebateResult with simulation results
        """
        start_time = time.time()
        debate = DebateResult()

        context_prompt = BUTTERFLY_CONTEXT_TEMPLATE.format(
            scenario=scenario,
            lng=lng,
            lat=lat,
        )

        # Round 1: Independent Analysis (3 agents parallel)
        mil, econ, soc = await self._phase1_independent_analysis(context_prompt)
        debate.rounds.append([
            {"agent": "military", "phase": "analysis", "data": mil},
            {"agent": "economic", "phase": "analysis", "data": econ},
            {"agent": "social", "phase": "analysis", "data": soc},
        ])
        debate.phases_completed = 1

        # Round 2a: Cross-Examination
        cross_exam = await self._phase2_cross_examination(mil, econ, soc)
        debate.phases_completed = 2

        # Round 2b: Synthesis
        final = await self._round2_synthesis(
            mil, econ, soc, cross_exam, context_prompt
        )

        # Ensure map visuals have valid coordinates
        if "mapVisuals" not in final or not final.get("mapVisuals"):
            final["mapVisuals"] = {
                "impactZone": {"lng": lng, "lat": lat, "radiusKm": 200},
                "redirectedRoutes": [{
                    "name": "Primary Bypass Route",
                    "path": [
                        [lng, lat],
                        [lng - 1, lat - 2],
                        [lng - 2, lat - 4],
                        [lng + 1, lat - 5],
                    ],
                }],
                "migrationVectors": [{
                    "from": [lng, lat],
                    "to": [lng + 3, lat + 3],
                    "intensity": "HIGH",
                }],
            }

        debate.rounds.append([
            {"agent": "fact_checker", "phase": "cross_exam", "data": cross_exam},
            {"agent": "synthesizer", "phase": "synthesis", "data": final},
        ])

        debate.final_report = final
        debate.total_duration_seconds = time.time() - start_time
        debate.debate_summary = (
            f"2-round butterfly debate completed in "
            f"{debate.total_duration_seconds:.1f}s for scenario at "
            f"[{lng}, {lat}]."
        )

        await self._notify("complete", debate.debate_summary)
        return debate
