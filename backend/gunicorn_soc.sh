#!/bin/bash
source /home/www/claude_stack/backend/venv/bin/activate

exec gunicorn \
    --bind 127.0.0.1:5007 \
    --workers 4 \
    --threads 4 \
    --worker-class gthread \
    --timeout 120 \
    --preload \
    --access-logfile /home/www/claude_stack/logs/gunicorn_access.log \
    --error-logfile /home/www/claude_stack/logs/gunicorn_error.log \
    main:app
