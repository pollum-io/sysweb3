
# Syscoin Web3 JavaScript API

This is the Syscoin Web3 [JavaScript API][docs] for Syscoin Network.

Please read the [documentation][docs] for more detailed instructions. The following includes basic install and configuration.

## Installation

### Node

```bash
npm install syscoin-web3.js
```

### Yarn

```bash
yarn add syscoin-web3.js
```

## Usage

```js
// In Node.js
const fetch = require('node-fetch');
const { syscoinWeb3 } = require('syscoin-web3.js');
```

Now you can use it to:

```ts
...
```

### Usage with TypeScript

We support types within the repo itself. Please open an issue here if you find any wrong types.

You can use `syscoin-web3.js` as follows:


```typescript
import { syscoinWeb3 } from 'syscoin-web3.js';
```

Configure Network
```ts
import fetch from 'node-fetch';
```

If you are using the types in a `commonjs` module, like in a Node app, you have to enable `esModuleInterop` and `allowSyntheticDefaultImports` in your `tsconfig` for typesystem compatibility:

```js
"compilerOptions": {
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    ....
```

## Documentation

Documentation can be found at.

## Building

### Requirements

-   [Node.js](https://nodejs.org)
-   [npm](https://www.npmjs.com/)

```bash
sudo apt-get update
sudo apt-get install nodejs
sudo apt-get install npm
```

### Building (syscoin-web3.js)

Build the syscoin-web3.js package:

```bash
npm run build
```

### Testing (mocha)

```bash
npm test
```

### Community

-   [Discord][discord-url]
-   [Telegram][telegram-url]

---
### License
[![License: GPL v3](https://img.shields.io/badge/License-MIT-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
This project is licensed under the terms of the **MIT** license.
