import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.dirname(BASE_DIR)
DATA_DIR = os.path.join(APP_DIR, "data")

def ensure_file(filename):
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, filename)

    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            json.dump([], f)

    return path

def read_json(filename):
    path = ensure_file(filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def write_json(filename, data):
    path = ensure_file(filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)