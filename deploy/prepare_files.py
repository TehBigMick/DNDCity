"""Create content-addressed chunks for the deployment's private KV namespace."""
import argparse
from hashlib import sha256
import json
from mimetypes import guess_type
from pathlib import Path
from zipfile import ZipFile

CHUNK_BYTES = 384 * 1024
CATALOGUE = json.loads(Path(__file__).with_name("catalogue.json").read_text(encoding="utf-8"))
PUBLIC_EXTENSIONS = {".html", ".js", ".css", ".png", ".webp", ".pdf", ".json"}


def split_file(path, prefix, chunks, content_type):
    data = path.read_bytes()
    if not data:
        raise ValueError(f"Empty deployment file {path}")
    key = f"{prefix}:{sha256(data).hexdigest()}"
    parts = range(0, len(data), CHUNK_BYTES)
    for index, offset in enumerate(parts):
        (chunks / f"{key}:{index}").write_bytes(data[offset:offset + CHUNK_BYTES])
    return {"key": key, "parts": len(parts), "size": len(data), "type": content_type, "name": path.name}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--dist", type=Path, default=Path("dist"))
    parser.add_argument("--pack", nargs=2, action="append", metavar=("SKU", "ZIP"), default=[])
    args = parser.parse_args()
    args.destination.mkdir(parents=True, exist_ok=True)
    chunks = args.destination / "chunks"
    chunks.mkdir(exist_ok=True)
    public = {}
    for file in sorted(args.dist.rglob("*")):
        if file.is_file() and file.suffix in PUBLIC_EXTENSIONS:
            relative = file.relative_to(args.dist)
            if any(part.startswith(".") for part in relative.parts):
                continue
            mime = guess_type(file.name)[0] or "application/octet-stream"
            if mime.startswith("text/") or mime == "application/json":
                mime += "; charset=utf-8"
            public["/" + relative.as_posix()] = split_file(file, "site", chunks, mime)
    if "/index.html" not in public:
        raise ValueError("No homepage in the public files")
    paid = {}
    for sku, filename in args.pack:
        if sku not in CATALOGUE or sku in paid:
            raise ValueError(f"Unknown or repeated SKU {sku}")
        path = Path(filename)
        if path.name != CATALOGUE[sku]["filename"]:
            raise ValueError(f"Expected {CATALOGUE[sku]['filename']} for {sku}")
        with ZipFile(path) as archive:
            if archive.testzip() is not None:
                raise ValueError(f"Damaged pack {filename}")
        paid[sku] = split_file(path, "pack", chunks, "application/zip")
    (args.destination / "manifest.json").write_text(
        json.dumps({"public": public, "paid": paid}, separators=(",", ":")) + "\n", encoding="utf-8",
    )


if __name__ == "__main__":
    main()
