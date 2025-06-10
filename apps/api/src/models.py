"""
AI Model Configuration Module

Centralized configuration for available AI models used
throughout the application.
This module provides model lists, validation, and dynamic
type creation for Pydantic models.
"""

import os
import logging

logger = logging.getLogger(__name__)

# Complete list of all supported models
ALL_MODELS = [
    "gpt-4o-mini-2024-07-18",
    "gpt-4.1-mini-2025-04-14",
    "gpt-3.5-turbo-0125",
    "o4-mini-2025-04-16",
    "o3-2025-04-16",
    "gpt-4.1-2025-04-14",
    "gpt-4o-2024-08-06",
]

# Model priority order (most powerful first)
MODEL_PRIORITY = [
    "gpt-4.1-2025-04-14",  # Flagship GPT model
    "o3-2025-04-16",  # Advanced reasoning
    "gpt-4o-2024-08-06",  # Fast, intelligent, flexible
    "o4-mini-2025-04-16",  # Latest with improved accuracy
    "gpt-4.1-mini-2025-04-14",  # Enhanced reasoning mini
    "gpt-4o-mini-2024-07-18",  # Fast and efficient mini
    "gpt-3.5-turbo-0125",  # Legacy model
]


def get_available_models() -> list[str]:
    """
    Get the list of available models based on environment configuration.

    Returns:
        List of available model names. Falls back to ALL_MODELS if environment
        variable is not set or contains invalid models.
    """
    available_models_env = os.getenv("AVAILABLE_MODELS", "")

    if available_models_env:
        # Parse comma-separated list of models
        available_models = [
            model.strip()
            for model in available_models_env.split(",")
            if model.strip() in ALL_MODELS
        ]

        if not available_models:
            # If no valid models found, use all models
            logger.warning(
                f"No valid models found in AVAILABLE_MODELS "
                f"environment variable: {available_models_env}. "
                f"Using all models."
            )
            return ALL_MODELS
        else:
            logger.info(f"Using configured models: {available_models}")
            return available_models
    else:
        # No environment variable set, use all models
        logger.info(
            f"No AVAILABLE_MODELS environment variable set. "
            f"Using all models: {ALL_MODELS}"
        )
        return ALL_MODELS


def get_default_model() -> str:
    """
    Get the default model (most powerful available model).

    Returns:
        The most powerful model from the available models list.
    """
    available_models = get_available_models()

    # Find the most powerful model that's available
    for model in MODEL_PRIORITY:
        if model in available_models:
            return model

    # Fallback to first available model if none from priority list found
    return available_models[0] if available_models else ALL_MODELS[0]


def validate_model(model: str) -> bool:
    """
    Validate if a model is available in the current environment.

    Args:
        model: The model name to validate

    Returns:
        True if the model is available, False otherwise
    """
    return model in get_available_models()


def get_best_available_model(preferred_model: str = None) -> str:
    """
    Get the best available model, optionally preferring a specific model.

    Args:
        preferred_model: Preferred model name (optional)

    Returns:
        The preferred model if available, otherwise the most
        powerful available model
    """
    available_models = get_available_models()

    # If preferred model is available, use it
    if preferred_model and preferred_model in available_models:
        return preferred_model

    # Otherwise, return the most powerful available model
    return get_default_model()


# Legacy compatibility
MODELS = ALL_MODELS  # For backward compatibility with graph.py
GRAPH_MODEL = get_default_model()  # Default model for graph generation
