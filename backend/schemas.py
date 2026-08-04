from typing import Annotated

from pydantic import BaseModel, StringConstraints


class ProctoringLogCreate(BaseModel):
    violation_type: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    message: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
