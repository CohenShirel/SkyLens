import os
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))
import cv2
import json
from concurrent.futures import ThreadPoolExecutor
from utils import parse_srt
import matrix
from langchain_openai import ChatOpenAI
import base64
from pathlib import Path
from langchain_core.messages import HumanMessage

from langchain.schema import HumanMessage
from dotenv import load_dotenv

load_dotenv()


def extract_frames_with_metadata(
    video_path,
    srt_path,
    frames_dir="frames",
    frame_interval_sec=3,
    max_threads=8,
    txt_output="frames_metadata.txt",
):
    os.makedirs(frames_dir, exist_ok=True)
    metadata = parse_srt(srt_path)

    cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_sec = frame_count / fps
    cap.release()

    def extract_and_save_frame(args):
        idx, sec, meta = args
        cap = cv2.VideoCapture(str(video_path))
        cap.set(cv2.CAP_PROP_POS_MSEC, sec * 1000)
        ret, frame = cap.read()
        result = None
        if ret:
            frame_path = Path(frames_dir).resolve() / f"frame_{idx:04d}.jpg"
            frame_path = str(frame_path)
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

    num_frames_to_extract = min(len(metadata), int(duration_sec // frame_interval_sec))
    tasks = [
        (i, i * frame_interval_sec, metadata[i]) for i in range(num_frames_to_extract)
    ]

    frames_metadata = []
    with ThreadPoolExecutor(max_workers=max_threads) as executor:
        for result in executor.map(extract_and_save_frame, tasks):
            if result is not None:
                frames_metadata.append(result)

    # Save to TXT
    with open(txt_output, "w", encoding="utf-8") as f:
        for d in frames_metadata:
            line = (
                f"{d['frame']}, {d['timestamp']}, {d['lat']}, {d['lon']}, {d['alt']}\n"
            )
            f.write(line)
    return frames_metadata


def handle_video(video_path: Path | str, srt_path: Path | str):
    divided_frames = extract_frames_with_metadata(video_path, srt_path)
    frames_in_matrix = matrix.calc_matrix(
        divided_frames
    )  # [[{}, {}, ...], [{}, {}, ...], ...]

    # Save result to JSON for frontend
    result_path = Path("uploaded_files").resolve() / (
        Path(video_path).stem + "_result.json"
    )
    with open(result_path, "w", encoding="utf-8") as f:
        json.dump(frames_in_matrix, f, ensure_ascii=False, indent=2)
    return str(result_path)


def encode_image_to_base64(path: Path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def is_it_suspicious(data: list[list[dict]]) -> bool:
    if os.environ.get("OPENAI_API_KEY") is None:
        raise ValueError(
            "OPENAI_API_KEY environment variable is not set.\n"
            "Create a file called .env with the following content:\n"
            "OPENAI_API_KEY=your_openai_api_key_here\n"
        )

    vision_messages = []

    for i, entry in enumerate(data[0]):  # Assuming outer list has 1 list of frames
        image_data = encode_image_to_base64(entry["frame"])
        image_url = f"data:image/png;base64,{image_data}"

        meta_info = (
            f"Frame {i + 1} — Timestamp: {entry['timestamp']}, "
            f"Lat: {entry['lat']}, Lon: {entry['lon']}, Alt: {entry['alt']}"
        )

        vision_messages.append({"type": "image_url", "image_url": {"url": image_url}})
        vision_messages.append({"type": "text", "text": meta_info})

    # Add final instruction only once at the end
    vision_messages.append(
        {
            "type": "text",
            "text": (
                "Analyze this sequence of images and metadata. "
                "Does anything seem suspicious or dangerous? "
                "Reply only with 'True' if there is any concern, or 'False' if everything looks normal and safe."
            ),
        }
    )

    llm = ChatOpenAI(model="gpt-4o", temperature=0)

    response = llm.invoke([HumanMessage(content=vision_messages)])

    result = response.content.strip().lower() == "true"

    print("Suspicious?", result)

    return result


if __name__ == "__main__":

    not_suspicious = [
            [
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
        ]
    
    suspicious = [[
        {
                    "frame": "frames/gun.jpg",
                    "timestamp": "00:00:00.000",
                    "lat": 31.78546,
                    "lon": 35.190109,
                    "alt": 878.317,
                },
    ]]
    is_it_suspicious(suspicious)
    # is_it_suspicious(None)
