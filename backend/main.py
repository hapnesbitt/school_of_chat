# School of Chat — Flask API
# Port 5007 | Redis DB2 | Ollama (devstral-2:123b-cloud → mistral:7b → llama3.2)
#
# Lesson flow:
#   POST /api/lesson/<slug>/run     — run student's prompt, return raw output (prompt-type lessons)
#   POST /api/lesson/<slug>/submit  — submit answers → job_id (async grading)
#   GET  /api/job/<job_id>          — poll grading job status

import json
import logging
import os
import re
import threading
import time
import uuid

import redis
import requests as http_requests
import yaml
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

app = Flask(__name__)
CORS(app)
app.logger.setLevel(logging.INFO)

REDIS_URL           = os.getenv("REDIS_URL", "redis://:simplenes@localhost:6379/2")
OLLAMA_URL          = os.getenv("OLLAMA_URL", "http://192.168.1.185:11434")
OLLAMA_CLOUD_MODEL  = os.getenv("OLLAMA_CLOUD_MODEL", "devstral-2:123b-cloud")
OLLAMA_LOCAL_MODEL  = os.getenv("OLLAMA_LOCAL_FALLBACK", "mistral:7b")
OLLAMA_LOCAL_MODEL2 = os.getenv("OLLAMA_LOCAL_FALLBACK2", "llama3.2:latest")

JOB_TTL = 2 * 3600

r = redis.from_url(REDIS_URL, decode_responses=True)

# ---------------------------------------------------------------------------
# Load courses + lessons from YAML
# ---------------------------------------------------------------------------
_YAML_PATH = os.path.join(os.path.dirname(__file__), "lessons.yaml")
with open(_YAML_PATH) as _f:
    _DATA = yaml.safe_load(_f)

COURSES: list[dict] = _DATA["courses"]
COURSES_BY_SLUG: dict[str, dict] = {c["slug"]: c for c in COURSES}

# Flat lesson index with course_slug injected
LESSONS: list[dict] = []
LESSONS_BY_SLUG: dict[str, dict] = {}
for _course in COURSES:
    for _lesson in _course["lessons"]:
        _lesson = dict(_lesson, course_slug=_course["slug"])
        LESSONS.append(_lesson)
        LESSONS_BY_SLUG[_lesson["slug"]] = _lesson


# ---------------------------------------------------------------------------
# Ollama helper
# ---------------------------------------------------------------------------

def _call_ollama(prompt_text: str, timeout: int = 120) -> tuple[str, str]:
    """Try cloud → local → local2. Returns (text, model_used). Raises on total failure."""
    for model, label in [
        (OLLAMA_CLOUD_MODEL, "cloud"),
        (OLLAMA_LOCAL_MODEL, "local"),
        (OLLAMA_LOCAL_MODEL2, "local2"),
    ]:
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
                text = re.sub(r"^.*?</think>\s*", "", text, flags=re.DOTALL).strip()
                if text:
                    app.logger.info(f"[ollama] {label} OK in {elapsed:.0f}ms ({len(text)} chars)")
                    return text, model
            app.logger.warning(f"[ollama] {label} HTTP {resp.status_code}, trying next")
        except Exception as exc:
            app.logger.warning(f"[ollama] {label} error: {exc}, trying next")

    raise Exception(
        f"All Ollama models failed ({OLLAMA_CLOUD_MODEL}, {OLLAMA_LOCAL_MODEL}, {OLLAMA_LOCAL_MODEL2})"
    )


# ---------------------------------------------------------------------------
# Routes — meta
# ---------------------------------------------------------------------------

@app.route("/api/health")
def health():
    try:
        r.ping()
        redis_ok = True
    except Exception:
        redis_ok = False
    return jsonify({"status": "ok", "service": "school-of-chat", "redis": redis_ok})


@app.route("/api/courses")
def list_courses():
    return jsonify([
        {
            "slug":         c["slug"],
            "title":        c["title"],
            "tagline":      c["tagline"],
            "description":  c["description"],
            "icon":         c["icon"],
            "tier":         c.get("tier", 1),
            "lesson_count": len(c["lessons"]),
        }
        for c in COURSES
    ])


@app.route("/api/course/<course_slug>")
def get_course(course_slug: str):
    course = COURSES_BY_SLUG.get(course_slug)
    if not course:
        return jsonify({"error": "Course not found"}), 404
    return jsonify({
        "slug":        course["slug"],
        "title":       course["title"],
        "tagline":     course["tagline"],
        "description": course["description"],
        "icon":        course["icon"],
        "lessons": [
            {
                "slug":        l["slug"],
                "number":      l["number"],
                "title":       l["title"],
                "tagline":     l["tagline"],
                "difficulty":  l["difficulty"],
                "lesson_type": l.get("lesson_type", "prompt"),
            }
            for l in course["lessons"]
        ],
    })


@app.route("/api/lesson/<slug>")
def get_lesson(slug: str):
    lesson = LESSONS_BY_SLUG.get(slug)
    if not lesson:
        return jsonify({"error": "Lesson not found"}), 404
    safe = {k: v for k, v in lesson.items() if k != "rubric"}
    safe["rubric"] = [
        {
            "criterion": rb["criterion"],
            "points":    rb["points"],
            "question":  rb.get("question", ""),
        }
        for rb in lesson.get("rubric", [])
    ]
    return jsonify(safe)


# ---------------------------------------------------------------------------
# Routes — lesson execution
# ---------------------------------------------------------------------------

@app.route("/api/lesson/<slug>/run", methods=["POST"])
def run_lesson(slug: str):
    """Phase 1 (prompt-type lessons only): run the student's prompt, return raw output."""
    lesson = LESSONS_BY_SLUG.get(slug)
    if not lesson:
        return jsonify({"error": "Lesson not found"}), 404
    if lesson.get("lesson_type") == "knowledge":
        return jsonify({"error": "Knowledge lessons do not have a run step"}), 400

    body = request.get_json(silent=True) or {}
    prompt: str = body.get("prompt", "").strip()

    if not prompt:
        return jsonify({"error": "prompt is required"}), 400
    if len(prompt) > 2000:
        return jsonify({"error": "Prompt too long (max 2000 chars)"}), 400

    try:
        output, model_used = _call_ollama(prompt, timeout=120)
        app.logger.info(f"[run] slug={slug} model={model_used} len={len(output)}")
    except Exception as exc:
        app.logger.error(f"[run] Ollama error: {exc}")
        return jsonify({"error": "AI model unavailable — try again shortly"}), 500

    return jsonify({"output": output, "model": model_used})


@app.route("/api/lesson/<slug>/submit", methods=["POST"])
def submit_lesson(slug: str):
    """
    Submit answers for async grading. Returns {job_id} immediately.
    For knowledge lessons: prompt and output will be empty strings.
    For prompt lessons: prompt and output are required.
    """
    lesson = LESSONS_BY_SLUG.get(slug)
    if not lesson:
        return jsonify({"error": "Lesson not found"}), 404

    body = request.get_json(silent=True) or {}
    prompt: str   = body.get("prompt", "").strip()
    output: str   = body.get("output", "").strip()
    answers: list = body.get("answers", [])
    user_id: str  = body.get("user_id", "anonymous")

    rubric = lesson.get("rubric", [])

    if lesson.get("lesson_type") != "knowledge" and (not prompt or not output):
        return jsonify({"error": "prompt and output are required for prompt-type lessons"}), 400
    if len(answers) != len(rubric):
        return jsonify({"error": f"Expected {len(rubric)} answers, got {len(answers)}"}), 400

    answers = [str(a)[:1000] for a in answers]

    job_id = str(uuid.uuid4())
    job: dict = {
        "job_id":         job_id,
        "slug":           slug,
        "course_slug":    lesson.get("course_slug", ""),
        "user_id":        user_id,
        "status":         "grading",
        "submitted_at":   time.strftime("%Y-%m-%dT%H:%M:%S"),
        "prompt":         prompt,
        "output":         output,
        "answers":        answers,
        "criteria": [
            {
                "criterion": rb["criterion"],
                "points":    rb["points"],
                "status":    "pending",
                "earned":    None,
                "comment":   None,
            }
            for rb in rubric
        ],
        "total_earned":   0,
        "total_possible": sum(rb["points"] for rb in rubric),
        "complete_count": 0,
    }

    _write_job(job_id, job)

    threading.Thread(
        target=_grade_job,
        args=(job_id, lesson, prompt, output, answers, user_id),
        daemon=True,
    ).start()

    return jsonify({"job_id": job_id})


@app.route("/api/job/<job_id>")
def get_job(job_id: str):
    raw = r.get(f"soc:job:{job_id}")
    if not raw:
        return jsonify({"error": "Job not found or expired"}), 404
    return jsonify(json.loads(raw))


# ---------------------------------------------------------------------------
# Routes — progress + certificates
# ---------------------------------------------------------------------------

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


CERTIFICATE_THRESHOLD_SCORE = 70
CERTIFICATE_THRESHOLD_COUNT = 3


@app.route("/api/certificate/<user_id>/<course_slug>")
def get_certificate(user_id: str, course_slug: str):
    """Per-course certificate. Requires 3+ lessons in that course passed at ≥70%."""
    course = COURSES_BY_SLUG.get(course_slug)
    if not course:
        return jsonify({"error": "Course not found"}), 404

    course_lesson_slugs = {l["slug"] for l in course["lessons"]}
    passed = []

    for slug in course_lesson_slugs:
        raw = r.get(f"soc:progress:{user_id}:{slug}")
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except Exception:
            continue
        score     = data.get("score", 0)
        max_score = data.get("max", 100)
        pct       = round((score / max_score) * 100) if max_score else 0
        if pct >= CERTIFICATE_THRESHOLD_SCORE:
            lesson = LESSONS_BY_SLUG.get(slug, {})
            passed.append({
                "slug":  slug,
                "title": lesson.get("title", slug),
                "score": score,
                "max":   max_score,
                "pct":   pct,
            })

    # Sort by lesson number
    passed.sort(key=lambda p: LESSONS_BY_SLUG.get(p["slug"], {}).get("number", 99))

    if len(passed) < CERTIFICATE_THRESHOLD_COUNT:
        return jsonify({
            "eligible":     False,
            "course_slug":  course_slug,
            "course_title": course["title"],
            "passed_count": len(passed),
            "needed":       CERTIFICATE_THRESHOLD_COUNT,
        })

    date_key  = f"soc:cert_issued:{user_id}:{course_slug}"
    issued_at = r.get(date_key)
    if not issued_at:
        issued_at = time.strftime("%Y-%m-%d")
        r.set(date_key, issued_at)

    name = r.get(f"soc:name:{user_id}") or ""

    return jsonify({
        "eligible":     True,
        "user_id":      user_id,
        "course_slug":  course_slug,
        "course_title": course["title"],
        "name":         name,
        "issued_at":    issued_at,
        "passed":       passed,
        "passed_count": len(passed),
    })


@app.route("/api/user/name/<user_id>", methods=["POST"])
def set_user_name(user_id: str):
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()[:120]
    if name:
        r.set(f"soc:name:{user_id}", name)
    return jsonify({"ok": True})


# ---------------------------------------------------------------------------
# Background grading
# ---------------------------------------------------------------------------

def _write_job(job_id: str, job: dict) -> None:
    r.set(f"soc:job:{job_id}", json.dumps(job), ex=JOB_TTL)


def _build_grade_prompt(
    lesson: dict,
    rb: dict,
    answer: str,
    prompt: str,
    output: str,
) -> str:
    criterion = rb["criterion"]
    max_pts   = rb["points"]
    hint      = rb.get("hint", "")
    question  = rb.get("question", "")
    is_knowledge = lesson.get("lesson_type") == "knowledge"

    if is_knowledge:
        return f"""You are an expert instructor grading a student's written answer on the topic: {lesson["title"]}.

LESSON CHALLENGE:
{lesson["challenge"].strip()}

CRITERION: {criterion} ({max_pts} points)
GRADING GUIDANCE: {hint}
QUESTION ASKED: {question}

STUDENT'S ANSWER:
<answer>{answer}</answer>

Assess the answer for factual accuracy, completeness, and depth.
Score from 0 to {max_pts}. Reserve {max_pts} for answers that are accurate,
complete, and show genuine understanding. Reserve 0 for blank or entirely wrong answers.
Partial credit is the norm.

Return ONLY a JSON object (no markdown, no extra text):
{{"earned": <integer 0-{max_pts}>, "comment": "<one specific sentence explaining the score>"}}"""

    else:
        return f"""You are a prompt engineering instructor grading ONE criterion.

LESSON CHALLENGE:
{lesson["challenge"].strip()}

CRITERION: {criterion} ({max_pts} points)
GRADING GUIDANCE: {hint}
QUESTION ASKED OF STUDENT: {question}

THE STUDENT'S PROMPT:
<prompt>{prompt}</prompt>

THE AI'S RESPONSE TO THAT PROMPT:
<output>{output}</output>

THE STUDENT'S REFLECTION FOR THIS CRITERION:
<answer>{answer}</answer>

Score this single criterion from 0 to {max_pts}.
Be honest but fair. Partial credit is expected.

Return ONLY a JSON object (no markdown, no extra text):
{{"earned": <integer 0-{max_pts}>, "comment": "<one specific sentence explaining the score>"}}"""


def _grade_job(
    job_id: str,
    lesson: dict,
    prompt: str,
    output: str,
    answers: list[str],
    user_id: str,
) -> None:
    """Sequential per-criterion grading. Updates Redis after each step."""
    rubric = lesson.get("rubric", [])

    for i, (rb, answer) in enumerate(zip(rubric, answers)):
        grade_prompt = _build_grade_prompt(lesson, rb, answer, prompt, output)
        earned  = 0
        comment = "Grading error — no score recorded."
        try:
            raw, _ = _call_ollama(grade_prompt, timeout=90)
            if raw.startswith("```"):
                lines = raw.split("\n")
                raw = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
            result  = json.loads(raw)
            earned  = max(0, min(int(result.get("earned", 0)), rb["points"]))
            comment = str(result.get("comment", "")).strip() or "No comment."
        except Exception as exc:
            app.logger.error(f"[grade_job] {job_id} criterion {i} error: {exc}")

        raw_job = r.get(f"soc:job:{job_id}")
        if not raw_job:
            app.logger.warning(f"[grade_job] job {job_id} gone from Redis")
            return

        job = json.loads(raw_job)
        job["criteria"][i]["status"]  = "complete"
        job["criteria"][i]["earned"]  = earned
        job["criteria"][i]["comment"] = comment
        job["complete_count"] = sum(1 for c in job["criteria"] if c["status"] == "complete")
        job["total_earned"]   = sum(c.get("earned") or 0 for c in job["criteria"])

        if job["complete_count"] == len(rubric):
            job["status"] = "complete"
            if user_id != "anonymous":
                _save_progress(user_id, lesson["slug"], prompt, output, job)

        _write_job(job_id, job)
        app.logger.info(
            f"[grade_job] {job_id} {i+1}/{len(rubric)} "
            f"earned={earned}/{rb['points']} total={job['total_earned']}"
        )


def _save_progress(user_id: str, slug: str, prompt: str, output: str, job: dict) -> None:
    r.set(f"soc:progress:{user_id}:{slug}", json.dumps({
        "prompt":  prompt,
        "output":  output,
        "score":   job.get("total_earned", 0),
        "max":     job.get("total_possible", 0),
        "breakdown": [
            {
                "criterion": c["criterion"],
                "earned":    c.get("earned", 0),
                "max":       c["points"],
                "comment":   c.get("comment", ""),
            }
            for c in job.get("criteria", [])
        ],
    }), ex=90 * 24 * 3600)
    r.sadd(f"soc:completed:{user_id}", slug)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5007, debug=True)
