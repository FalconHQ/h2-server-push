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

const registerParser = hsp('public');

app.get('/', registerParser,  (req, res) => {
    res.sp('index.html', 'public')
});
```

## License 

MIT