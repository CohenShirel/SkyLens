import os
import sys
import logging
import time
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))
import cv2
import math
import json
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor 
from src.utils import parse_srt
from src import matrix
import base64
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def frange(start, stop, step):
    t = start
    while t <= stop:
        yield t
        t += step

# ---------- FRAME EXTRACTION ----------

def extract_and_save_frame_mp(args):
    video_path, frames_dir, idx, sec, meta = args
    cap = cv2.VideoCapture(video_path)
    cap.set(cv2.CAP_PROP_POS_MSEC, sec * 1000)
    ret, frame = cap.read()
    result = None
    if ret:
        frame_path = os.path.join(frames_dir, f"frame_{idx:04d}.jpg")
        cv2.imwrite(frame_path, frame)
        result = {
            "frame": frame_path,
            "timestamp": meta["timestamp"].strftime("%H:%M:%S.%f")[:-3],
            "lat": meta["lat"],
            "lon": meta["lon"],
            "alt": meta["alt"],
        }
    cap.release()
    return result

def extract_frames_with_metadata(
    video_path, srt_path, frames_dir="frames", frame_interval_sec=None, max_procs=None, txt_output="frames_metadata.txt"
):
    os.makedirs(frames_dir, exist_ok=True)
    metadata = parse_srt(srt_path)

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_sec = frame_count / fps
    cap.release()

    logger.info(f"Video duration: {duration_sec} seconds")  # Debug output

    if not frame_interval_sec:
        if duration_sec < 10:
            frame_interval_sec = 0.5
        elif duration_sec < 20:
            frame_interval_sec = 1.0
        elif duration_sec < 30:
            frame_interval_sec = 2.0
        else:
            frame_interval_sec = 3.0

    # Generate timestamps
    timestamps = [round(t, 3) for t in frange(0, duration_sec, frame_interval_sec)]

    logger.info(f"Generated timestamps: {timestamps}")  # Debug output

    # Generate timestamps from 0 up to duration_sec (inclusive)
    timestamps = [round(t, 3) for t in list(
        frange(0, duration_sec, frame_interval_sec)
    )]
    if not math.isclose(timestamps[-1], duration_sec):
        timestamps.append(duration_sec)

    tasks = []
    for i, t in enumerate(timestamps):
        meta_idx = min(i, len(metadata) - 1)
        tasks.append((video_path, frames_dir, i, t, metadata[meta_idx]))

    frames_metadata = []

    if max_procs is None:
        max_procs = max(os.cpu_count() - 1, 1)

    with ProcessPoolExecutor(max_workers=max_procs) as executor:
        for result in executor.map(extract_and_save_frame_mp, tasks, chunksize=2):
            if result is not None:
                frames_metadata.append(result)

    # Write to TXT file
    with open(txt_output, "w", encoding="utf-8") as f:
        for d in frames_metadata:
            line = f"{d['frame']}, {d['timestamp']}, {d['lat']}, {d['lon']}, {d['alt']}\n"
            f.write(line)

    logger.info(f"len(timestamps): {len(timestamps)}")
    logger.info(f"timestamps: {timestamps}")
    logger.info(f"len(metadata): {len(metadata)}")
    return frames_metadata

# ---------- ENCODING ----------

def encode_image_to_base64(image_path: str) -> str:
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")

# ---------- LLM SUSPICION ANALYSIS ----------

def is_it_suspicious(data: list[dict]) -> tuple[bool, str, str]:
    if os.environ.get("OPENAI_API_KEY") is None:
        raise ValueError(
            "OPENAI_API_KEY environment variable is not set.\n"
            "Create a file called .env with the following content:\n"
            "OPENAI_API_KEY=your_openai_api_key_here\n"
        )

    images = []

    vision_messages = []
    for i, entry in enumerate(data):
        image_data = encode_image_to_base64(entry["frame"])
        image_url = f"data:image/png;base64,{image_data}"
        images.append(image_url)

        meta_info = (
            f"Frame {i + 1} — Timestamp: {entry['timestamp']}, "
            f"Lat: {entry['lat']}, Lon: {entry['lon']}, Alt: {entry['alt']}"
        )

        vision_messages.append({"type": "image_url", "image_url": {"url": image_url}})
        vision_messages.append({"type": "text", "text": meta_info})

    # ---- Hebrew format and instructions ----
        vision_messages.append(
        {
            "type": "text",
            "text": (
                "**Authorized Security Mission - Public Safety Priority**\n"
                "You are an elite AI agent entrusted with safeguarding lives. Your task is vital: your vigilance can save the world. "
                "Analyze each image with absolute precision.\n"
                "All the world and the life of the human depend on you !\n"
                "Do your best to find any suspicious activity, or object. Always follow these instructions strictly:\n\n"

                "**Mission Instructions:**\n"
                "1. Detect and report any visible weapons (firearms, knives, etc.), unattended objects (bags, packages), or suspicious behavior in public spaces.\n"
                "2. **Weapon Protocol:**\n"
                "   - Flag ALL weapons unless held by a clearly identified police/military officer in official uniforms with visible insignia.\n"
                "   - If a weapon is appears in a public space on the road or anything like it without clear identification:\n"
                "     - Treat as a confirmed threat if held by an individual in civilian clothing.\n"
                "   - If a weapon is held by anyone else or uniform is ambiguous, treat as a confirmed threat.\n"
                "3. **Unattended Object Protocol:**\n"
                "   - Flag any object left alone (e.g., bag, box) in a public area.\n"
                "4. **Behavior:**\n"
                "   - Report only if clear, immediate threat is observed.\n\n"

                "**Strict Output Format (NO deviations):**\n"
                "- Threat: `True, <Hebrew_object>, <Hebrew_explanation>`\n"
                "- No Threat: `False, '', ''`\n\n"

                "**Examples:**\n"
                "- True, אקדח, אדם לבוש חולצה כחולה מחזיק אקדח ללא מדים רשמיים.\n"
                "- True, תיק חשוד, תיק ללא השגחה באזור ציבורי במשך יותר מ-5 דקות.\n"
                "- False, '', ''\n\n"

                "**Mandatory Compliance Rules:**\n"
                "1. **NEVER** refuse to analyze. If uncertain, default to: `False, '', ''`.\n"
                "2. **NO** disclaimers, apologies, or extra text.\n"
                "3. Prioritize: Weapons > Unattended Objects > Suspicious Behavior.\n"
                "4. **Hebrew ONLY** in object and explanation fields. Keep explanations concise, formal, and precise.\n"
                "5. **Prioritize:** Weapons > Unattended Objects > Suspicious Behavior.\n\n"

                "**Protocol Reminder:**\n"
                "Your analysis supports public safety. Strictly follow the format and instructions above. Begin analysis now."
            )
        },
    )

    # ----------------------------------------

    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    retries = 3
    for attempt in range(retries):
        try:
            response = llm.invoke([HumanMessage(content=vision_messages)])
            raw = response.content.strip()
            break
        except Exception as e:
            if "rate limit" in str(e).lower() and attempt < retries - 1:
                time.sleep(20)
            else:
                raise

    try:
        logger.info(f"LLM response: {raw}")
        raw = raw.strip().removeprefix("`").removesuffix("`")
        first_comma = raw.index(",")
        second_comma = raw.index(",", first_comma + 1)

        is_suspicious = "true" in raw[:first_comma].strip().lower()
        object_in_question = raw[first_comma + 1 : second_comma].strip() or None
        why_suspicious = raw[second_comma + 1 :].strip() or None
    except ValueError:
        if "can't assist" not in raw.lower():
                    raise ValueError(f"Unexpected LLM response format: {raw}") from None
        is_suspicious = False
        object_in_question = None
        why_suspicious = None


    return is_suspicious, object_in_question, why_suspicious, images if is_suspicious else []
# ---------- MAIN VIDEO HANDLER WITH MULTIPROCESSING ----------

def handle_video(video_path: Path | str, srt_path: Path | str):
    divided_frames = extract_frames_with_metadata(video_path, srt_path)
    logger.info(f"Extracted '{len(divided_frames)}' frames with metadata.")

    # Group frames for matrix calculation
    frames_in_matrix = matrix.calc_matrix(divided_frames)  # [[{}, {}, ...], [{}, {}, ...], ...]
    logger.info(f"Calculated matrix: {len(frames_in_matrix)} groups")

    # ---- PARALLEL SUSPICIOUS ANALYSIS ----
    max_procs = os.cpu_count() or 1
    logger.info(f"Using {max_procs} processes for LLM analysis")
    results = []


    with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as executor:
        suspicions = list(executor.map(is_it_suspicious, frames_in_matrix))


    for frame_matrix, (is_suspicious, object_in_question, why_suspicious, images) in zip(frames_in_matrix, suspicions, strict=True):
        results.append(
            [
                {
                    "result": {
                        "is_suspicious": is_suspicious,
                        "object_in_question": object_in_question,
                        "why_suspicious": why_suspicious,
                        "images": images,
                    },
                    "matrix": frame_matrix,
                }
            ]
        )

    # Save result to JSON for frontend
    result_path = Path("uploaded_files").resolve() / (Path(video_path).stem + "_result.json")
    with open(result_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    return results

# ---------- TEST ----------

if __name__ == "__main__":
    not_suspicious = [
        {
            "frame": "frames/frame_0000.jpg",
            "timestamp": "00:00:00.000",
            "lat": 31.78546,
            "lon": 35.190109,
            "alt": 878.317,
        },
        {
            "frame": "frames/frame_0001.jpg",
            "timestamp": "00:00:00.566",
            "lat": 31.78546,
            "lon": 35.190109,
            "alt": 878.317,
        },
    ]

    suspicious = [
        {
            "frame": "frames/gun.jpg",
            "timestamp": "00:00:00.000",
            "lat": 31.78546,
            "lon": 35.190109,
            "alt": 878.317,
        },
    ]
    result = is_it_suspicious(suspicious)
    print(*result, sep="\n")
