# School of Chat — Flask API
# Port 5007 | Redis DB2 | Ollama (devstral-2:123b-cloud → mistral:7b)

import json
import logging
import os
import re
import time
import requests as http_requests

import redis
import yaml
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

app = Flask(__name__)
CORS(app)
app.logger.setLevel(logging.INFO)

REDIS_URL          = os.getenv("REDIS_URL", "redis://:simplenes@localhost:6379/2")
OLLAMA_URL          = os.getenv("OLLAMA_URL", "http://192.168.1.185:11434")
OLLAMA_CLOUD_MODEL  = os.getenv("OLLAMA_CLOUD_MODEL", "devstral-2:123b-cloud")
OLLAMA_LOCAL_MODEL  = os.getenv("OLLAMA_LOCAL_FALLBACK", "mistral:7b")
OLLAMA_LOCAL_MODEL2 = os.getenv("OLLAMA_LOCAL_FALLBACK2", "llama3.2:latest")

r = redis.from_url(REDIS_URL, decode_responses=True)

# ---------------------------------------------------------------------------
# Load lesson definitions
# ---------------------------------------------------------------------------
_LESSONS_PATH = os.path.join(os.path.dirname(__file__), "lessons.yaml")
with open(_LESSONS_PATH) as _f:
    _LESSONS_DATA = yaml.safe_load(_f)

LESSONS: list[dict] = _LESSONS_DATA["lessons"]
LESSONS_BY_SLUG: dict[str, dict] = {l["slug"]: l for l in LESSONS}


# ---------------------------------------------------------------------------
# Ollama helper
# ---------------------------------------------------------------------------

def _call_ollama(prompt_text: str, timeout: int = 120) -> tuple[str, str]:
    """
    Try cloud model first, fall back to local.
    Returns (response_text, model_used).
    Raises Exception if both fail.
    """
    for model, label in [(OLLAMA_CLOUD_MODEL, "cloud"), (OLLAMA_LOCAL_MODEL, "local"), (OLLAMA_LOCAL_MODEL2, "local2")]:
        try:
            app.logger.info(f"[ollama] trying {label}: {model}")
            t0 = time.perf_counter()
            resp = http_requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": model, "prompt": prompt_text, "stream": False},
                timeout=timeout,
            )
            elapsed = (time.perf_counter() - t0) * 1000
            if resp.status_code == 200:
                text = resp.json().get("response", "").strip()
                # Strip <think>…</think> blocks from reasoning models
                text = re.sub(r"^.*?</think>\s*", "", text, flags=re.DOTALL).strip()
                if text:
                    app.logger.info(f"[ollama] {label} OK in {elapsed:.0f}ms ({len(text)} chars)")
                    return text, model
            app.logger.warning(f"[ollama] {label} HTTP {resp.status_code}, trying next")
        except Exception as exc:
            app.logger.warning(f"[ollama] {label} error: {exc}, trying next")

    raise Exception(f"All Ollama models failed ({OLLAMA_CLOUD_MODEL}, {OLLAMA_LOCAL_MODEL}, {OLLAMA_LOCAL_MODEL2})")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/api/health")
def health():
    try:
        r.ping()
        redis_ok = True
    except Exception:
        redis_ok = False
    return jsonify({"status": "ok", "service": "school-of-chat", "redis": redis_ok})


@app.route("/api/lessons")
def list_lessons():
    return jsonify([
        {
            "slug": l["slug"],
            "number": l["number"],
            "title": l["title"],
            "tagline": l["tagline"],
            "difficulty": l["difficulty"],
        }
        for l in LESSONS
    ])


@app.route("/api/lesson/<slug>")
def get_lesson(slug: str):
    lesson = LESSONS_BY_SLUG.get(slug)
    if not lesson:
        return jsonify({"error": "Lesson not found"}), 404
    safe = {k: v for k, v in lesson.items() if k != "rubric"}
    safe["rubric"] = [{"criterion": rb["criterion"], "points": rb["points"]} for rb in lesson.get("rubric", [])]
    return jsonify(safe)


@app.route("/api/lesson/<slug>/run", methods=["POST"])
def run_lesson(slug: str):
    lesson = LESSONS_BY_SLUG.get(slug)
    if not lesson:
        return jsonify({"error": "Lesson not found"}), 404

    body = request.get_json(silent=True) or {}
    prompt: str = body.get("prompt", "").strip()
    user_id: str = body.get("user_id", "anonymous")

    if not prompt:
        return jsonify({"error": "prompt is required"}), 400
    if len(prompt) > 2000:
        return jsonify({"error": "Prompt too long (max 2000 chars)"}), 400

    # ── Step 1: run the student's prompt ───────────────────────────────────
    try:
        output, model_used = _call_ollama(prompt)
        app.logger.info(f"[run] slug={slug} model={model_used}")
    except Exception as exc:
        app.logger.error(f"[run] Ollama error: {exc}")
        return jsonify({"error": "AI model unavailable — try again shortly"}), 500

    # ── Step 2: grade ──────────────────────────────────────────────────────
    grade = _grade(prompt, output, lesson)

    # ── Step 3: persist progress ───────────────────────────────────────────
    if user_id != "anonymous":
        _save_progress(user_id, slug, prompt, output, grade)

    return jsonify({"output": output, "grade": grade})


@app.route("/api/user/progress/<user_id>")
def get_progress(user_id: str):
    completed = list(r.smembers(f"soc:completed:{user_id}") or [])
    progress = {}
    for slug in completed:
        raw = r.get(f"soc:progress:{user_id}:{slug}")
        if raw:
            try:
                progress[slug] = json.loads(raw)
            except Exception:
                pass
    return jsonify({"completed": completed, "progress": progress})


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _grade(prompt: str, output: str, lesson: dict) -> dict:
    rubric = lesson.get("rubric", [])
    if not rubric:
        return {"total": 0, "max": 0, "breakdown": [], "feedback": "No rubric for this lesson yet."}

    total_possible = sum(rb["points"] for rb in rubric)
    rubric_lines = "\n".join(
        f'- {rb["criterion"]} ({rb["points"]} pts): {rb.get("hint", "")}'
        for rb in rubric
    )

    grade_prompt = f"""You are a prompt engineering instructor. Grade the student's work.

CHALLENGE: {lesson["challenge"].strip()}

STUDENT'S PROMPT:
<prompt>{prompt}</prompt>

MODEL RESPONSE TO THAT PROMPT:
<output>{output}</output>

RUBRIC ({total_possible} points total):
{rubric_lines}

Return ONLY a JSON object (no markdown fences):
{{
  "breakdown": [
    {{"criterion": "<name>", "earned": <int>, "max": <int>, "comment": "<one sentence>"}}
  ],
  "total": <int>,
  "feedback": "<2-3 sentences of encouragement with a rock/music metaphor>"
}}"""

    try:
        raw, _ = _call_ollama(grade_prompt)
        # Strip accidental markdown fences
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        result = json.loads(raw)
        result["max"] = total_possible
        return result
    except Exception as exc:
        app.logger.error(f"[grade] error: {exc}")
        return {
            "total": 0,
            "max": total_possible,
            "breakdown": [],
            "feedback": "Grading hit a sour note — but your prompt ran! Check the output above.",
        }


def _save_progress(user_id: str, slug: str, prompt: str, output: str, grade: dict):
    key = f"soc:progress:{user_id}:{slug}"
    r.set(key, json.dumps({
        "prompt": prompt,
        "output": output,
        "score": grade.get("total", 0),
        "max": grade.get("max", 0),
        "breakdown": grade.get("breakdown", []),
        "feedback": grade.get("feedback", ""),
    }), ex=90 * 24 * 3600)
    r.sadd(f"soc:completed:{user_id}", slug)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5007, debug=True)
