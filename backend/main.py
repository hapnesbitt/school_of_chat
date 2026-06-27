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

REDIS_URL           = os.environ['REDIS_URL']
OLLAMA_URL          = os.getenv("OLLAMA_URL", "http://192.168.1.185:11434")
OLLAMA_CLOUD_MODEL  = os.getenv("OLLAMA_CLOUD_MODEL", "devstral-2:123b-cloud")
OLLAMA_LOCAL_MODEL  = os.getenv("OLLAMA_LOCAL_FALLBACK", "mistral:7b")
OLLAMA_LOCAL_MODEL2 = os.getenv("OLLAMA_LOCAL_FALLBACK2", "llama3.2:latest")

JOB_TTL = 2 * 3600

r = redis.from_url(REDIS_URL, decode_responses=True)

# Cloud circuit breaker — mirrors arc_stack/ollama_utils.py pattern
CLOUD_UNAVAILABLE_KEY = "ollama:cloud_unavailable"
CLOUD_UNAVAILABLE_TTL = 86_400  # 24 hours

ARC_CLOUD_STATUS_URL = "https://arc-codex.com/api/cloud_status"


def _is_cloud_available() -> bool:
    """Returns True if the cloud circuit breaker is not tripped."""
    try:
        return not bool(r.exists(CLOUD_UNAVAILABLE_KEY))
    except Exception:
        return True


def _trip_cloud_breaker() -> None:
    """Set 24 h Redis key to bypass cloud after a 429 rate-limit response."""
    try:
        r.setex(CLOUD_UNAVAILABLE_KEY, CLOUD_UNAVAILABLE_TTL, "1")
        app.logger.warning("☁️  Cloud circuit breaker OPEN (429 received) — skipping cloud for 24 h")
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Load courses + lessons from YAML
# ---------------------------------------------------------------------------
_YAML_PATH = os.path.join(os.path.dirname(__file__), "lessons.yaml")
with open(_YAML_PATH) as _f:
    _DATA = yaml.safe_load(_f)

COURSES: list[dict] = _DATA["courses"]
COURSES_BY_SLUG: dict[str, dict] = {c["slug"]: c for c in COURSES}

# Dynamic-course config registry — the `dynamic:` block per course (source,
# selector, fetch_window, cache_version, frontend strings). Keyed by slug. A new
# dynamic course is a YAML record here; no per-course code. `source_key` defaults
# to article_source (or slug) and namespaces the course's Redis cache.
DYNAMIC_COURSE_CFG: dict[str, dict] = {}
for _c in COURSES:
    _dyn = _c.get("dynamic")
    if _dyn:
        _cfg = dict(_dyn)
        _cfg["slug"] = _c["slug"]
        _cfg.setdefault("source_key", _c.get("article_source") or _c["slug"])
        DYNAMIC_COURSE_CFG[_c["slug"]] = _cfg


def _course_dynamic_frontend(course: dict) -> dict | None:
    """Frontend-facing slice of a course's `dynamic:` block: the strings and
    fetch path the course page renders. Defaults fetch_path to the generic
    endpoint so a registry course needs no explicit path. Returns None for
    non-dynamic courses."""
    dyn = course.get("dynamic")
    if not dyn:
        return None
    return {
        "how_it_works": dyn.get("how_it_works", ""),
        "header_label": dyn.get("header_label", "Live articles"),
        "fetch_path":   dyn.get("fetch_path") or f"/api/dynamic/course/{course['slug']}",
        "cta_label":    dyn.get("cta_label", "Read & Test →"),
    }

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
    candidates = [
        (OLLAMA_CLOUD_MODEL, "cloud"),
        (OLLAMA_LOCAL_MODEL, "local"),
        (OLLAMA_LOCAL_MODEL2, "local2"),
    ]
    if not _is_cloud_available():
        app.logger.info("[ollama] cloud circuit breaker open — skipping cloud")
        candidates = [(m, l) for m, l in candidates if l != "cloud"]

    for model, label in candidates:
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
            if resp.status_code == 429 and label == "cloud":
                _trip_cloud_breaker()
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
            "lesson_type":  c.get("lesson_type", ""),
            "lesson_count": len(c["lessons"]),
        }
        for c in COURSES
    ])


@app.route("/api/categories")
def list_categories():
    """Homepage category tiles generated from the course registry. A course that
    carries a `card:` block becomes its own single-course category; fields default
    to the course's own title/tagline/description/icon so a daily course needs no
    separate categories.ts edit. The hand-authored editorial (multi-course)
    categories live in the frontend; these are merged in after them, by `order`."""
    cats = []
    for c in COURSES:
        card = c.get("card")
        if not card:
            continue
        cats.append({
            "slug":        card.get("category_slug") or c["slug"],
            "label":       card.get("label")       or c["title"],
            "icon":        card.get("icon")        or c["icon"],
            "tagline":     card.get("tagline")     or c["tagline"],
            "description": (card.get("description") or c["description"]).strip(),
            "courseSlugs": [c["slug"]],
            "order":       card.get("order", 100),
        })
    cats.sort(key=lambda x: x["order"])
    return jsonify(cats)


@app.route("/api/course/<course_slug>")
def get_course(course_slug: str):
    course = COURSES_BY_SLUG.get(course_slug)
    if not course:
        return jsonify({"error": "Course not found"}), 404
    return jsonify({
        "slug":           course["slug"],
        "title":          course["title"],
        "tagline":        course["tagline"],
        "description":    course["description"],
        "icon":           course["icon"],
        "lesson_type":    course.get("lesson_type", ""),
        "article_source": course.get("article_source", ""),
        "dynamic":        _course_dynamic_frontend(course),
        "sponsor":        course.get("sponsor") or None,
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

    # ── Dynamic course: certificate based on article passes ──────────────────
    if course.get("lesson_type") == "dynamic":
        raw_passes = r.hgetall(f"soc:dynamic_pass:{user_id}")
        passed = []
        for art_id, val in raw_passes.items():
            try:
                d = json.loads(val)
                if d.get("pct", 0) >= CERTIFICATE_THRESHOLD_SCORE:
                    passed.append({
                        "slug":  art_id,
                        "title": d.get("title", art_id),
                        "score": d.get("score", 0),
                        "max":   100,
                        "pct":   d.get("pct", 0),
                    })
            except Exception:
                pass
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
            "passed":       passed[:CERTIFICATE_THRESHOLD_COUNT],
            "passed_count": len(passed),
        })

    # ── Static course: certificate based on lesson scores ─────────────────
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
# Per-article badges (plant-badge course and any future article-scoped course).
# A badge is earned by passing a SINGLE article in the course's article-source
# set at 70%+. Cleanly separate from the count≥3 certificate flow.
# ---------------------------------------------------------------------------

def _course_article_id_set(course_slug: str) -> set[str]:
    """The set of article ids that belong to a course's article-source.
    For plant-badge that's the curated plant catalog; for news courses it's
    the current news fetch. Used to gate badge eligibility so a news pass
    cannot mint a plant badge (and vice versa)."""
    if _course_article_source(course_slug) == "plants":
        return {p["id"] for p in _fetch_plant_catalog()}
    if course_slug in DYNAMIC_COURSE_CFG:
        # Vocab passes are stored under a `vocab:` field prefix; gate badges on
        # the same prefixed ids so a vocab badge requires a vocab pass.
        prefix = "vocab:" if _course_quiz_mode(course_slug) == "vocab" else ""
        return {f"{prefix}{_article_id(a)}" for a in _fetch_arc_dynamic(course_slug)}
    return {_article_id(a) for a in _fetch_arc_articles()}


@app.route("/api/badges/<user_id>/<course_slug>")
def list_badges(user_id: str, course_slug: str):
    """List all badges earned by a user for a single course. Reads the
    shared soc:dynamic_pass hash, filtered to the course's article-source."""
    course = COURSES_BY_SLUG.get(course_slug)
    if not course:
        return jsonify({"error": "Course not found"}), 404

    in_course = _course_article_id_set(course_slug)
    raw_passes = r.hgetall(f"soc:dynamic_pass:{user_id}") or {}

    # Plant lookup for {common, latin} enrichment when relevant
    plants_by_id = {}
    if _course_article_source(course_slug) == "plants":
        plants_by_id = {p["id"]: p for p in _fetch_plant_catalog()}

    badges = []
    for article_id, val in raw_passes.items():
        if article_id not in in_course:
            continue
        try:
            d = json.loads(val)
        except Exception:
            continue
        pct = int(d.get("pct", 0))
        if pct < CERTIFICATE_THRESHOLD_SCORE:
            continue
        item = {
            "article_id": article_id,
            "title":      d.get("title", article_id),
            "score":      d.get("score", 0),
            "pct":        pct,
        }
        plant = plants_by_id.get(article_id)
        if plant:
            item["common"] = plant["common"]
            item["latin"]  = plant["latin"]
        badges.append(item)

    return jsonify({
        "course_slug":  course_slug,
        "course_title": course["title"],
        "sponsor":      course.get("sponsor") or None,
        "badges":       badges,
        "count":        len(badges),
    })


@app.route("/api/badge/<user_id>/<course_slug>/<article_id>")
def get_badge(user_id: str, course_slug: str, article_id: str):
    """Single-badge detail. Eligible only if the user passed THIS specific
    article at 70%+ AND the article belongs to the course's article-source."""
    course = COURSES_BY_SLUG.get(course_slug)
    if not course:
        return jsonify({"error": "Course not found"}), 404

    # quiz-me intentionally has no article-source gate: it credentials any
    # published arc-codex article. Plant-badge still enforces the gate so a
    # news pass cannot mint a plant badge.
    if course_slug != "quiz-me":
        in_course = _course_article_id_set(course_slug)
        if article_id not in in_course:
            return jsonify({"error": "Article is not part of this course"}), 404

    raw = r.hget(f"soc:dynamic_pass:{user_id}", article_id)
    if not raw:
        return jsonify({
            "eligible":     False,
            "course_slug":  course_slug,
            "course_title": course["title"],
            "article_id":   article_id,
            "sponsor":      course.get("sponsor") or None,
        })
    try:
        pass_data = json.loads(raw)
    except Exception:
        return jsonify({
            "eligible":    False,
            "course_slug": course_slug,
            "article_id":  article_id,
        })
    pct = int(pass_data.get("pct", 0))
    if pct < CERTIFICATE_THRESHOLD_SCORE:
        return jsonify({
            "eligible":     False,
            "course_slug":  course_slug,
            "course_title": course["title"],
            "article_id":   article_id,
            "pct":          pct,
            "sponsor":      course.get("sponsor") or None,
        })

    # Sticky issued date — earned-on stays stable across re-views.
    date_key  = f"soc:badge_issued:{user_id}:{course_slug}:{article_id}"
    issued_at = r.get(date_key)
    if not issued_at:
        issued_at = time.strftime("%Y-%m-%d")
        r.set(date_key, issued_at)

    name = r.get(f"soc:name:{user_id}") or ""

    payload = {
        "eligible":     True,
        "user_id":      user_id,
        "course_slug":  course_slug,
        "course_title": course["title"],
        "article_id":   article_id,
        "article_title": pass_data.get("title", article_id),
        "score":        pass_data.get("score", 0),
        "pct":          pct,
        "name":         name,
        "issued_at":    issued_at,
        "sponsor":      course.get("sponsor") or None,
    }
    # Plant enrichment so the badge can display "Agastache" + "Agastache foeniculum"
    if _course_article_source(course_slug) == "plants":
        for p in _fetch_plant_catalog():
            if p["id"] == article_id:
                payload["common"] = p["common"]
                payload["latin"]  = p["latin"]
                break
    return jsonify(payload)


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


# ---------------------------------------------------------------------------
# Dynamic course — Reading Comprehension
# ---------------------------------------------------------------------------

ARC_FEED_URL       = "https://arc-codex.com/api/get_feed"
ARC_PLANTS_URL     = "https://arc-codex.com/api/plants"
ARC_ARTICLE_URL    = "https://arc-codex.com/api/article"
HUNTAEGIS_FEED_URL    = "https://huntaegis.com/api/get_feed"
HUNTAEGIS_ARTICLE_URL = "https://huntaegis.com/api/article"
ARC_CACHE_TTL      = 1800          # 30 min article list cache
ARC_QUESTIONS_TTL  = 86400         # 24 hr question cache per article
ARC_TEXT_FOR_GEN   = 5000          # chars sent to Ollama for question gen
ARC_TEXT_FOR_GRADE = 4000          # chars sent to Ollama per criterion

# Vocabulary-quiz config (quiz_mode: vocab courses). Extraction is wordfreq
# Zipf-banding + proper-noun filter; definitions come from a real dictionary
# (NEVER the model — the model only selects words and sense-matches). See
# _build_vocab_questions for the full pipeline.
DICT_API_URL       = "https://api.dictionaryapi.dev/api/v2/entries/en"
DICT_CACHE_TTL     = 30 * 86400    # 30 days — definitions don't change
VOCAB_ZIPF_MIN     = 1.8           # below this: proper nouns / regional jargon
VOCAB_ZIPF_MAX     = 3.0           # above this: too common to be worth teaching
VOCAB_MIN_LEN      = 6             # skip short words
VOCAB_SHORTLIST    = 14            # candidates handed to the model to pick from
VOCAB_N            = 5             # words per quiz (matches the 5-item engine)


def _fetch_arc_articles(limit: int = 24) -> list[dict]:
    """Fetch articles from Arc Codex public feed. Redis-cached for 30 min."""
    cache_key = f"soc:arc_feed_cache:{limit}"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    try:
        resp = http_requests.get(ARC_FEED_URL, params={"limit": limit}, timeout=12)
        resp.raise_for_status()
        articles = resp.json()
        if not isinstance(articles, list):
            return []
        # English only, must have readable text
        filtered = [
            a for a in articles
            if (a.get("source_lang") or "en").lower() in ("en", "english")
            and len(a.get("original_text") or "") > 300
        ][:limit]
        r.set(cache_key, json.dumps(filtered), ex=ARC_CACHE_TTL)
        return filtered
    except Exception as exc:
        app.logger.warning(f"[arc_feed] fetch failed: {exc}")
        return []


def _article_id(a: dict) -> str:
    return str(a.get("id") or a.get("article_id") or "")


# ---------------------------------------------------------------------------
# Plant catalog — curated list at arc-codex.com/api/plants, used by the
# plant-badge course. Same HTTP boundary as the news feed; no arc_stack code
# imported. The catalog is small (~76 entries) and changes rarely, so 30-min
# cache is plenty. Per-article text is fetched on demand and cached
# separately so an article a user picked is hot for their session.
# ---------------------------------------------------------------------------

def _fetch_plant_catalog() -> list[dict]:
    """Returns flattened list [{id, title, common, latin}, ...] from arc's
    plant catalog. Article IDs extracted from the /article/{id} URL."""
    cache_key = "soc:plants_catalog_cache"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    try:
        resp = http_requests.get(ARC_PLANTS_URL, timeout=12)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        app.logger.warning(f"[plants] catalog fetch failed: {exc}")
        return []
    flat: list[dict] = []
    for group in ("annuals", "perennials"):
        for p in data.get(group, []):
            url = (p.get("url") or "").strip()
            if "/article/" not in url:
                continue
            aid = url.rsplit("/article/", 1)[-1].strip("/")
            if not aid:
                continue
            common = (p.get("common") or "").strip()
            latin  = (p.get("latin") or "").strip()
            flat.append({
                "id":     aid,
                "title":  f"{common} ({latin})" if common and latin else (common or latin or aid),
                "common": common,
                "latin":  latin,
            })
    r.set(cache_key, json.dumps(flat), ex=ARC_CACHE_TTL)
    return flat


def _fetch_plant_article(article_id: str) -> dict | None:
    """Fetch a single plant article (full text + metadata) from arc-codex.
    Cached 30 min per id."""
    cache_key = f"soc:plant_article_cache:{article_id}"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    try:
        resp = http_requests.get(f"{ARC_ARTICLE_URL}/{article_id}", timeout=12)
        if resp.status_code != 200:
            return None
        article = resp.json()
        if not isinstance(article, dict):
            return None
        r.set(cache_key, json.dumps(article), ex=ARC_CACHE_TTL)
        return article
    except Exception as exc:
        app.logger.warning(f"[plants] article {article_id} fetch failed: {exc}")
        return None


def _course_article_source(course_slug: str) -> str:
    """Returns the article-source for a course: 'plants' for the plant-badge
    course, 'news' otherwise. Read from lessons.yaml `article_source` field
    so future courses can switch sources without code changes."""
    c = COURSES_BY_SLUG.get(course_slug, {})
    return (c.get("article_source") or "news").strip()


def _fetch_arc_article_by_id(article_id: str) -> dict | None:
    """Direct per-id fetch from arc-codex. Used by Quiz Me when an article
    is older than the latest news fetch (`_fetch_arc_articles` returns ~24)
    and isn't in the plant catalog. Cached 30 min per id."""
    cache_key = f"soc:arc_article_cache:{article_id}"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    try:
        resp = http_requests.get(f"{ARC_ARTICLE_URL}/{article_id}", timeout=12)
        if resp.status_code != 200:
            return None
        article = resp.json()
        if not isinstance(article, dict):
            return None
        r.set(cache_key, json.dumps(article), ex=ARC_CACHE_TTL)
        return article
    except Exception as exc:
        app.logger.warning(f"[arc_article] {article_id} fetch failed: {exc}")
        return None


# ---------------------------------------------------------------------------
# Dynamic-course registry — generic feed selection.
#
# A dynamic course is a CONFIG RECORD (the `dynamic:` block in lessons.yaml),
# read into DYNAMIC_COURSE_CFG at import. ONE generic fetcher reads that record
# instead of a hand-written _fetch_arc_<topic> per course. Selector types cover
# everything built so far:
#   - none       : the raw feed (reading-comprehension, pop-quiz, quiz-me)
#   - category   : one arc-codex `category` value (finance's economic_finance)
#   - classifier : a precision-first keyword regex (AI, religion) over a wide
#                  window — title-anchored OR N distinct on-topic body terms
# `source` selects the upstream feed (arc | huntaegis); plants is a separate
# catalog path and stays an escape hatch.
#
# Caching: the per-course result is keyed on the selector's `cache_version`, so
# tuning a classifier regex (bump the version) self-busts stale 30-min entries.
# ---------------------------------------------------------------------------

_PATTERN_CACHE: dict[str, "re.Pattern"] = {}


def _compiled(pattern: str) -> "re.Pattern":
    """Compile-and-cache a classifier regex (case-insensitive)."""
    p = _PATTERN_CACHE.get(pattern)
    if p is None:
        p = re.compile(pattern, re.I)
        _PATTERN_CACHE[pattern] = p
    return p


def _passes_selector(a: dict, selector: dict) -> bool:
    """True if article `a` matches a course's selector record."""
    stype = (selector.get("type") or "none").lower()
    if stype == "none":
        return True
    if stype == "category":
        want = (selector.get("category") or "").strip().lower()
        return (a.get("category") or "").strip().lower() == want
    if stype == "classifier":
        pat = _compiled(selector.get("pattern") or r"(?!)")
        if selector.get("title_anchor", True) and pat.search(a.get("title") or ""):
            return True
        scan = selector.get("body_scan_chars", 1500)
        lead = (a.get("original_text") or "")[:scan]
        hits = {m.group(0).lower() for m in pat.finditer(lead)}
        return len(hits) >= selector.get("body_min_distinct", 3)
    return False


def _raw_feed(source: str, window: int) -> list[dict]:
    """Fetch a raw upstream feed window, English + readable only. Cached 30 min
    per (source, window) so selectors over the same feed share one HTTP pull."""
    url = HUNTAEGIS_FEED_URL if source == "huntaegis" else ARC_FEED_URL
    cache_key = f"soc:raw_feed:{source}:{window}"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    try:
        resp = http_requests.get(url, params={"limit": window}, timeout=15)
        resp.raise_for_status()
        articles = resp.json()
        if not isinstance(articles, list):
            return []
        articles = [
            a for a in articles
            if (a.get("source_lang") or "en").lower() in ("en", "english")
            and len(a.get("original_text") or "") > 300
        ]
        r.set(cache_key, json.dumps(articles), ex=ARC_CACHE_TTL)
        return articles
    except Exception as exc:
        app.logger.warning(f"[raw_feed:{source}] fetch failed: {exc}")
        return []


def _fetch_arc_dynamic(course_slug: str, limit: int | None = None) -> list[dict]:
    """Generic dynamic-course fetcher. Reads the course's `dynamic:` config
    (source + selector + fetch_window + cache_version) and returns the filtered,
    capped article list. Replaces the per-course _fetch_arc_<topic> functions.
    Result cached 30 min, keyed on cache_version for self-busting on regex edits."""
    cfg = DYNAMIC_COURSE_CFG.get(course_slug)
    if not cfg:
        return []
    source   = cfg.get("source", "arc")
    window   = int(cfg.get("fetch_window", 100))
    selector = cfg.get("selector") or {"type": "none"}
    result_n = int(limit if limit is not None else cfg.get("result_limit", 24))
    cv       = cfg.get("cache_version", 1)
    cache_key = f"soc:dyn_feed:{cfg['source_key']}:v{cv}:{result_n}"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    raw = _raw_feed(source, window)
    filtered = [a for a in raw if _passes_selector(a, selector)][:result_n]
    r.set(cache_key, json.dumps(filtered), ex=ARC_CACHE_TTL)
    return filtered


def _summarize_article(a: dict) -> dict:
    """The article-summary shape every dynamic picker returns. `_huntaegis_date_str`
    handles both ISO date strings (arc) and ms-epoch timestamps (huntaegis)."""
    text = (a.get("original_text") or "").strip()
    return {
        "id":           _article_id(a),
        "title":        (a.get("title") or "Untitled").strip(),
        "source":       (a.get("source_name") or a.get("source") or "").strip(),
        "category":     (a.get("category") or "").strip(),
        "published_at": _huntaegis_date_str(a),
        "preview":      text[:220] + "…" if len(text) > 220 else text,
        "word_count":   len(text.split()),
    }


def _fetch_huntaegis_article_by_id(article_id: str) -> dict | None:
    """Direct per-id fetch from Huntaegis. Mirrors the arc-codex per-id
    helper so cyber-security-daily can resolve an article that just
    aged out of the latest-24 feed cache. Cached 30 min per id."""
    cache_key = f"soc:huntaegis_article_cache:{article_id}"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    try:
        resp = http_requests.get(f"{HUNTAEGIS_ARTICLE_URL}/{article_id}", timeout=12)
        if resp.status_code != 200:
            return None
        article = resp.json()
        if not isinstance(article, dict):
            return None
        r.set(cache_key, json.dumps(article), ex=ARC_CACHE_TTL)
        return article
    except Exception as exc:
        app.logger.warning(f"[huntaegis_article] {article_id} fetch failed: {exc}")
        return None


def _resolve_dynamic_article(article_id: str) -> dict | None:
    """Single point for finding an article by id across all dynamic sources.
    Scans every REGISTERED dynamic course feed (a loop over the registry, not a
    hand-maintained per-course ladder — so a new course can't be silently
    skipped), then the plant catalog, then direct per-id fetches from arc-codex
    and huntaegis. The direct fallbacks are the AGED-OUT path: they let Quiz Me
    and a resumed quiz work on any published article, not just the latest feed."""
    # 1) Every registered dynamic feed (cached — cheap). Covers news, finance,
    #    AI, religion, cyber, and any future course automatically.
    for slug in DYNAMIC_COURSE_CFG:
        for a in _fetch_arc_dynamic(slug):
            if _article_id(a) == article_id:
                return a
    # 2) Plant catalog — looked up by id, then text fetched
    if any(p["id"] == article_id for p in _fetch_plant_catalog()):
        return _fetch_plant_article(article_id)
    # 3) Direct per-id fetches — the aged-out path (article rolled off the feed)
    return _fetch_arc_article_by_id(article_id) or _fetch_huntaegis_article_by_id(article_id)


@app.route("/api/dynamic/course/<course_slug>")
def list_dynamic_course(course_slug: str):
    """Generic dynamic-course article picker. Reads the course's registry config
    and returns summaries via the shared shape. One route for every
    category/classifier/news course — replaces the per-course endpoints."""
    if course_slug not in DYNAMIC_COURSE_CFG:
        return jsonify({"error": "Not a registry-driven dynamic course"}), 404
    articles = _fetch_arc_dynamic(course_slug)
    if not articles:
        return jsonify({"error": "Could not reach the article feed"}), 503
    return jsonify([_summarize_article(a) for a in articles])


@app.route("/api/dynamic/plants")
def list_dynamic_plants():
    """Return the plant catalog summaries (no article text — just the picker
    list). The course page for plant-badge calls this to render the article
    grid. ~76 entries; cached 30 min upstream."""
    plants = _fetch_plant_catalog()
    if not plants:
        return jsonify({"error": "Could not reach Arc Codex plant catalog"}), 503
    summaries = []
    for p in plants:
        summaries.append({
            "id":           p["id"],
            "title":        p["title"],
            "source":       "Arc Codex",
            "category":     "plants",
            "common":       p["common"],
            "latin":        p["latin"],
            "published_at": "",
            "preview":      f"{p['common']} — {p['latin']}",
            "word_count":   0,
        })
    return jsonify(summaries)


def _huntaegis_date_str(article: dict) -> str:
    """Huntaegis articles carry `timestamp` as ms-since-epoch (int or string
    of digits); the course-page UI slices the first 10 chars expecting an
    ISO date. Convert numeric timestamps to YYYY-MM-DD; pass real date
    strings through unchanged."""
    raw = article.get("published_at") or article.get("created_at") or article.get("timestamp")
    if not raw:
        return ""
    if isinstance(raw, str):
        if not raw.isdigit():
            return raw
        try:
            n = int(raw)
        except Exception:
            return raw
    else:
        try:
            n = int(raw)
        except Exception:
            return ""
    try:
        secs = n / 1000 if n > 10**12 else n
        return time.strftime("%Y-%m-%d", time.gmtime(secs))
    except Exception:
        return ""


@app.route("/api/dynamic/articles")
def list_dynamic_articles():
    # Optional ?limit= for the Pop Quiz course (7 most recent). Capped at 50
    # so the public endpoint can't be used as a feed-scrape.
    limit = max(1, min(50, request.args.get("limit", default=24, type=int)))
    articles = _fetch_arc_articles(limit=limit)
    if not articles:
        return jsonify({"error": "Could not reach Arc Codex feed"}), 503
    summaries = []
    for a in articles:
        text = (a.get("original_text") or "").strip()
        summaries.append({
            "id":           _article_id(a),
            "title":        (a.get("title") or "Untitled").strip(),
            "source":       (a.get("source_name") or a.get("source") or "").strip(),
            "category":     (a.get("category") or "").strip(),
            "published_at": (a.get("published_at") or a.get("created_at") or a.get("timestamp") or "").strip(),
            "preview":      text[:220] + "…" if len(text) > 220 else text,
            "word_count":   len(text.split()),
        })
    return jsonify(summaries)


@app.route("/api/dynamic/article/<article_id>")
def get_dynamic_article(article_id: str):
    article = _resolve_dynamic_article(article_id)
    if not article:
        return jsonify({"error": "Article not found"}), 404
    text = (article.get("original_text") or "").strip()
    return jsonify({
        "id":           _article_id(article),
        "title":        (article.get("title") or "Untitled").strip(),
        "source":       (article.get("source") or "").strip(),
        "category":     (article.get("category") or "").strip(),
        "published_at": (article.get("published_at") or article.get("created_at") or "").strip(),
        "text":         text,
        "word_count":   len(text.split()),
    })


# ---------------------------------------------------------------------------
# Vocabulary quiz (quiz_mode: vocab) — a second quiz mode over the SAME dynamic
# engine. It reuses the questions/submit/job/badge contract verbatim; only the
# generator and grader differ. Item shape stays {question, criterion, ...} so
# the existing ArticleTestClient renders it with no changes.
#
# Fabrication resistance (the whole point — proven necessary in discovery):
#   - WORD CHOICE  : wordfreq Zipf-band + proper-noun filter (deterministic).
#   - DEFINITIONS  : a real dictionary API is ground truth. The model NEVER
#                    writes a definition; its only job is selecting which words
#                    to teach and which dictionary SENSE matches the article's
#                    sentence — both bounded, trustworthy.
#   - SOURCE SENTENCE: quoted from the article, fabrication-proof by construction.
#   - ETYMOLOGY    : deferred — no reliable free structured source; omitted
#                    rather than fabricated.
# ---------------------------------------------------------------------------
_VOCAB_WORD_RE = re.compile(r"[A-Za-z][A-Za-z'\-]{2,}")
_VOCAB_SENT_RE = re.compile(r"[^.!?]*[.!?]")


def _course_quiz_mode(course_slug: str) -> str:
    """'vocab' for a vocabulary course, 'comprehension' otherwise. Driven by the
    registry `dynamic.quiz_mode` field so a new quiz type is still config-first."""
    cfg = DYNAMIC_COURSE_CFG.get(course_slug) or {}
    return (cfg.get("quiz_mode") or "comprehension").strip().lower()


def _lookup_definition(word: str) -> dict | None:
    """Ground-truth dictionary lookup (cached 30d). Returns
    {word, pos, senses:[{pos, definition, example}]} or None if the word is not
    a real dictionary entry — which auto-drops proper nouns/neologisms that the
    frequency band let through (e.g. 'superintelligence' 404s and is excluded)."""
    lw = word.lower()
    cache_key = f"soc:vocab_def:{lw}"
    cached = r.get(cache_key)
    if cached is not None:
        val = json.loads(cached)
        return val or None  # cached "" (json null) marks a known miss
    senses: list[dict] = []
    try:
        resp = http_requests.get(f"{DICT_API_URL}/{lw}", timeout=8)
        if resp.status_code == 200:
            for entry in resp.json():
                for meaning in entry.get("meanings", []):
                    pos = (meaning.get("partOfSpeech") or "").strip()
                    for d in meaning.get("definitions", []):
                        definition = (d.get("definition") or "").strip()
                        if definition:
                            senses.append({
                                "pos":        pos,
                                "definition": definition,
                                "example":    (d.get("example") or "").strip(),
                            })
    except Exception as exc:
        app.logger.warning(f"[vocab_def] {lw}: {exc}")
        return None  # transient — don't poison the cache with a miss
    result = {"word": lw, "pos": senses[0]["pos"] if senses else "", "senses": senses[:6]} if senses else None
    r.set(cache_key, json.dumps(result or ""), ex=DICT_CACHE_TTL)
    return result


def _vocab_source_sentence(text: str, word: str) -> str:
    """The article's own sentence containing the word — fabrication-proof context."""
    lw = word.lower()
    for sent in _VOCAB_SENT_RE.findall(text):
        if re.search(rf"\b{re.escape(lw)}\b", sent, re.I):
            return " ".join(sent.split())[:300]
    return ""


def _extract_vocab_candidates(text: str) -> list[dict]:
    """Deterministic extraction: wordfreq Zipf-band + proper-noun filter +
    min-length. Returns candidates [{word, source_sentence}] ranked hardest-first
    (lowest Zipf), deduped. No model involved at this stage."""
    from wordfreq import zipf_frequency
    forms: dict[str, set[str]] = {}
    for m in _VOCAB_WORD_RE.finditer(text):
        w = m.group(0)
        forms.setdefault(w.lower(), set()).add(w)
    scored: list[tuple[str, float]] = []
    for lw, surfaces in forms.items():
        if len(lw) < VOCAB_MIN_LEN:
            continue
        if all(s[0].isupper() for s in surfaces):   # only ever capitalized → proper noun
            continue
        z = zipf_frequency(lw, "en")
        if VOCAB_ZIPF_MIN <= z <= VOCAB_ZIPF_MAX:
            scored.append((lw, z))
    scored.sort(key=lambda x: x[1])  # rarest first
    out = []
    for lw, _z in scored[:VOCAB_SHORTLIST]:
        out.append({"word": lw, "source_sentence": _vocab_source_sentence(text, lw)})
    return out


def _build_vocab_questions(article: dict) -> list[dict]:
    """Assemble VOCAB_N quiz items from an article. Pipeline:
       1. extract candidate words (deterministic, frequency band)
       2. fetch each word's dictionary entry (ground truth; drops non-words)
       3. ONE model call: pick the most teachable words + the sense index that
          matches each word's article sentence (selection only — no definitions)
       4. assemble {question, criterion, word, definition, example, source_sentence}
    Returns [] if too few real words survive (caller falls back / errors)."""
    text = (article.get("original_text") or "").strip()
    candidates = _extract_vocab_candidates(text)
    # Attach ground-truth dictionary entries; keep only real, defined words.
    enriched = []
    for c in candidates:
        entry = _lookup_definition(c["word"])
        if entry and entry.get("senses"):
            enriched.append({**c, "entry": entry})
    if len(enriched) < VOCAB_N:
        return []

    # One bounded model call: choose the 5 most teachable and the matching sense.
    listing = []
    for i, e in enumerate(enriched):
        senses = "; ".join(f"[{j}] ({s['pos']}) {s['definition']}" for j, s in enumerate(e["entry"]["senses"]))
        listing.append(f'{i}. "{e["word"]}" — sentence: "{e["source_sentence"]}"\n   senses: {senses}')
    pick_prompt = (
        "You are choosing vocabulary words to teach from a news article. Below are candidate "
        "words, each with the sentence it appeared in and its dictionary senses.\n\n"
        "Pick the " + str(VOCAB_N) + " words that are the most enriching/teachable for a curious adult "
        "(skip dull or overly technical ones). For EACH chosen word, also give the index of the dictionary "
        "sense that best matches how the word is used in its sentence.\n"
        "Do NOT write your own definitions — only choose words and sense indices.\n\n"
        "CANDIDATES:\n" + "\n".join(listing) + "\n\n"
        'Return ONLY a JSON array of exactly ' + str(VOCAB_N) + ' objects: '
        '[{"index": <candidate number>, "sense": <sense index>}]'
    )
    chosen: list[dict] = []
    try:
        raw, _ = _call_ollama(pick_prompt, timeout=90)
        m = re.search(r"\[.*\]", raw, re.DOTALL)
        picks = json.loads(m.group() if m else raw)
        seen = set()
        for p in picks:
            i = int(p.get("index", -1))
            s = int(p.get("sense", 0))
            if 0 <= i < len(enriched) and i not in seen:
                seen.add(i)
                chosen.append({"cand": enriched[i], "sense": s})
    except Exception as exc:
        app.logger.warning(f"[vocab] model selection failed, using frequency order: {exc}")
    # Fallback: rarest-first with the primary sense.
    if len(chosen) < VOCAB_N:
        have = {id(c["cand"]) for c in chosen}
        for e in enriched:
            if len(chosen) >= VOCAB_N:
                break
            if id(e) not in have:
                chosen.append({"cand": e, "sense": 0})
    chosen = chosen[:VOCAB_N]

    items = []
    for ch in chosen:
        e = ch["cand"]
        senses = e["entry"]["senses"]
        sense = senses[ch["sense"]] if 0 <= ch["sense"] < len(senses) else senses[0]
        word = e["word"]
        definition = sense["definition"]
        pos = sense["pos"]
        sent = e["source_sentence"]
        items.append({
            "question": (f'Define the word “{word}” as it is used in this sentence from the '
                         f'article:\n\n“{sent}”'),
            "criterion": f'Answer conveys the meaning: "{definition}"' + (f" ({pos})" if pos else ""),
            "word":            word,
            "definition":      definition,
            "part_of_speech":  pos,
            "example":         sense.get("example", ""),
            "source_sentence": sent,
        })
    return items


@app.route("/api/dynamic/questions/<article_id>", methods=["POST"])
def generate_dynamic_questions(article_id: str):
    """Generate 5 quiz items. Comprehension by default; a vocabulary quiz when
    called with ?course=<a quiz_mode:vocab course>. Cached per article+mode 24 hr."""
    quiz_mode = _course_quiz_mode(request.args.get("course", ""))
    cache_key = f"soc:dynamic:questions:{quiz_mode}:{article_id}"
    cached = r.get(cache_key)
    if cached:
        return jsonify(json.loads(cached))

    article = _resolve_dynamic_article(article_id)
    if not article:
        return jsonify({"error": "Article not found"}), 404

    title = (article.get("title") or "Untitled").strip()

    if quiz_mode == "vocab":
        try:
            questions = _build_vocab_questions(article)
        except Exception as exc:
            app.logger.error(f"[vocab_questions] {article_id}: {exc}")
            return jsonify({"error": f"Vocabulary extraction failed: {exc}"}), 500
        if len(questions) < VOCAB_N:
            return jsonify({"error": "Not enough teachable vocabulary in this article — pick another."}), 422
        result = {"article_id": article_id, "title": title, "questions": questions}
        r.set(cache_key, json.dumps(result), ex=ARC_QUESTIONS_TTL)
        return jsonify(result)

    text  = (article.get("original_text") or "").strip()[:ARC_TEXT_FOR_GEN]

    # Propagate Arc's cloud circuit breaker — same Ollama instance, no point trying cloud if Arc tripped it
    try:
        arc_resp = http_requests.get(ARC_CLOUD_STATUS_URL, timeout=3)
        if arc_resp.status_code == 200 and not arc_resp.json().get("available", True):
            _trip_cloud_breaker()
            app.logger.info("[dynamic_questions] Arc reports cloud unavailable — circuit breaker seeded locally")
    except Exception:
        pass  # non-blocking; local breaker state still applies

    gen_prompt = f"""You are a reading comprehension instructor. Your job is to create exactly 5 questions that test whether a student has read and understood the following article.

Rules:
- Every question must be answerable ONLY by reading this specific article — not by general knowledge.
- Questions should probe different aspects: key facts, cause-and-effect, implications, specific details.
- Each question should require a 2–4 sentence answer.
- Do not repeat the same point across multiple questions.

Article title: {title}
Article text:
{text}

Return ONLY a valid JSON array of exactly 5 objects. No markdown, no preamble, no explanation.
Each object must have exactly two keys:
  "question"  — the question to ask the student (1–2 sentences)
  "criterion" — what a correct answer must demonstrate (1 sentence, used for grading)

Example format:
[
  {{"question": "...", "criterion": "..."}},
  {{"question": "...", "criterion": "..."}},
  {{"question": "...", "criterion": "..."}},
  {{"question": "...", "criterion": "..."}},
  {{"question": "...", "criterion": "..."}}
]"""

    try:
        raw, _ = _call_ollama(gen_prompt, timeout=120)
        # Strip markdown fences if present
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:-1] if lines[-1].strip().startswith("```") else lines[1:])
        # Extract JSON array (be tolerant of leading/trailing text)
        m = re.search(r'\[.*\]', raw, re.DOTALL)
        questions = json.loads(m.group() if m else raw.strip())
        if not isinstance(questions, list) or len(questions) < 5:
            raise ValueError(f"Expected list of 5, got {type(questions).__name__}({len(questions) if isinstance(questions,list) else '?'})")
        questions = questions[:5]
        result = {"article_id": article_id, "title": title, "questions": questions}
        r.set(cache_key, json.dumps(result), ex=ARC_QUESTIONS_TTL)
        return jsonify(result)
    except Exception as exc:
        app.logger.error(f"[dynamic_questions] {article_id}: {exc}")
        return jsonify({"error": f"Question generation failed: {exc}"}), 500


@app.route("/api/dynamic/submit", methods=["POST"])
def submit_dynamic():
    """Create a grading job for a dynamic quiz attempt (comprehension or vocab).
    `course_slug` selects the quiz mode; vocab grades typed definitions against
    the dictionary entry (carried in each item) instead of the article."""
    data       = request.get_json(force=True)
    article_id = data.get("article_id", "")
    questions  = data.get("questions", [])    # list of {question, criterion, ...}
    answers    = data.get("answers", [])
    user_id    = data.get("user_id", "anonymous")
    quiz_mode  = _course_quiz_mode(data.get("course_slug", ""))

    if not article_id or len(questions) != 5 or len(answers) != 5:
        return jsonify({"error": "Requires article_id, 5 questions, 5 answers"}), 400

    article = _resolve_dynamic_article(article_id)
    if not article:
        return jsonify({"error": "Article not found"}), 404

    article_title = (article.get("title") or "Untitled").strip()
    article_text  = (article.get("original_text") or "").strip()[:ARC_TEXT_FOR_GRADE]

    job_id   = str(uuid.uuid4())
    criteria = [
        {
            "criterion":  (q.get("criterion") or q.get("question", ""))[:120],
            "points":     20,
            "status":     "pending",
            "earned":     None,
            "comment":    None,
        }
        for q in questions
    ]
    job = {
        "job_id":         job_id,
        "status":         "grading",
        "criteria":       criteria,
        "total_earned":   0,
        "total_possible": 100,
        "complete_count": 0,
    }
    _write_job(job_id, job)

    threading.Thread(
        target=_grade_dynamic_job,
        args=(job_id, article_id, article_title, article_text, questions, answers, user_id, quiz_mode),
        daemon=True,
    ).start()

    return jsonify({"job_id": job_id})


def _grade_dynamic_job(
    job_id: str,
    article_id: str,
    article_title: str,
    article_text: str,
    questions: list[dict],
    answers: list[str],
    user_id: str,
    quiz_mode: str = "comprehension",
) -> None:
    """Sequential per-item grading. Comprehension grades answers against the
    article; vocab grades typed definitions against the DICTIONARY entry carried
    on each item (the model never supplied the meaning). Vocab passes are stored
    under a `vocab:` field prefix so they never collide with comprehension badges
    for the same article."""
    for i, (q, answer) in enumerate(zip(questions, answers)):
        question_text = q.get("question", "")
        criterion     = q.get("criterion", "")

        if quiz_mode == "vocab":
            word       = q.get("word", "")
            definition = q.get("definition", "") or criterion
            sentence   = q.get("source_sentence", "")
            grade_prompt = f"""You are a vocabulary tutor grading whether a student correctly defined a word.

WORD: {word}
THE SENTENCE IT APPEARED IN: {sentence}
CORRECT MEANING (authoritative dictionary definition — this is the source of truth): {definition}
STUDENT'S DEFINITION: {answer}

Award 0–20 points based ONLY on whether the student's definition matches the dictionary meaning above:
- 20: correctly conveys the dictionary meaning (paraphrasing in their own words is fine)
- 14–18: mostly correct, minor imprecision or vagueness
- 8–12: partially correct, or the right general area but missing the core sense
- 0–6: wrong, blank, a different word's meaning, or just repeats the word
A correct general definition earns full marks — do NOT require article-specific detail.

Return ONLY valid JSON (no markdown, no extra text):
{{"earned": <integer 0–20>, "comment": "<one sentence explaining the score>"}}"""
        else:
            grade_prompt = f"""You are a reading comprehension instructor grading a student's answer.

ARTICLE TITLE: {article_title}
ARTICLE (excerpt — use this as the source of truth):
{article_text}

QUESTION: {question_text}
WHAT THE ANSWER MUST DEMONSTRATE: {criterion}
STUDENT'S ANSWER: {answer}

Award 0–20 points:
- 20: answer correctly references specific content from the article
- 14–18: mostly correct, minor gaps or slight vagueness
- 8–12: partially correct or too general
- 0–6: wrong, blank, or answerable without reading the article

Return ONLY valid JSON (no markdown, no extra text):
{{"earned": <integer 0–20>, "comment": "<one sentence explaining the score>"}}"""

        earned  = 0
        comment = "Grading error."
        try:
            raw, _ = _call_ollama(grade_prompt, timeout=90)
            if raw.startswith("```"):
                lines = raw.split("\n")
                raw = "\n".join(lines[1:-1] if lines[-1].strip().startswith("```") else lines[1:])
            m = re.search(r'\{[^{}]+\}', raw, re.DOTALL)
            result  = json.loads(m.group() if m else raw.strip())
            earned  = max(0, min(20, int(result.get("earned", 0))))
            comment = str(result.get("comment", "")).strip()[:300] or "No comment."
        except Exception as exc:
            app.logger.error(f"[grade_dynamic] {job_id} q{i}: {exc}")

        raw_job = r.get(f"soc:job:{job_id}")
        if not raw_job:
            return
        job = json.loads(raw_job)
        job["criteria"][i]["status"]  = "complete"
        job["criteria"][i]["earned"]  = earned
        job["criteria"][i]["comment"] = comment
        job["complete_count"] = sum(1 for c in job["criteria"] if c["status"] == "complete")
        job["total_earned"]   = sum(c.get("earned") or 0 for c in job["criteria"])

        if job["complete_count"] == 5:
            job["status"] = "complete"
            if user_id != "anonymous":
                pct = round((job["total_earned"] / 100) * 100)
                if pct >= 70:
                    # Store article pass: hash field = article_id (vocab passes are
                    # prefixed so they never collide with a comprehension badge for
                    # the same article), value = JSON.
                    pass_field = f"vocab:{article_id}" if quiz_mode == "vocab" else article_id
                    r.hset(
                        f"soc:dynamic_pass:{user_id}",
                        pass_field,
                        json.dumps({"score": job["total_earned"], "title": article_title, "pct": pct}),
                    )

        _write_job(job_id, job)
        app.logger.info(f"[grade_dynamic] {job_id} q{i+1}/5 earned={earned}/20 total={job['total_earned']}")


@app.route("/api/dynamic/progress/<user_id>")
def get_dynamic_progress(user_id: str):
    """Return passed articles for this user."""
    raw = r.hgetall(f"soc:dynamic_pass:{user_id}")
    passed = []
    for article_id, val in raw.items():
        try:
            d = json.loads(val)
            passed.append({"article_id": article_id, **d})
        except Exception:
            pass
    return jsonify({"passed": passed, "passed_count": len(passed)})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5007, debug=True)
