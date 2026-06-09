"""
Robust Pollinations API client with model fallback, retry, and temperature control.
"""

import os
import json
import asyncio
import httpx
from typing import Optional

MODELS = ["grok-4.3", "openai-large", "qwen-vision-pro", "gpt-5.5"]

API_URL = "https://gen.pollinations.ai/v1/chat/completions"

# Temperature presets per agent role
TEMPERATURE_MAP = {
    "military": 0.3,    # Conservative, factual
    "economic": 0.4,    # Analytical
    "social": 0.5,      # Balanced
    "fact_checker": 0.7, # Creative, challenging
    "synthesizer": 0.4,  # Analytical
    "default": 0.5,
}


async def query_pollinations(
    messages: list[dict],
    json_mode: bool = False,
    agent_role: str = "default",
    temperature: Optional[float] = None,
    max_retries: int = 2,
    timeout_seconds: float = 60.0,
) -> str:
    """
    Query Pollinations API with model fallback chain and exponential backoff.

    Args:
        messages: Chat messages in OpenAI format
        json_mode: If True, request JSON response format
        agent_role: Agent role for temperature selection
        temperature: Override temperature (if None, uses role default)
        max_retries: Retries per model before falling back
        timeout_seconds: Request timeout

    Returns:
        Response text content

    Raises:
        RuntimeError: If all models and retries are exhausted
    """
    api_key = os.getenv("POLLINATIONS_API_KEY")
    if not api_key:
        raise RuntimeError("POLLINATIONS_API_KEY is not configured")

    temp = temperature if temperature is not None else TEMPERATURE_MAP.get(
        agent_role, TEMPERATURE_MAP["default"]
    )

    last_error: Optional[Exception] = None

    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        for model in MODELS:
            for attempt in range(max_retries + 1):
                try:
                    backoff = (2 ** attempt) * 0.5 if attempt > 0 else 0
                    if backoff > 0:
                        print(
                            f"[Pollinations] Retry {attempt}/{max_retries} "
                            f"for model {model}, backoff {backoff:.1f}s"
                        )
                        await asyncio.sleep(backoff)

                    payload: dict = {
                        "model": model,
                        "messages": messages,
                        "temperature": temp,
                    }
                    if json_mode:
                        payload["response_format"] = {"type": "json_object"}

                    response = await client.post(
                        API_URL,
                        headers={
                            "Content-Type": "application/json",
                            "Authorization": f"Bearer {api_key}",
                        },
                        json=payload,
                    )

                    if response.status_code == 429:
                        # Rate limited — wait longer and retry
                        wait_time = min(30, (2 ** attempt) * 5)
                        print(
                            f"[Pollinations] Rate limited on {model}, "
                            f"waiting {wait_time}s..."
                        )
                        await asyncio.sleep(wait_time)
                        continue

                    response.raise_for_status()
                    data = response.json()

                    if not data.get("choices") or len(data["choices"]) == 0:
                        raise ValueError(
                            f"Empty choices in response from {model}"
                        )

                    content = data["choices"][0]["message"]["content"]
                    print(
                        f"[Pollinations] Success with model {model} "
                        f"(attempt {attempt + 1})"
                    )
                    return content

                except (httpx.HTTPStatusError, httpx.RequestError, ValueError) as e:
                    last_error = e
                    print(
                        f"[Pollinations] Error with {model} "
                        f"attempt {attempt + 1}: {e}"
                    )
                except Exception as e:
                    last_error = e
                    print(
                        f"[Pollinations] Unexpected error with {model} "
                        f"attempt {attempt + 1}: {e}"
                    )

            print(f"[Pollinations] Exhausted retries for model {model}")

    raise RuntimeError(
        f"All models failed. Last error: {last_error}"
    )


def extract_json(text: str) -> dict:
    """
    Extract JSON object from potentially messy LLM output.
    Handles markdown code blocks, thinking tags, extra text.
    """
    import re

    # Try direct parse first
    cleaned = text.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Remove markdown code blocks
    cleaned = re.sub(r"```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"```", "", cleaned)

    # Remove thinking blocks (from reasoning models)
    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", cleaned)
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Last resort: find first { ... } block
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract JSON from response: {text[:200]}...")
