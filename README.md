# MSXplay.js

See [MSXplay.js Homepage](http://digital-sound-antiques.github.io/msxplay-js/) for demo and more details.

# How to embed the MSXplay to your site

TL;DR. See the following brief example. 

```html
<html>
<head>
  <link href='https://fonts.googleapis.com/css?family=Roboto' rel='stylesheet' type='text/css'>
  <link rel="stylesheet" href="msxplay.css" type="text/css">
  <script src="msxplay-bundle.js"></script>
  <script>
    window.addEventListener("DOMContentLoaded",function(){
      MSXPlayUI.install(document.body);
    });
  </script>
</head>
<body>
  <div class="msxplay" data-title="Song Title" data-url="http://www.example.com/example.kss" data-duration="90"></div>
</body>
</html>
```

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
