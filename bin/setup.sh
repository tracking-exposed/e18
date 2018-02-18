../../node_modules/.bin/stylus web-accessible/base.styl -o web-accessible/
../../node_modules/.bin/stylus web-accessible/carousel-styles.styl -o web-accessible/
npm i

cp -r node_modules/reveal.js/js web-accessible/reveal-js
echo "copy of node_modules/reveal.js/js to web-accessible/reveal-js"

cp -r node_modules/reveal.js/css web-accessible/reveal-css
echo "copy of node_modules/reveal.js/css web-accessible/reveal-css"

cp -r node_modules/reveal.js/css web-accessible/reveal-css
echo "copy of node_modules/reveal.js/css web-accessible/reveal-css"

mkdir -p web-accessible/reveal-js/lib
cp node_modules/reveal.js/lib/js/* web-accessible/reveal-js/lib
echo "copy of node_modules/reveal.js/lib/js/* to web-accessible/reveal-js/lib"

mkdir -p web-accessible/lib/font
cp -r node_modules/reveal.js/lib/font web-accessible/lib/font
echo "copy of node_modules/reveal.js/lib/font/* to web-accessible/lib/font"

mkdir -p web-accessible/reveal-js/plugin/highlight
cp node_modules/reveal.js/plugin/highlight/highlight.js web-accessible/reveal-js/plugin/highlight
echo "copy of node_modules/reveal.js/plugin/highlight/highlight.js to web-accessible/reveal-js/plugin/highlight"
