import os
import sys

sys.path.insert(
    0,
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "src", "app")
    ),
)

import models  # type: ignore # noqa: F401

