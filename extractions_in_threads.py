import os
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))
import cv2
import json
from concurrent.futures import ThreadPoolExecutor
from utils import parse_srt
import matrix

def extract_frames_with_metadata(video_path, srt_path, frames_dir="frames", frame_interval_sec=3, max_threads=8, txt_output="frames_metadata.txt"):
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
                "alt": meta["alt"]
            }
        cap.release()
        return result

    num_frames_to_extract = min(len(metadata), int(duration_sec // frame_interval_sec))
    tasks = [(i, i * frame_interval_sec, metadata[i]) for i in range(num_frames_to_extract)]

    frames_metadata = []
    with ThreadPoolExecutor(max_workers=max_threads) as executor:
        for result in executor.map(extract_and_save_frame, tasks):
            if result is not None:
                frames_metadata.append(result)

    # Save to TXT
    with open(txt_output, "w", encoding="utf-8") as f:
        for d in frames_metadata:
            line = f'{d["frame"]}, {d["timestamp"]}, {d["lat"]}, {d["lon"]}, {d["alt"]}\n'
            f.write(line)
    return frames_metadata


def handle_video(video_path: Path | str, srt_path: Path | str):
    divided_frames = extract_frames_with_metadata(video_path, srt_path)
    frames_in_matrix = matrix.calc_matrix(divided_frames)  #[[{}, {}, ...], [{}, {}, ...], ...]
    
    # Save result to JSON for frontend
    result_path = Path("uploaded_files").resolve() / (Path(video_path).stem + "_result.json")
    with open(result_path, "w", encoding="utf-8") as f:
        json.dump(frames_in_matrix, f, ensure_ascii=False, indent=2)
    return str(result_path)
