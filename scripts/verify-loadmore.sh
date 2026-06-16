#!/usr/bin/env bash
# A/B timing test for hotel "load more".
# Proves: page 2 WITH searchId (cached pagination) vs WITHOUT (full re-search).
# Usage: TOKEN="<agent bearer token>" bash scripts/verify-loadmore.sh [city]
set -euo pipefail

BASE="https://api-server-i1.mytravellerschoice.com/api/v1"
AVAIL="$BASE/b2b/hotels/availabilities"
CITY_SEARCH="${1:-dubai}"
AUTH="authorization: Bearer ${TOKEN:?Set TOKEN env var to an agent bearer token}"

# Dates: tomorrow .. +3 days (YYYY-MM-DD)
FROM=$(date -v+1d +%F 2>/dev/null || date -d "+1 day" +%F)
TO=$(date -v+3d +%F 2>/dev/null || date -d "+3 day" +%F)

echo "→ Fetching a CITY suggestion for '$CITY_SEARCH'…"
SUG=$(curl -s -H "$AUTH" "$AVAIL/search/suggestions?search=$CITY_SEARCH")
CITY_ID=$(printf '%s' "$SUG" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["cities"][0]["_id"])')
echo "   city id: $CITY_ID"

BODY=$(python3 - "$CITY_ID" "$FROM" "$TO" <<'PY'
import json,sys
cid,frm,to=sys.argv[1],sys.argv[2],sys.argv[3]
print(json.dumps({
  "searchQuery":{"id":cid,"suggestionType":"CITY"},
  "fromDate":frm,"toDate":to,
  "rooms":[{"noOfAdults":2,"noOfChildren":0,"childrenAges":[]}],
  "nationality":"","priceType":"all"
}))
PY
)

FILT="accommodationTypes=%5B%5D&priceFrom=&priceTo=&starCategories=%5B%5D&boardTypes=%5B%5D&chains=%5B%5D&amenities=%5B%5D&sortBy="

post() { # skip, searchId  → echoes "time_total searchId"
  local skip="$1" sid="$2"
  curl -s -o /tmp/lm_resp.json -w '%{time_total}' \
    -H "$AUTH" -H 'content-type: application/json' \
    "$AVAIL/search?limit=10&skip=$skip&searchId=$sid&$FILT" -d "$BODY"
}

echo "→ Page 1 (skip=0, no searchId — full search, expected slow)…"
T1=$(post 0 "")
SID=$(python3 -c 'import json;print(json.load(open("/tmp/lm_resp.json")).get("searchId",""))')
echo "   ${T1}s   searchId=$SID"

echo "→ Page 2 WITH searchId (new load-more — cached pagination)…"
T2=$(post 10 "$SID")
echo "   ${T2}s"

echo "→ Page 2 WITHOUT searchId (old load-more — full re-search)…"
T3=$(post 10 "")
echo "   ${T3}s"

python3 - "$T2" "$T3" <<'PY'
import sys
new,old=float(sys.argv[1]),float(sys.argv[2])
print(f"\nRESULT: load-more cached={new:.2f}s vs full re-search={old:.2f}s "
      f"→ {old/new:.1f}x faster" if new>0 else "n/a")
PY
