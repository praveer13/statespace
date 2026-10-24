#!/usr/bin/env bash
# W0-S01: make a throwaway local CA and one leaf certificate for the stand-in hostnames, and
# the NSS trust databases that Chromium ($HOME/.pki/nssdb) and Firefox (the profile's cert9.db)
# read. Runs inside a separate prep container (it installs libnss3-tools there), so the browser
# container's own packages stay as the image ships them.
#
# Usage (inside the container): certs.sh <out-dir>
# Stand-in hostnames, all under the reserved .test TLD (RFC 6761); none is the course domain:
#   course-domain.test                main origin          (stands in for <course-domain>)
#   instruments.course-domain.test    instrument origin    (same site, cross origin: the plan)
#   instruments.other-host.test       instrument origin    (cross site: another static host)
#   attacker.test                     a hostile embedder   (negative handshake test)
set -euo pipefail
OUT="${1:?usage: certs.sh <out-dir>}"
mkdir -p "$OUT"
cd "$OUT"

openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 30 \
  -keyout ca.key -out ca.pem -subj "/CN=statespace W0-S01 local test CA" \
  -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign" 2>/dev/null

openssl req -newkey rsa:2048 -nodes -sha256 -keyout leaf.key -out leaf.csr -subj "/CN=course-domain.test" 2>/dev/null
cat > leaf.ext <<'EOF'
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid,issuer
subjectAltName=DNS:course-domain.test,DNS:*.course-domain.test,DNS:*.other-host.test,DNS:attacker.test
EOF
openssl x509 -req -sha256 -days 30 -in leaf.csr -CA ca.pem -CAkey ca.key -CAcreateserial \
  -out leaf.pem -extfile leaf.ext 2>/dev/null

export DEBIAN_FRONTEND=noninteractive
if ! command -v certutil >/dev/null; then
  apt-get update -qq >/dev/null && apt-get install -y -qq libnss3-tools >/dev/null
fi

for db in nssdb ff-profile-template; do
  rm -rf "$db" && mkdir -p "$db"
  certutil -N -d "sql:$OUT/$db" --empty-password
  certutil -A -d "sql:$OUT/$db" -n "statespace W0-S01 local test CA" -t "C,," -i ca.pem
done

openssl x509 -in ca.pem -noout -fingerprint -sha256 | sed 's/^/ca /' > fingerprints.txt
openssl x509 -in leaf.pem -noout -fingerprint -sha256 | sed 's/^/leaf /' >> fingerprints.txt
certutil --version 2>&1 | head -1 > certutil-version.txt || true
dpkg-query -W -f='${Package} ${Version}\n' libnss3-tools openssl >> certutil-version.txt
rm -f leaf.csr ca.srl
chmod -R a+rX "$OUT"
