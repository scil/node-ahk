# node-ahk

node-ahk is a library that allows **NodeJS** to communicate with **autohotkey**.

# scil version

origin version is https://www.npmjs.com/package/node-ahk

## what scil version change

1. add `FileEncoding, UTF-8-RAW`, otherwise node can not get correct multi-byte-language string from ahk

2. comment out `Node_OnMessage` because no definition for it

## Installation

Use the package manager [npm](https://www.npmjs.com/) to install node-ahk.

```
npm install node-ahk --save
```

## Setup - NodeJS

```js
const nodeahk = require('node-ahk');
const fs = require('fs');

const gui = new nodeahk()
    .import(fs.readFileSync(__dirname + '/index.ahk'))
    .run();
```

## Functions

### NodeJS

```js
gui.import("string");                        // Imports this string as autohotkey.
gui.write("event", "message");               // Send a buffer to autohotkey.
gui.run();                                   // Runs the autohotkey script.
gui.on("message", (event, message) => {})    // Event Listener.
```

### Autohotkey

```
Node_Write("event", "message")               ;; Send a buffer to nodejs.
Node_OnMessage(event, message) {}            ;; Event Listener.
```

##  Credits

#### Creator: [*Niiko*](https://www.youtube.com/bryxz/)