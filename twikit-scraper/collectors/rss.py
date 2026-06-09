"""
RSS feed collector for OSINT data from conflict/disaster monitoring services.
"""

import httpx
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Optional


# ─── Feed Sources ───
FEEDS = [
    {
        "name": "GDACS Alerts",
        "url": "https://www.gdacs.org/xml/rss.xml",
        "type": "disaster",
    },
    {
        "name": "ReliefWeb Updates",
        "url": "https://api.reliefweb.int/v1/reports?appname=orb&limit=10&fields[include][]=title&fields[include][]=date.created&fields[include][]=country.name&fields[include][]=source.shortname&format=json",
        "type": "humanitarian",
        "is_json": True,
    },
]


async def _fetch_xml_feed(
    client: httpx.AsyncClient,
    url: str,
    feed_name: str,
) -> list[str]:
    """Parse XML/RSS feed and extract headlines."""
    items = []
    try:
        response = await client.get(url, timeout=15.0)
        if response.status_code != 200:
            print(f"[RSS] {feed_name} returned {response.status_code}")
            return []

        # Parse XML
        root = ET.fromstring(response.text)

        # Handle RSS 2.0 format
        for item in root.findall(".//item"):
            title_el = item.find("title")
            desc_el = item.find("description")
            pub_date_el = item.find("pubDate")

            title = title_el.text if title_el is not None else "Unknown"
            # Clean CDATA
            title = title.replace("<![CDATA[", "").replace("]]>", "").strip()

            desc = ""
            if desc_el is not None and desc_el.text:
                desc = desc_el.text.replace("<![CDATA[", "").replace("]]>", "").strip()
                desc = desc[:200]  # Truncate long descriptions

            date_str = ""
            if pub_date_el is not None and pub_date_el.text:
                date_str = pub_date_el.text.strip()

            items.append(
                f"[{feed_name}] {title}"
                + (f" — {desc}" if desc else "")
                + (f" ({date_str})" if date_str else "")
            )

        print(f"[RSS] Collected {len(items)} items from {feed_name}")
    except ET.ParseError as e:
        print(f"[RSS] XML parse error for {feed_name}: {e}")
    except Exception as e:
        print(f"[RSS] Error fetching {feed_name}: {e}")

    return items[:10]  # Max 10 per feed


async def _fetch_json_feed(
    client: httpx.AsyncClient,
    url: str,
    feed_name: str,
) -> list[str]:
    """Fetch JSON API feed (e.g., ReliefWeb)."""
    items = []
    try:
        response = await client.get(url, timeout=15.0)
        if response.status_code != 200:
            print(f"[RSS] {feed_name} returned {response.status_code}")
            return []

        data = response.json()

        # Handle ReliefWeb format
        if "data" in data:
            for entry in data["data"][:10]:
                fields = entry.get("fields", {})
                title = fields.get("title", "Unknown")
                countries = fields.get("country", [])
                country_names = [c.get("name", "") for c in countries][:3]
                source = fields.get("source", [{}])
                source_name = source[0].get("shortname", "") if source else ""

                item_text = f"[{feed_name}] {title}"
                if country_names:
                    item_text += f" — {', '.join(country_names)}"
                if source_name:
                    item_text += f" (via {source_name})"
                items.append(item_text)

        print(f"[RSS] Collected {len(items)} items from {feed_name}")
    except Exception as e:
        print(f"[RSS] Error fetching {feed_name}: {e}")

    return items


async def collect_rss_feeds() -> list[str]:
    """
    Collect headlines from all configured RSS/API feeds.

    Returns:
        List of formatted OSINT headline strings.
    """
    all_items = []

    async with httpx.AsyncClient() as client:
        for feed in FEEDS:
            if feed.get("is_json"):
                items = await _fetch_json_feed(
                    client, feed["url"], feed["name"]
                )
            else:
                items = await _fetch_xml_feed(
                    client, feed["url"], feed["name"]
                )
            all_items.extend(items)

    print(f"[RSS] Total collected: {len(all_items)} items from {len(FEEDS)} feeds")
    return all_items
