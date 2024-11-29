# Project Build Scripts

## Prerequisites

Before running the script, make sure the following tools are installed on your system:

- yarn: Used to manage dependencies and execute build scripts.
- jq: Used to programmatically manipulate JSON files.

You can install these requirements using the following commands:

```bash
sudo apt-get install jq
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
nvm install node
npm install -g yarn
```

## Build local development

This script automates the process of building specified local packages and updating their paths in the `package.json` of the pali-wallet project.

### Usage

To run the script, you need to provide the path to the `package.json` file of the pali-wallet project. You can optionally specify which packages you want to build and update. If no packages are specified, all packages will be processed.

#### Syntax

```bash
./build-local-test.sh <path_to_destination_package_json> [package_names...]
```

#### Examples

##### To update all packages:
```bash
./build-local-test.sh /path/to/pali-wallet/package.json
```

##### To update specific packages (e.g., sysweb3-keyring and sysweb3-network):
```bash
./build-local-test.sh /path/to/pali-wallet/package.json sysweb3-keyring sysweb3-network
```

## Build manifest v3 local development

This script automates the process of building the local development using manifest v3

### Usage

To run the script, you need to provide the path to the `pali-wallet` project.

#### Syntax

```bash
./build-local-mv3.sh <path_to_pali>
```