import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory for the backend (where data/ and the DB are located)
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load environment variables
load_dotenv(dotenv_path=BASE_DIR / ".env")

class Settings:
    PROJECT_NAME: str = "Coding Platform"
    
    # Paths
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = BASE_DIR / "data"
    
    # Databases
    DATABASE_PATH: Path = BASE_DIR / "app" / "db" / "coding_platform.sqlite"
    MCQ_DATABASE_PATH: Path = BASE_DIR / "app" / "db" / "coding_platform.sqlite"
    
    # Application Paths
    MCQ_SEED_PATH: Path = BASE_DIR / "app" / "db" / "mcq_seed_questions.json"
    
    # Mail Config (if any env vars are used)
    # SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")

settings = Settings()
