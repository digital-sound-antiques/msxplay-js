# MSXplay.js

See [MSXplay.js Homepage](http://digital-sound-antiques.github.io/msxplay-js/) for demo and more details.

# How to build

node, webpack and Emscripten are required.

## checkout
```
git clone --recursive https://github.com/digital-sound-antiques/msxplay-js
cd msxplay-js
npm install
```

## make libkss.js
```
mkdir build
cd build
emcmake cmake ..
make
cd ..
```

## make msxplay-bundle.js
```
webpack
```
