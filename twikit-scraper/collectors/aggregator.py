"""
Aggregator — merges OSINT data from all collectors, deduplicates, and ranks.
"""

from collectors.twitter import collect_tweets
from collectors.rss import collect_rss_feeds


async def collect_all_osint(
    twitter_handles: list[str] | None = None,
    max_tweets: int = 5,
) -> list[str]:
    """
    Collect and merge OSINT data from all available sources.

    Sources:
        1. Twitter/X (via Twikit)
        2. RSS feeds (GDACS, ReliefWeb)

    Returns:
        Deduplicated, merged list of OSINT intelligence items.
    """
    all_items = []

    # 1. Twitter collection
    try:
        tweets = await collect_tweets(
            handles=twitter_handles,
            max_items=max_tweets,
        )
        all_items.extend(tweets)
    except Exception as e:
        print(f"[Aggregator] Twitter collection failed: {e}")

    # 2. RSS feeds collection
    try:
        rss_items = await collect_rss_feeds()
        all_items.extend(rss_items)
    except Exception as e:
        print(f"[Aggregator] RSS collection failed: {e}")

    # Deduplication (simple: remove exact duplicates)
    seen = set()
    unique_items = []
    for item in all_items:
        normalized = item.strip().lower()
        if normalized not in seen:
            seen.add(normalized)
            unique_items.append(item)

    print(
        f"[Aggregator] Total unique OSINT items: {len(unique_items)} "
        f"(from {len(all_items)} raw)"
    )
    return unique_items
