#!/bin/sh
set -eu

# Host dockerd owns the socket. Join its group so appuser can start
# ephemeral runner containers without running the API as root.
if [ -S /var/run/docker.sock ]; then
  sock_gid="$(stat -c '%g' /var/run/docker.sock)"
  group_name="$(getent group "$sock_gid" | cut -d: -f1 || true)"
  if [ -z "$group_name" ]; then
    group_name=dockerhost
    groupadd -g "$sock_gid" "$group_name"
  fi
  usermod -aG "$group_name" appuser
fi

# Job files must be on a host bind-mount so `docker run -v` can see them.
if [ -n "${CODE_RUNNER_JOB_DIR:-}" ]; then
  mkdir -p "$CODE_RUNNER_JOB_DIR"
  chown appuser:appuser "$CODE_RUNNER_JOB_DIR" || true
  chmod 1777 "$CODE_RUNNER_JOB_DIR" || true
fi

exec gosu appuser "$@"
