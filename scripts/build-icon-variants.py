"""Refresh the packaged-only picker index; no raw library is required.
For source re-analysis use curate-icons.py analyze/apply instead.
"""
import runpy,sys
from pathlib import Path
sys.argv=[str(Path(__file__).with_name('curate-icons.py')),'runtime']
runpy.run_path(sys.argv[0],run_name='__main__')
