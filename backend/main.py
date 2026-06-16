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
        "lesson_type": course.get("lesson_type", ""),
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
ARC_CACHE_TTL      = 1800          # 30 min article list cache
ARC_QUESTIONS_TTL  = 86400         # 24 hr question cache per article
ARC_TEXT_FOR_GEN   = 5000          # chars sent to Ollama for question gen
ARC_TEXT_FOR_GRADE = 4000          # chars sent to Ollama per criterion


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


@app.route("/api/dynamic/articles")
def list_dynamic_articles():
    articles = _fetch_arc_articles()
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
    articles = _fetch_arc_articles()
    article  = next((a for a in articles if _article_id(a) == article_id), None)
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


@app.route("/api/dynamic/questions/<article_id>", methods=["POST"])
def generate_dynamic_questions(article_id: str):
    """Generate 5 comprehension questions. Cached per article for 24 hr."""
    cache_key = f"soc:dynamic:questions:{article_id}"
    cached = r.get(cache_key)
    if cached:
        return jsonify(json.loads(cached))

    articles = _fetch_arc_articles()
    article  = next((a for a in articles if _article_id(a) == article_id), None)
    if not article:
        return jsonify({"error": "Article not found"}), 404

    title = (article.get("title") or "Untitled").strip()
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
    """Create a grading job for a dynamic reading-comprehension attempt."""
    data       = request.get_json(force=True)
    article_id = data.get("article_id", "")
    questions  = data.get("questions", [])    # list of {question, criterion}
    answers    = data.get("answers", [])
    user_id    = data.get("user_id", "anonymous")

    if not article_id or len(questions) != 5 or len(answers) != 5:
        return jsonify({"error": "Requires article_id, 5 questions, 5 answers"}), 400

    articles = _fetch_arc_articles()
    article  = next((a for a in articles if _article_id(a) == article_id), None)
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
        args=(job_id, article_id, article_title, article_text, questions, answers, user_id),
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
) -> None:
    """Sequential per-question grading with article as context."""
    for i, (q, answer) in enumerate(zip(questions, answers)):
        question_text = q.get("question", "")
        criterion     = q.get("criterion", "")

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
                    # Store article pass: hash field = article_id, value = JSON
                    r.hset(
                        f"soc:dynamic_pass:{user_id}",
                        article_id,
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
