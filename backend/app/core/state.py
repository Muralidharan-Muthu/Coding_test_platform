from typing import Dict, Any

# In-memory store for user sessions (session_id -> user_id)
sessions: Dict[str, str] = {}

# Store for session test types (session_id -> test_type string)
session_test_types: Dict[str, str] = {}

# Store for candidate emails by session (session_id -> email)
session_candidate_emails: Dict[str, str] = {}

# Active exam sessions state
exam_sessions: Dict[str, Any] = {}
