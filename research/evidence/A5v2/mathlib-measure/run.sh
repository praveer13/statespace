set -u
cd /w
t0=$(date +%s)
lake update > update.log 2>&1; echo "update rc=$? secs=$(( $(date +%s) - t0 ))"
t1=$(date +%s)
lake exe cache get > cache.log 2>&1; echo "cache rc=$? secs=$(( $(date +%s) - t1 ))"
du -sh .lake/packages 2>/dev/null
du -sh .lake/packages/* 2>/dev/null
du -sh .lake/packages/mathlib/.git 2>/dev/null
du -sh ~/.cache/mathlib 2>/dev/null
t2=$(date +%s)
lake build Mm > build.log 2>&1; echo "build rc=$? secs=$(( $(date +%s) - t2 ))"
tail -3 build.log
