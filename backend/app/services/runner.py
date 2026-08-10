import subprocess
import asyncio
import sys
import os
import re
import time
from typing import Dict, Tuple


def normalize_output(text: str) -> str:
    """
    Normalize output for comparison - CRITICAL for avoiding false negatives.
    
    This function handles all common formatting differences that should NOT
    cause a correct answer to fail:
    - Windows/Mac/Linux newline differences
    - Trailing spaces per line
    - Blank lines at start/end
    - Final newline presence/absence
    - Multiple consecutive empty lines
    """
    if text is None:
        return ""
    
    # Step 1: Normalize all newline formats to \n
    # Windows: \r\n -> \n
    # Old Mac: \r -> \n
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    
    # Step 2: Remove trailing spaces from each line
    lines = text.split('\n')
    lines = [line.rstrip() for line in lines]
    
    # Step 3: Join back
    text = '\n'.join(lines)
    
    # Step 4: Collapse multiple consecutive empty lines into one
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Step 5: Strip leading/trailing whitespace (including final newlines)
    text = text.strip()
    
    return text


def compare_outputs(actual: str, expected: str) -> bool:
    """
    Compare two outputs after normalization.
    This is the PRIMARY comparison function - use this EVERYWHERE.
    """
    return normalize_output(actual) == normalize_output(expected)


def get_verdict(passed_tests: int, total_tests: int) -> str:
    """
    Determine verdict based on test results.
    Returns: 'Accepted', 'Partial', or 'Failed'
    """
    if total_tests == 0:
        return "Failed"
    if passed_tests == total_tests:
        return "Accepted"
    elif passed_tests > 0:
        return "Partial"
    else:
        return "Failed"


class PythonRunner:
    """Python code execution runner with timeout and output capture"""
    
    TIMEOUT = 5  # seconds
    MAX_OUTPUT_SIZE = 10000  # characters
    
    def _run_sync(self, code: str, stdin_input: str = "") -> Dict:
        """Synchronous execution - runs in thread pool for Windows compatibility"""
        try:
            # Use subprocess.run which works reliably on Windows
            creationflags = 0
            if os.name == 'nt':
                creationflags = subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
            
            result = subprocess.run(
                [sys.executable, '-u', '-c', code],
                input=stdin_input.encode('utf-8'),
                capture_output=True,
                timeout=self.TIMEOUT,
                creationflags=creationflags
            )
            
            stdout_str = result.stdout.decode('utf-8', errors='replace')[:self.MAX_OUTPUT_SIZE]
            stderr_str = result.stderr.decode('utf-8', errors='replace')[:self.MAX_OUTPUT_SIZE]
            
            if result.returncode == 0:
                return {
                    "status": "success",
                    "stdout": stdout_str,
                    "stderr": stderr_str
                }
            else:
                return {
                    "status": "error",
                    "stdout": stdout_str,
                    "stderr": stderr_str if stderr_str else f"Process exited with code {result.returncode}"
                }
                
        except subprocess.TimeoutExpired:
            return {
                "status": "error",
                "stdout": "",
                "stderr": f"Error: Code execution timed out after {self.TIMEOUT} seconds"
            }
        except FileNotFoundError:
            return {
                "status": "error",
                "stdout": "",
                "stderr": f"Python interpreter not found: {sys.executable}"
            }
        except PermissionError as e:
            return {
                "status": "error",
                "stdout": "",
                "stderr": f"Permission denied executing Python: {str(e)}"
            }
        except Exception as e:
            import traceback
            return {
                "status": "error",
                "stdout": "",
                "stderr": f"Execution error: {type(e).__name__}: {str(e)}"
            }
    
    async def run_with_input(self, code: str, stdin_input: str = "") -> Dict:
        """
        Execute Python code with custom input (Windows-compatible)
        Uses thread pool to avoid Windows asyncio subprocess issues
        """
        # Run synchronous subprocess in thread pool for Windows compatibility
        return await asyncio.to_thread(self._run_sync, code, stdin_input)
