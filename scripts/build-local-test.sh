#!/bin/bash

# Check if the path to package.json was provided as an argument
if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <path_to_destination_package_json> [package_names...]"
  exit 1
fi

DESTINATION_PACKAGE_JSON=$1

# List of all available packages to build and update
ALL_PACKAGES=("sysweb3-keyring" "sysweb3-network" "sysweb3-utils")
# List of packages to be processed, can be all or a subset
PACKAGES_TO_PROCESS=()

if [ "$#" -eq 1 ]; then
  PACKAGES_TO_PROCESS=("${ALL_PACKAGES[@]}")
else
  shift  # remove the first argument (path to package.json)
  while (( "$#" )); do
    PACKAGES_TO_PROCESS+=($1)
    shift
  done
fi

# Verify if the destination package.json exists
if [ ! -f "$DESTINATION_PACKAGE_JSON" ]; then
  echo "Destination package.json not found at $DESTINATION_PACKAGE_JSON"
  exit 1
fi

# Ensure yarn and jq are available
if ! command -v yarn &> /dev/null; then
    echo "yarn could not be found, please install it."
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "jq could not be found, please install it."
    exit 1
fi

PACKAGES_DIR="$PWD/packages"

# Iterate over each specified package, build and update the path in package.json
for PACKAGE in "${PACKAGES_TO_PROCESS[@]}"
do
  PACKAGE_PATH="$PACKAGES_DIR/$PACKAGE"
  echo "Building $PACKAGE at $PACKAGE_PATH..."
  
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
  jq --arg pkg "@pollum-io/$PACKAGE" --arg path "$LOCAL_PATH" \
    '.dependencies[$pkg] = $path' "$DESTINATION_PACKAGE_JSON" > "$TEMP_FILE" && mv "$TEMP_FILE" "$DESTINATION_PACKAGE_JSON"

  if [ $? -eq 0 ]; then
    echo "$PACKAGE path updated in package.json to $LOCAL_PATH"
  else
    echo "Failed to update $PACKAGE in package.json."
    [ -f "$TEMP_FILE" ] && rm "$TEMP_FILE"
  fi
done

echo "All packages have been built and paths updated successfully."
