import re
from pathlib import Path
from datetime import datetime


def parse_srt(srt_path: Path) -> list[dict]:
    entries = []

    with open(srt_path, encoding='utf-8') as f:
        lines = f.read().split('\n')

    i = 0
    while i < len(lines):
        if lines[i].strip().isdigit() and i + 4 < len(lines):
            start_end = lines[i + 1].strip()
            data_line = lines[i + 4].strip()

            # זמני התחלה וסיום
            start_time = start_end.split('-->')[0].strip()
            time_obj = datetime.strptime(start_time, "%H:%M:%S,%f")

            # נשתמש ב־regex כדי לחלץ את הערכים מהטקסט
            lat_match = re.search(r'\[latitude:\s*([0-9.\-]+)\]', data_line)
            lon_match = re.search(r'\[longitude:\s*([0-9.\-]+)\]', data_line)
            alt_match = re.search(r'abs_alt:\s*([0-9.\-]+)', data_line)

            if lat_match and lon_match and alt_match:
                lat = float(lat_match.group(1))
                lon = float(lon_match.group(1))
                alt = float(alt_match.group(1))

                entries.append({
                    "serial-number": i,
                    "timestamp": time_obj,
                    "lat": lat,
                    "lon": lon,
                    "alt": alt
                })
        i += 102

    return entries


def find_closest_metadata(time: datetime, metadata: list[dict]) -> dict:
    if not metadata:
        raise ValueError("Metadata list is empty, cannot find closest timestamp")
    return min(metadata, key=lambda x: abs(x['timestamp'] - time))
