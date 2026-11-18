#!/bin/sh
# Copy Emberwild's files to the two local static hosts in mirrors.json.
# This does not deploy, upload, or start a remote service.
cd "$(dirname "$0")/.." || exit 1
exec node tools/publish-mirrors.mjs
