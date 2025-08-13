#\!/bin/bash

# Safe cleanup script for extractions directory
# This script removes duplicate extractions while preserving the most recent one for each execution

EXTRACTIONS_DIR="/Users/ed/virtuoso-api/extractions"
BACKUP_DIR="/Users/ed/virtuoso-api/extractions_backup_$(date +%Y%m%d_%H%M%S)"

echo "Starting safe cleanup of extractions directory..."
echo "Original size: $(du -sh $EXTRACTIONS_DIR | cut -f1)"

# Create backup directory
mkdir -p "$BACKUP_DIR"
echo "Created backup directory: $BACKUP_DIR"

# Function to get the most recent directory for an execution
get_most_recent_extraction() {
    local execution_id="$1"
    local base_path="$2"
    
    # Find all directories for this execution and get the most recent one
    find "$base_path" -name "*execution_${execution_id}" -type d | sort | tail -1
}

# Process ipermit_testing_4889 directory (main cleanup target)
if [ -d "$EXTRACTIONS_DIR/ipermit_testing_4889" ]; then
    echo "Processing ipermit_testing_4889 directory..."
    
    # Get unique execution IDs
    EXECUTION_IDS=$(find "$EXTRACTIONS_DIR/ipermit_testing_4889" -name "*execution_*" -type d | grep -o 'execution_[0-9]*' | cut -d'_' -f2 | sort -u)
    
    for exec_id in $EXECUTION_IDS; do
        echo "Processing execution ID: $exec_id"
        
        # Find all directories for this execution
        EXEC_DIRS=$(find "$EXTRACTIONS_DIR/ipermit_testing_4889" -name "*execution_${exec_id}" -type d | sort)
        EXEC_COUNT=$(echo "$EXEC_DIRS" | wc -l)
        
        if [ $EXEC_COUNT -gt 1 ]; then
            echo "  Found $EXEC_COUNT duplicates for execution $exec_id"
            
            # Get the most recent (last in sorted order)
            MOST_RECENT=$(echo "$EXEC_DIRS" | tail -1)
            echo "  Keeping: $MOST_RECENT"
            
            # Remove all except the most recent
            for dir in $EXEC_DIRS; do
                if [ "$dir" \!= "$MOST_RECENT" ]; then
                    echo "  Removing duplicate: $dir"
                    # Move to backup instead of deleting
                    mkdir -p "$BACKUP_DIR/$(dirname ${dir#$EXTRACTIONS_DIR/})"
                    mv "$dir" "$BACKUP_DIR/${dir#$EXTRACTIONS_DIR/}"
                fi
            done
        else
            echo "  Only 1 extraction found for execution $exec_id - keeping it"
        fi
    done
fi

# Preserve ipermit-testing and project-4889 directories (different formats, potential reference value)
echo "Preserving ipermit-testing/ and project-4889/ directories (reference implementations)"

echo "Cleanup completed\!"
echo "New size: $(du -sh $EXTRACTIONS_DIR | cut -f1)"
echo "Backed up files are in: $BACKUP_DIR"
echo "Space saved: $(du -sh $BACKUP_DIR | cut -f1)"

# Show summary
echo -e "\nSummary:"
echo "- Kept most recent extraction for each unique execution ID"
echo "- Preserved ipermit-testing/ directory (reference implementation)"
echo "- Preserved project-4889/ directory (reference implementation)" 
echo "- Moved duplicates to backup directory instead of deleting"
echo "- Run 'rm -rf $BACKUP_DIR' if you're satisfied with the cleanup"
