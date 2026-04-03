#!/bin/bash
# claude_stack.sh — School of Chat Stack Manager

# ==============================================================================
# CONFIGURATION
# ==============================================================================
SOC_ROOT="/home/www/claude_stack"
FRONTEND_DIR="$SOC_ROOT/frontend"
BACKEND_DIR="$SOC_ROOT/backend"
VENV="$BACKEND_DIR/venv/bin/activate"
LOG_DIR="$SOC_ROOT/logs"
PID_DIR="$SOC_ROOT/pids"
BACKUP_DIR="$SOC_ROOT/backups"
BACKUP_KEEP=5
COMPOSE_FILE="$SOC_ROOT/docker-compose.yml"

export PATH="/home/ross/.nvm/versions/node/v22.16.0/bin:$PATH"

SERVICES=(
    "gunicorn|$BACKEND_DIR|./gunicorn_soc.sh|true|5007"
    "frontend|$SOC_ROOT|docker|false|3004"
)

# ==============================================================================
# HELPERS
# ==============================================================================
mkdir -p "$LOG_DIR" "$PID_DIR" "$BACKUP_DIR"

is_running() {
    local name="$1"
    if [ "$name" = "frontend" ]; then
        docker ps --filter "name=soc-frontend" --filter "status=running" -q 2>/dev/null | grep -q .
        return
    fi
    local pidfile="$PID_DIR/$name.pid"
    [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null
}

free_port() {
    local port="$1"
    [ -z "$port" ] && return
    local pids
    pids=$(lsof -t -i:"$port" 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "    🔧 Freeing port $port (pids: $pids)"
        echo "$pids" | xargs kill 2>/dev/null
        sleep 1
        pids=$(lsof -t -i:"$port" 2>/dev/null)
        [ -n "$pids" ] && echo "$pids" | xargs kill -9 2>/dev/null
    fi
}

start_service() {
    local name dir cmd use_venv port
    IFS='|' read -r name dir cmd use_venv port <<< "$1"
    if is_running "$name"; then
        echo "  ⏭️  $name already running"
        return
    fi
    echo "  🚀 Starting $name..."
    free_port "$port"

    if [ "$cmd" = "docker" ]; then
        docker compose -f "$COMPOSE_FILE" up -d --no-deps "$name" >> "$LOG_DIR/$name.log" 2>&1
        sleep 6
        if docker ps --filter "name=soc-$name" --filter "status=running" -q | grep -q .; then
            echo "    ✅ $name up (docker soc-$name)"
        else
            echo "    ❌ $name container failed — check $LOG_DIR/$name.log"
        fi
        return
    fi

    if [ "$use_venv" = "true" ]; then
        setsid bash -c "cd '$dir' && source '$VENV' && exec $cmd" >> "$LOG_DIR/$name.log" 2>&1 &
    else
        setsid bash -c "cd '$dir' && exec $cmd" >> "$LOG_DIR/$name.log" 2>&1 &
    fi
    local pid=$!
    echo $pid > "$PID_DIR/$name.pid"
    local wait=2
    [[ "$name" == "gunicorn" ]] && wait=5
    sleep $wait
    if is_running "$name"; then
        echo "    ✅ $name up (pid $pid) → $LOG_DIR/$name.log"
    else
        echo "    ❌ $name failed — check $LOG_DIR/$name.log"
        rm -f "$PID_DIR/$name.pid"
    fi
}

stop_service() {
    local name dir cmd use_venv port
    IFS='|' read -r name dir cmd use_venv port <<< "$1"
    local pidfile="$PID_DIR/$name.pid"

    if [ "$cmd" = "docker" ]; then
        echo "  🛑 Stopping $name (docker)..."
        docker compose -f "$COMPOSE_FILE" stop "$name" >> "$LOG_DIR/$name.log" 2>&1
        echo "    ✅ $name stopped"
        return
    fi

    pkill -f "$dir.*python3" 2>/dev/null || true
    if ! is_running "$name"; then
        free_port "$port"
        echo "  ⏭️  $name not running"
        rm -f "$pidfile"
        return
    fi
    local pid=$(cat "$pidfile")
    echo "  🛑 Stopping $name (pid $pid)..."
    local pgid=$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ')
    if [ -n "$pgid" ] && [ "$pgid" != "0" ]; then
        kill -- "-$pgid" 2>/dev/null
    else
        kill "$pid" 2>/dev/null
    fi
    local i=0
    while kill -0 "$pid" 2>/dev/null && [ $i -lt 10 ]; do
        sleep 1
        ((i++))
    done
    kill -9 "$pid" 2>/dev/null || true
    free_port "$port"
    rm -f "$pidfile"
    echo "    ✅ $name stopped"
}

get_service_def() {
    local target="$1"
    for svc in "${SERVICES[@]}"; do
        local name
        IFS='|' read -r name _ _ _ _ <<< "$svc"
        [ "$name" = "$target" ] && echo "$svc" && return 0
    done
    return 1
}

# ==============================================================================
# COMMANDS
# ==============================================================================
cmd_start() {
    local target="${1:-}"
    if [ -n "$target" ]; then
        local svc
        svc=$(get_service_def "$target") || { echo "❌ Unknown service: $target"; exit 1; }
        start_service "$svc"
    else
        echo "🎸 Starting School of Chat..."
        for svc in "${SERVICES[@]}"; do start_service "$svc"; done
        echo ""
        echo "✅ Stack started. Run './claude_stack.sh status' to verify."
    fi
}

cmd_stop() {
    local target="${1:-}"
    if [ -n "$target" ]; then
        local svc
        svc=$(get_service_def "$target") || { echo "❌ Unknown service: $target"; exit 1; }
        stop_service "$svc"
    else
        echo "🛑 Stopping School of Chat..."
        for (( i=${#SERVICES[@]}-1; i>=0; i-- )); do stop_service "${SERVICES[$i]}"; done
        echo ""
        echo "✅ Stack stopped."
    fi
}

cmd_restart() {
    local target="${1:-}"
    if [ -n "$target" ]; then
        local svc
        svc=$(get_service_def "$target") || { echo "❌ Unknown service: $target"; exit 1; }
        stop_service "$svc"
        sleep 1
        start_service "$svc"
    else
        cmd_stop
        sleep 2
        cmd_start
    fi
}

cmd_status() {
    echo "📊 School of Chat Status:"
    echo "──────────────────────────────────────"
    for svc in "${SERVICES[@]}"; do
        local name port
        IFS='|' read -r name _ _ _ port <<< "$svc"
        local pidfile="$PID_DIR/$name.pid"
        if is_running "$name"; then
            local detail
            if [ "$name" = "frontend" ]; then
                detail="docker soc-frontend, port $port"
            else
                local pid=$(cat "$pidfile")
                detail="pid $pid"
                [ -n "$port" ] && lsof -i:"$port" >/dev/null 2>&1 && detail="$detail, port $port"
            fi
            echo "  🟢 $name ($detail)"
        elif [ -f "$pidfile" ]; then
            echo "  🔴 $name (stale pidfile — crashed?)"
        else
            echo "  ⚫ $name (not started)"
        fi
    done
    echo "──────────────────────────────────────"
}

cmd_logs() {
    echo "📋 Tailing all logs (Ctrl+C to stop)..."
    tail -f "$LOG_DIR"/*.log
}

cmd_build() {
    echo "🏗️  Building frontend (Docker)..."
    if ! is_running "gunicorn"; then
        echo "  ⚠️  Gunicorn not running — starting it first..."
        start_service "gunicorn|$BACKEND_DIR|./gunicorn_soc.sh|true|5007"
        sleep 5
    fi
    docker compose -f "$COMPOSE_FILE" stop frontend 2>/dev/null
    local build_args=""
    [[ "${2:-}" == "--clean" ]] && build_args="--no-cache"
    docker compose -f "$COMPOSE_FILE" build $build_args frontend 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Build complete."
        docker compose -f "$COMPOSE_FILE" up -d --no-deps frontend 2>&1
        sleep 6
        is_running "frontend" && echo "  ✅ Frontend live" || echo "  ❌ Frontend failed"
    else
        echo "❌ Build failed."
        exit 1
    fi
}

cmd_checkup() {
    echo "🩺 School of Chat Health..."
    echo "──────────────────────────────────────"
    echo -n "📡 API /health:       "
    curl -o /dev/null -s -w '%{time_total}s\n' http://127.0.0.1:5007/api/health || echo "FAILED"
    echo -n "🌐 Frontend:          "
    curl -o /dev/null -s -w '%{time_total}s\n' http://127.0.0.1:3004 || echo "FAILED"
    echo "──────────────────────────────────────"
}

cmd_setup_venv() {
    echo "🐍 Setting up Python venv..."
    cd "$BACKEND_DIR"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    echo "✅ Venv ready."
}

# ==============================================================================
# DISPATCH
# ==============================================================================
VALID_SERVICES="gunicorn|frontend"

case "${1:-}" in
    start)   cmd_start "${2:-}" ;;
    stop)    cmd_stop "${2:-}" ;;
    restart) cmd_restart "${2:-}" ;;
    status)  cmd_status ;;
    logs)    cmd_logs ;;
    build)   cmd_build "${@}" ;;
    checkup) cmd_checkup ;;
    setup)   cmd_setup_venv ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|build [--clean]|checkup|setup}"
        echo ""
        echo "Service control:"
        echo "  $0 start|stop|restart [$VALID_SERVICES]"
        echo ""
        echo "First-time setup:"
        echo "  $0 setup      # create Python venv + install requirements"
        echo "  $0 build      # build frontend Docker image"
        echo "  $0 start      # start gunicorn + frontend"
        exit 1
        ;;
esac
