#!/usr/bin/env python3
"""
Simple UTF-8 encoding script for index.html files (no external dependencies).
This script will:
1. Find all index.html files in subdirectories
2. Read each file assuming UTF-8 encoding
3. Add UTF-8 meta charset tag if missing
4. Re-save with UTF-8 encoding
"""

import os
import re
from pathlib import Path

def has_utf8_meta_tag(content):
    """Check if the HTML content has a UTF-8 meta charset tag."""
    # Look for various forms of charset meta tags
    charset_patterns = [
        r'<meta\s+charset\s*=\s*["\']?utf-8["\']?',
        r'<meta\s+http-equiv\s*=\s*["\']Content-Type["\'][^>]*charset\s*=\s*utf-8',
    ]
    
    for pattern in charset_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            return True
    return False

def add_utf8_meta_tag(content):
    """Add UTF-8 meta charset tag if missing."""
    if has_utf8_meta_tag(content):
        return content, False
    
    # Look for <head> tag and insert meta charset right after it
    head_pattern = r'(<head[^>]*>)'
    replacement = r'\1\n    <meta charset="UTF-8">'
    
    if re.search(head_pattern, content, re.IGNORECASE):
        content = re.sub(head_pattern, replacement, content, flags=re.IGNORECASE)
        return content, True
    else:
        print("    Warning: Could not find <head> tag to insert charset meta tag")
        return content, False

def process_html_file(file_path):
    """Process a single HTML file to ensure UTF-8 encoding."""
    print(f"Processing: {file_path}")
    
    try:
        # Try to read with UTF-8 encoding
        encodings_to_try = ['utf-8', 'utf-8-sig', 'latin1', 'cp1252']
        content = None
        
        for encoding in encodings_to_try:
            try:
                with open(file_path, 'r', encoding=encoding) as file:
                    content = file.read()
                print(f"    Successfully read with {encoding} encoding")
                break
            except UnicodeDecodeError:
                continue
        
        if content is None:
            print(f"    Error: Could not read file with any encoding")
            return
        
        # Add UTF-8 meta tag if missing
        updated_content, meta_added = add_utf8_meta_tag(content)
        if meta_added:
            print("    Added UTF-8 meta charset tag")
        else:
            print("    UTF-8 meta charset tag already present")
        
        # Write back with UTF-8 encoding
        with open(file_path, 'w', encoding='utf-8', newline='') as file:
            file.write(updated_content)
        
        print(f"    Successfully saved with UTF-8 encoding")
        
    except Exception as e:
        print(f"    Error processing {file_path}: {e}")

def find_and_process_index_files(root_dir):
    """Find all index.html files in subdirectories and process them."""
    root_path = Path(root_dir)
    index_files = []
    
    # Find all index.html files in subdirectories (not root)
    for item in root_path.iterdir():
        if item.is_dir():
            index_file = item / 'index.html'
            if index_file.exists():
                index_files.append(index_file)
    
    print(f"Found {len(index_files)} index.html files in subdirectories:")
    for file_path in index_files:
        print(f"  {file_path}")
    
    print("\nProcessing files...")
    for file_path in index_files:
        process_html_file(file_path)
        print()  # Empty line for readability

def main():
    """Main function."""
    # Get the current directory (where the script is located)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    print("Simple UTF-8 Encoding Converter for index.html files")
    print("=" * 55)
    print(f"Working directory: {current_dir}")
    print()
    
    find_and_process_index_files(current_dir)
    
    print("Processing complete!")

if __name__ == "__main__":
    main()
