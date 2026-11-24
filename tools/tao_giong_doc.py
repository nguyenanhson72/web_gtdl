"""Tạo file MP3 giọng nữ miền Nam cho web Hồn Quê bằng FPT.AI Text to Speech.

Cách chạy (cmd, đứng ở thư mục web_gtdl):
    set FPT_API_KEY=khoa_api_cua_ban
    python tools\\tao_giong_doc.py --gioi-han 3     (thử 3 câu để nghe giọng)
    python tools\\tao_giong_doc.py                  (tạo toàn bộ)

- Đọc danh sách chữ trong tools/texts.json, lưu MP3 vào thư mục audio/.
- File đã có thì bỏ qua, nên chạy lại bao nhiêu lần cũng được.
- Tên file = mã của đoạn chữ (khớp với hàm textKey() trong index.html).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import unicodedata
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
TEXTS_FILE = ROOT / "tools" / "texts.json"
ENV_FILE = ROOT / "tools" / ".env"
AUDIO_DIR = ROOT / "audio"
API_URL = "https://api.fpt.ai/hmi/tts/v5"


def norm_text(text: str) -> str:
    """Chuẩn hóa chữ giống normText() bên JavaScript."""
    return unicodedata.normalize("NFC", re.sub(r"\s+", " ", text)).strip()


def text_key(text: str) -> str:
    """Mã FNV-1a 32-bit trên UTF-8, giống textKey() bên JavaScript."""
    h = 0x811C9DC5
    for byte in norm_text(text).encode("utf-8"):
        h ^= byte
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


def load_api_key() -> str:
    """Lấy API key từ biến môi trường hoặc tools/.env (không ghi key vào code)."""
    key = os.environ.get("FPT_API_KEY", "").strip()
    if not key and ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            if line.startswith("FPT_API_KEY="):
                key = line.split("=", 1)[1].strip()
    if not key:
        sys.exit("Chưa có API key. Chạy: set FPT_API_KEY=khoa_cua_ban  (lấy ở console.fpt.ai)")
    return key


def request_audio(text: str, api_key: str, voice: str, speed: str) -> str:
    """Gửi chữ lên FPT.AI, trả về link file MP3 (file có thể chưa sẵn sàng ngay)."""
    headers = {"api_key": api_key, "voice": voice, "speed": speed, "format": "mp3"}
    res = requests.post(API_URL, data=text.encode("utf-8"), headers=headers, timeout=30)
    res.raise_for_status()
    data = res.json()
    if data.get("error") != 0 or not data.get("async"):
        raise RuntimeError(data.get("message") or f"Lỗi không rõ: {data}")
    return data["async"]


def download_when_ready(url: str, dest: Path, max_wait: int = 150) -> None:
    """FPT.AI cần 5 giây đến 2 phút để tạo file: thử tải lại cho tới khi có."""
    waited = 0
    while waited <= max_wait:
        res = requests.get(url, timeout=30)
        if res.status_code == 200 and len(res.content) > 1000:
            dest.write_bytes(res.content)
            return
        time.sleep(3)
        waited += 3
    raise TimeoutError("Quá thời gian chờ file âm thanh")


def main() -> None:
    parser = argparse.ArgumentParser(description="Tạo MP3 giọng đọc cho web Hồn Quê")
    parser.add_argument("--voice", default="lannhi", help="lannhi hoặc linhsan (nữ miền Nam)")
    parser.add_argument("--speed", default="0", help="-3 (chậm) đến +3 (nhanh)")
    parser.add_argument("--gioi-han", type=int, default=0, help="Chỉ tạo N đoạn đầu (để thử giọng)")
    parser.add_argument("--lam-lai", action="store_true", help="Tạo lại cả file đã có (khi đổi giọng)")
    args = parser.parse_args()

    api_key = load_api_key()
    items = json.loads(TEXTS_FILE.read_text(encoding="utf-8"))
    if args.gioi_han:
        items = items[: args.gioi_han]
    AUDIO_DIR.mkdir(exist_ok=True)

    done = skipped = failed = 0
    for i, item in enumerate(items, 1):
        text = norm_text(item["text"])
        key = text_key(text)
        if key != item["key"]:
            print(f"[{i}] Cảnh báo: mã không khớp, dùng mã tính lại {key}")
        dest = AUDIO_DIR / f"{key}.mp3"
        if dest.exists() and not args.lam_lai:
            skipped += 1
            continue
        if len(text) < 3:
            print(f"[{i}] Bỏ qua (dưới 3 ký tự): {text}")
            continue
        try:
            url = request_audio(text, api_key, args.voice, args.speed)
            download_when_ready(url, dest)
            done += 1
            print(f"[{i}/{len(items)}] OK {dest.name}  {text[:50]}")
        except requests.HTTPError as err:
            if err.response is not None and err.response.status_code in (401, 403):
                sys.exit(
                    "\nAPI key không hợp lệ (lỗi 401/403). Kiểm tra lại:\n"
                    "  - Key dán đúng, không có dấu ngoặc kép hay dấu cách\n"
                    "  - Key thuộc dịch vụ Text to Speech trên console.fpt.ai\n"
                    "  - Nên ghi key vào file tools\\.env dạng: FPT_API_KEY=key_cua_ban"
                )
            failed += 1
            print(f"[{i}/{len(items)}] LỖI: {err}  ({text[:50]})")
        except Exception as err:  # in lỗi rồi làm tiếp đoạn sau
            failed += 1
            print(f"[{i}/{len(items)}] LỖI: {err}  ({text[:50]})")
        time.sleep(0.5)  # tránh gửi quá dồn dập

    print(f"\nXong: tạo mới {done}, đã có {skipped}, lỗi {failed}. File nằm trong: {AUDIO_DIR}")
    if failed:
        print("Chạy lại lệnh để tạo tiếp các đoạn bị lỗi.")


if __name__ == "__main__":
    main()
