#!/usr/bin/env bash
# (Re)start the network preview server on 0.0.0.0:8090, serving the latest
# production build. Run after each `npm run build` so the LAN URL stays current.
# Detached via nohup so it outlives the shell.
cd /home/reallybasic/Projects/Notebook++ || exit 1

pid=$(ss -ltnp 2>/dev/null | grep ':8090 ' | grep -oP 'pid=\K[0-9]+' | head -1)
[ -n "$pid" ] && kill "$pid" 2>/dev/null
# wait briefly for the port to release (no sleep)
for _ in 1 2 3 4 5 6 7 8; do ss -ltn 2>/dev/null | grep -q ':8090 ' || break; done

HOST=0.0.0.0 PORT=8090 nohup node --env-file=.env .output/server/index.mjs \
  > /tmp/notebookpp-preview.log 2>&1 &
disown
echo "preview server (re)started on http://0.0.0.0:8090 (pid $!)"
