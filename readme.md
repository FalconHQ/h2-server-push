# h2-server-push

An express middleware that implements server push in HTTP2.

## Installation

```bash
npm install h2-server-push --save
```
__Note__: Requires `node-spdy` for HTTP2

## Usage

```javascript
const hsp = require('h2-server-push');

app.get('/', hsp,  (req, res) => {
    res.sp('index.html')
});
```

## License 

MIT