#!/bin/bash

# Check if yarn and jq are available
if ! command -v yarn &> /dev/null; then
    echo "yarn could not be found, please install it."
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "jq could not be found, please install it."
    exit 1
fi

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <pali-wallet-path>"
  exit 1
fi

PALI_PATH=$1

# Variables
PACKAGES_DIR="$PWD/packages"
CORE_PACKAGE="sysweb3-core"
KEYRING_PACKAGE="sysweb3-keyring"
CORE_PACKAGE_PATH="$PACKAGES_DIR/$CORE_PACKAGE"
KEYRING_PACKAGE_JSON="$PACKAGES_DIR/$KEYRING_PACKAGE/package.json"
PALI_PACKAGE_JSON="$PALI_PATH/package.json"

# Ensure the Core package directory exists
if [ ! -d "$CORE_PACKAGE_PATH" ]; then
  echo "Core package path $CORE_PACKAGE_PATH does not exist."
  exit 1
fi

# Build the Core package
echo "Building $CORE_PACKAGE at $CORE_PACKAGE_PATH..."
(cd "$CORE_PACKAGE_PATH" && yarn && yarn localTest) || exit 1

# Generate the local path for the Core package
CORE_DIST_PATH="$CORE_PACKAGE_PATH/dist"

# Check if the Keyring package.json exists
if [ ! -f "$KEYRING_PACKAGE_JSON" ]; then
  echo "Keyring package.json not found at $KEYRING_PACKAGE_JSON"
  exit 1
fi

# Update the Keyring package.json with the Core dist path
TEMP_FILE=$(mktemp)
jq --arg path "$CORE_DIST_PATH" \
  '.dependencies["@pollum-io/sysweb3-core"] = $path' "$KEYRING_PACKAGE_JSON" > "$TEMP_FILE" && mv "$TEMP_FILE" "$KEYRING_PACKAGE_JSON"

if [ $? -eq 0 ]; then
  echo "sysweb3-core path updated in sysweb3-keyring package.json to $CORE_DIST_PATH"
else
  echo "Failed to update sysweb3-core in sysweb3-keyring package.json."
  [ -f "$TEMP_FILE" ] && rm "$TEMP_FILE"
  exit 1
fi

# Update the Pali package.json with the Keyring dist path
PACKAGE_PATH="$PACKAGES_DIR/$KEYRING_PACKAGE"
  echo "Building Core at Keyring..."
  
  # Ensure the directory exists
  if [ ! -d "$PACKAGE_PATH" ]; then
    echo "Package path $PACKAGE_PATH does not exist."
    continue
  fi

  # Execute yarn localTest
  (cd "$PACKAGE_PATH" && yarn && yarn localTest) || continue

  # Generate the local path for the package
  LOCAL_PATH="$PACKAGE_PATH/dist"

  # Update the package.json of the pali-wallet project
  TEMP_FILE=$(mktemp)
  jq --arg pkg "@pollum-io/$KEYRING_PACKAGE" --arg path "$LOCAL_PATH" \
    '.dependencies[$pkg] = $path' "$PALI_PACKAGE_JSON" > "$TEMP_FILE" && mv "$TEMP_FILE" "$PALI_PACKAGE_JSON"

  if [ $? -eq 0 ]; then
    echo "$PACKAGE path updated in package.json to $LOCAL_PATH"
  else
    echo "Failed to update $PACKAGE in package.json."
    [ -f "$TEMP_FILE" ] && rm "$TEMP_FILE"
  fi


# Path to .envrc
ENVRC_PATH="$PALI_PATH/.envrc"
MANIFEST_VAR="MANIFEST_TYPE=MV3"

# Set environment variable MANIFEST_TYPE in the Pali .env file
if grep -q "$MANIFEST_VAR" "$ENVRC_PATH"; then
  echo "A variável $MANIFEST_VAR já está definida no $ENVRC_PATH."
else
  # Execute direnv to allow the environment
  echo "$MANIFEST_VAR" >> "$ENVRC_PATH"
  echo "Variável $MANIFEST_VAR adicionada ao $ENVRC_PATH."
  (cd "$PALI_PATH" && direnv allow)
fi

echo "All operations completed successfully."
