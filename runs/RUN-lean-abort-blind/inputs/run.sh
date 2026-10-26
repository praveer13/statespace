#!/bin/sh
# usage: sh run.sh <case>: elaborates Defs.lean followed by <case>.lean, then prints lean's exit code
cat Defs.lean "$1.lean" > "/tmp/$1.lean"
lean "/tmp/$1.lean" 2>&1
echo "lean exit=$?"
