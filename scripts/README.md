# Project Build Script

This script automates the process of building specified local packages and updating their paths in the `package.json` of the pali-wallet project.

## Usage

To run the script, you need to provide the path to the `package.json` file of the pali-wallet project. You can optionally specify which packages you want to build and update. If no packages are specified, all packages will be processed.

### Syntax

```bash
./build-local-test.sh <path_to_destination_package_json> [package_names...]
```

### Examples

#### To update all packages:
```bash
./build-local-test.sh /path/to/pali-wallet/package.json
```

#### To update specific packages (e.g., sysweb3-keyring and sysweb3-network):
```bash
./build-local-test.sh /path/to/pali-wallet/package.json sysweb3-keyring sysweb3-network
```

#### Ensure that you have yarn and jq installed on your system to use this script.