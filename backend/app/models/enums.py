from enum import Enum

class Role(str, Enum):
    INVESTIGATOR = "investigator"
    ANALYST = "analyst"
    SUPERVISOR = "supervisor"
    ADMINISTRATOR = "administrator"
