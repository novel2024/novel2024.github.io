#!/usr/bin/env python3
"""
Script to apply UTF-8 encoding to all index.html files in subdirectories.
This script will:
1. Find all index.html files in subdirectories
2. Read each file and detect its current encoding
3. Re-save it with UTF-8 encoding
4. Add UTF-8 meta charset tag if missing
"""

import os
import re
import chardet
from pathlib import Path

def detect_encoding(file_path):
    """Detect the encoding of a file."""
    try:
        with open(file_path, 'rb') as file:
            raw_data = file.read()
            result = chardet.detect(raw_data)
            return result['encoding']
    except Exception as e:
        print(f"Error detecting encoding for {file_path}: {e}")
        return 'utf-8'  # Default fallback

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
        return content
    
    # Look for <head> tag and insert meta charset right after it
    head_pattern = r'(<head[^>]*>)'
    replacement = r'\1\n    <meta charset="UTF-8">'
    
    if re.search(head_pattern, content, re.IGNORECASE):
        content = re.sub(head_pattern, replacement, content, flags=re.IGNORECASE)
        print("    Added UTF-8 meta charset tag")
    else:
        print("    Warning: Could not find <head> tag to insert charset meta tag")
    
    return content

def process_html_file(file_path):
    """Process a single HTML file to ensure UTF-8 encoding."""
    print(f"Processing: {file_path}")
    
    try:
        # Detect current encoding
        current_encoding = detect_encoding(file_path)
        print(f"    Detected encoding: {current_encoding}")
        
        # Read the file with detected encoding
        try:
            with open(file_path, 'r', encoding=current_encoding) as file:
                content = file.read()
        except UnicodeDecodeError:
            # Fallback to utf-8 if detection fails
            print("    Encoding detection failed, trying UTF-8...")
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
                content = file.read()
        
        # Add UTF-8 meta tag if missing
        updated_content = add_utf8_meta_tag(content)
        
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
    
    print("UTF-8 Encoding Converter for index.html files")
    print("=" * 50)
    print(f"Working directory: {current_dir}")
    print()
    
    # Check if chardet is available
    try:
        import chardet
    except ImportError:
        print("Warning: chardet module not found. Install it with: pip install chardet")
        print("Proceeding with UTF-8 as default encoding...")
        print()
    
    find_and_process_index_files(current_dir)
    
    print("Processing complete!")

if __name__ == "__main__":
    main()
