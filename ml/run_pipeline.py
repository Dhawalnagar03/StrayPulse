"""
Convenience script to run the full ML pipeline end-to-end.
Run: python ml/run_pipeline.py
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

print("Step 1/3: Generating synthetic dataset...")
from ml.data.generate_synthetic import build_dataset, Path as DPath
import pandas as pd

out_dir = Path(__file__).parent / "data"
out_dir.mkdir(parents=True, exist_ok=True)
df = build_dataset()
df.to_csv(out_dir / "synthetic_sightings.csv", index=False)
print(f"  [OK] {len(df)} sightings generated")

print("\nStep 2/3: Engineering features...")
from ml.features.engineer_features import engineer_features
engineer_features(
    str(out_dir / "synthetic_sightings.csv"),
    str(out_dir / "features.csv"),
)

print("\nStep 3/3: Training all models...")
from ml.training.train_all import main as train_main
results = train_main()

print("\nPipeline complete! [DONE]")
print("Run `python ml/evaluation/evaluate.py` for detailed metrics.")
