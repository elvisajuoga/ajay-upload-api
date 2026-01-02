#!/bin/bash
# Migration script to move uploads from server/uploads to public/uploads
# Run this on your VPS after updating server/index.js

set -e

SERVER_UPLOADS="/home/ajayexperience/theajayexperience.com/server/uploads"
PUBLIC_UPLOADS="/home/ajayexperience/theajayexperience.com/public/uploads"

echo "🔄 Migrating uploads directory..."

# Create public/uploads if it doesn't exist
if [ ! -d "$PUBLIC_UPLOADS" ]; then
    echo "Creating $PUBLIC_UPLOADS..."
    mkdir -p "$PUBLIC_UPLOADS"
fi

# Move files if server/uploads exists
if [ -d "$SERVER_UPLOADS" ] && [ "$(ls -A $SERVER_UPLOADS 2>/dev/null)" ]; then
    echo "Moving files from $SERVER_UPLOADS to $PUBLIC_UPLOADS..."
    mv "$SERVER_UPLOADS"/* "$PUBLIC_UPLOADS/" 2>/dev/null || true
    
    # Remove empty directory
    if [ -z "$(ls -A $SERVER_UPLOADS)" ]; then
        rmdir "$SERVER_UPLOADS"
        echo "✅ Removed empty server/uploads directory"
    fi
else
    echo "ℹ️  No files to migrate (server/uploads doesn't exist or is empty)"
fi

# Set correct permissions
echo "Setting permissions..."
chmod -R 755 "$PUBLIC_UPLOADS"
chown -R ajayexperience:ajayexperience "$PUBLIC_UPLOADS"

echo "✅ Migration complete!"
echo "Uploads are now at: $PUBLIC_UPLOADS"

