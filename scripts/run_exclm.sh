basedir=$(dirname "$0")
filename=$(basename "$1" ".exclm")
bundledir="$basedir/../bundle"

node "$bundledir/exclaim.js" -f $1 -o "$bundledir/$filename.mjs"
node "$bundledir/$filename.mjs"
