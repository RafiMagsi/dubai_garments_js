#!/usr/bin/env zsh
# Safety guard wrappers for destructive Docker/DB commands.
# Usage:
#   source /absolute/path/to/scripts/shell-guards.zsh
# Optional one-time bypass:
#   ALLOW_DB_DESTRUCTIVE=1 <command>

_dg_guard_blocked() {
  echo "BLOCKED by dubai_garments safety guard: $1" >&2
  echo "Set ALLOW_DB_DESTRUCTIVE=1 only if you intentionally need destructive actions." >&2
  return 1
}

_dg_guard_docker_cmd() {
  local full_cmd="$*"
  local normalized="${full_cmd:l}"
  local -a args
  args=("$@")
  local arg
  local has_compose=0
  local has_down=0
  local has_rm=0
  local has_volume_flag=0
  local has_volume_cmd=0
  local has_system_prune=0

  [[ "${ALLOW_DB_DESTRUCTIVE:-0}" == "1" ]] && return 0

  for arg in "${args[@]}"; do
    [[ "$arg" == "compose" ]] && has_compose=1
    [[ "$arg" == "down" ]] && has_down=1
    [[ "$arg" == "rm" ]] && has_rm=1
    [[ "$arg" == "-v" || "$arg" == "--volumes" ]] && has_volume_flag=1
  done

  if (( has_compose == 1 && has_down == 1 && has_volume_flag == 1 )); then
    _dg_guard_blocked "docker compose down -v/--volumes"
    return 1
  fi

  if (( has_compose == 1 && has_rm == 1 && has_volume_flag == 1 )); then
    _dg_guard_blocked "docker compose rm -v/--volumes"
    return 1
  fi

  [[ "$full_cmd" == volume\ rm* || "$full_cmd" == *" volume rm "* ]] && has_volume_cmd=1
  [[ "$full_cmd" == volume\ prune* || "$full_cmd" == *" volume prune"* ]] && has_volume_cmd=1
  (( has_volume_cmd == 1 )) && _dg_guard_blocked "docker volume rm/prune" && return 1

  [[ "$full_cmd" == system\ prune* || "$full_cmd" == *" system prune "* ]] && has_system_prune=1
  if (( has_system_prune == 1 && has_volume_flag == 1 )); then
    _dg_guard_blocked "docker system prune --volumes"
    return 1
  fi

  # Block destructive SQL executed through docker compose/exec psql -c "..."
  if [[ "$normalized" == *" psql "* ]] && {
    [[ "$normalized" == *" drop schema "* ]] ||
    [[ "$normalized" == *" drop database "* ]] ||
    [[ "$normalized" == *" drop table "* ]] ||
    [[ "$normalized" == *" truncate table "* ]]
  }; then
    _dg_guard_blocked "destructive SQL via docker exec psql"
    return 1
  fi

  return 0
}

_dg_guard_psql_args() {
  [[ "${ALLOW_DB_DESTRUCTIVE:-0}" == "1" ]] && return 0
  local full_cmd="$*"
  local normalized="${full_cmd:l}"

  if [[ "$normalized" == *" drop schema "* ]] || [[ "$normalized" == *" drop database "* ]] || [[ "$normalized" == *" drop table "* ]] || [[ "$normalized" == *" truncate table "* ]]; then
    _dg_guard_blocked "destructive psql SQL detected"
    return 1
  fi
  return 0
}

docker() {
  _dg_guard_docker_cmd "$@" || return 1
  command docker "$@"
}

docker-compose() {
  _dg_guard_docker_cmd "$@" || return 1
  command docker-compose "$@"
}

psql() {
  _dg_guard_psql_args "$@" || return 1
  command psql "$@"
}

npm() {
  [[ "${ALLOW_DB_DESTRUCTIVE:-0}" != "1" ]] && {
    if [[ "$*" == "run demo:reset" ]] || [[ "$*" == "run db:rollback" ]]; then
      _dg_guard_blocked "npm $*"
      return 1
    fi
  }
  command npm "$@"
}

echo "Dubai garments safety guards loaded. Destructive Docker/DB commands are blocked."
