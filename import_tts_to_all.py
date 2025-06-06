#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TTS Importer - Import tts-sender.js into all HTML files in subfolders
This script automatically adds the TTS JavaScript import to all HTML files
in subdirectories while preserving existing content and structure.
"""

import os
import re
import sys
from pathlib import Path

class TTSImporter:
    def __init__(self, root_dir=None):
        """Initialize the importer with root directory"""
        self.root_dir = Path(root_dir) if root_dir else Path(__file__).parent
        self.tts_script_tag = '    <!-- 引入TTS发送器 -->\n    <script src="../tts-sender.js"></script>'
        self.processed_files = []
        self.skipped_files = []
        self.errors = []
        
    def find_html_files(self):
        """Find all HTML files in subdirectories"""
        html_files = []
        
        # Get all subdirectories (excluding root)
        subdirs = [d for d in self.root_dir.iterdir() 
                  if d.is_dir() and not d.name.startswith('.')]
        
        for subdir in subdirs:
            # Find all HTML files in each subdirectory
            html_files.extend(subdir.glob('*.html'))
            
        return html_files
    
    def has_tts_import(self, content):
        """Check if HTML content already has TTS import"""
        return 'tts-sender.js' in content
    
    def add_tts_import(self, content):
        """Add TTS import to HTML content"""
        # Pattern to find the head section and existing script/link tags
        head_pattern = r'(<head[^>]*>.*?)(</head>)'
        
        match = re.search(head_pattern, content, re.IGNORECASE | re.DOTALL)
        if not match:
            return None, "Could not find <head> section"
        
        head_content = match.group(1)
        head_close = match.group(2)
        
        # Try to insert after existing CSS links
        css_pattern = r'(.*<link[^>]*stylesheet[^>]*>)'
        css_match = re.search(css_pattern, head_content, re.IGNORECASE | re.DOTALL)
        
        if css_match:
            # Insert after the last CSS link
            insert_point = css_match.end()
            new_head = (head_content[:insert_point] + 
                       '\n' + self.tts_script_tag + 
                       head_content[insert_point:])
        else:
            # Insert before </head> if no CSS found
            new_head = head_content + '\n' + self.tts_script_tag + '\n    '
        
        # Replace the original head section
        new_content = content.replace(match.group(0), new_head + head_close)
        return new_content, None
    
    def process_html_file(self, file_path):
        """Process a single HTML file"""
        try:
            # Read file with UTF-8 encoding
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if already has TTS import
            if self.has_tts_import(content):
                self.skipped_files.append(str(file_path))
                return f"Skipped {file_path.name} - already has TTS import"
            
            # Add TTS import
            new_content, error = self.add_tts_import(content)
            if error:
                self.errors.append(f"{file_path}: {error}")
                return f"Error processing {file_path.name}: {error}"
            
            # Write back to file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            self.processed_files.append(str(file_path))
            return f"✅ Processed {file_path.name}"
            
        except Exception as e:
            error_msg = f"{file_path}: {str(e)}"
            self.errors.append(error_msg)
            return f"❌ Error processing {file_path.name}: {str(e)}"
    
    def run(self):
        """Run the TTS import process"""
        print("🎐 TTS Importer - Adding magic reading button to all novels!")
        print("=" * 60)
        
        # Find all HTML files
        html_files = self.find_html_files()
        
        if not html_files:
            print("❌ No HTML files found in subdirectories")
            return
        
        print(f"📁 Found {len(html_files)} HTML files in subdirectories")
        print()
        
        # Process each file
        for file_path in html_files:
            result = self.process_html_file(file_path)
            print(result)
        
        # Print summary
        print()
        print("=" * 60)
        print("📊 SUMMARY")
        print("=" * 60)
        print(f"✅ Processed: {len(self.processed_files)} files")
        print(f"⏭️  Skipped: {len(self.skipped_files)} files (already have TTS)")
        print(f"❌ Errors: {len(self.errors)} files")
        
        if self.processed_files:
            print("\n📝 Processed files:")
            for file_path in self.processed_files[:10]:  # Show first 10
                print(f"   • {Path(file_path).parent.name}/{Path(file_path).name}")
            if len(self.processed_files) > 10:
                print(f"   ... and {len(self.processed_files) - 10} more files")
        
        if self.errors:
            print("\n❌ Errors encountered:")
            for error in self.errors[:5]:  # Show first 5 errors
                print(f"   • {error}")
            if len(self.errors) > 5:
                print(f"   ... and {len(self.errors) - 5} more errors")
        
        print(f"\n🎉 TTS Magic Button is now available in {len(self.processed_files)} novels!")

def main():
    """Main function"""
    # Get root directory from command line or use current directory
    root_dir = sys.argv[1] if len(sys.argv) > 1 else None
    
    # Create importer and run
    importer = TTSImporter(root_dir)
    importer.run()

if __name__ == "__main__":
    main()
