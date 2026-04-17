#!/usr/bin/env bash

MSG_PATH="$1"

if [ -z "$MSG_PATH" ] || [ ! -f "$MSG_PATH" ]; then
  echo "Fichier de commit non trouvé: $MSG_PATH" >&2
  exit 1
fi

message=$(tr -d '\n' < "$MSG_PATH")

commit_regex='^(feat|fix|chore|ci|docs|style|refactor|test|build|perf|revert)(\([a-z0-9-]+\))?!?: .+$'

if [[ "$message" =~ $commit_regex ]]; then
  exit 0
else
  cat << 'EOF' >&2
❌ Mauvais format de commit (conventional commits).

Exemples valides :
  feat: add queue command
  fix(player): handle undefined stream
  chore: update dependencies
EOF
  exit 1
fi
