"""
Comprehensive test suite for the models module.

Tests cover:
- Environment variable parsing and validation
- Model availability and filtering
- Default model selection logic
- Model validation functions
- Best model selection with preferences
- Edge cases and error conditions
"""

import os
import pytest
from unittest.mock import patch


from .context import models  # type: ignore # noqa: F401

from models import (  # type: ignore
    ALL_MODELS,
    MODEL_PRIORITY,
    get_available_models,
    get_default_model,
    validate_model,
    get_best_available_model,
    MODELS,
    GRAPH_MODEL,
)


class TestModelConstants:
    """Test the constant definitions and basic structure."""

    def test_all_models_contains_expected_models(self):
        """Test that ALL_MODELS contains the expected model list."""
        expected_models = [
            "gpt-4o-mini-2024-07-18",
            "gpt-4.1-mini-2025-04-14",
            "gpt-3.5-turbo-0125",
            "gpt-3.5-turbo-16k-0613",
            "o4-mini-2025-04-16",
            "o3-2025-04-16",
            "gpt-4.1-2025-04-14",
            "gpt-4o-2024-08-06",
        ]
        assert ALL_MODELS == expected_models

    def test_model_priority_is_subset_of_all_models(self):
        """Test that MODEL_PRIORITY only contains models from ALL_MODELS."""
        for model in MODEL_PRIORITY:
            assert model in ALL_MODELS

    def test_model_priority_order(self):
        """Test that MODEL_PRIORITY is ordered
        correctly (most powerful first)."""
        expected_priority = [
            "gpt-4.1-2025-04-14",  # Flagship GPT model
            "o3-2025-04-16",  # Advanced reasoning
            "gpt-4o-2024-08-06",  # Fast, intelligent, flexible
            "o4-mini-2025-04-16",  # Latest with improved accuracy
            "gpt-4.1-mini-2025-04-14",  # Enhanced reasoning mini
            "gpt-4o-mini-2024-07-18",  # Fast and efficient mini
            "gpt-3.5-turbo-0125",  # Legacy model
            "gpt-3.5-turbo-16k-0613",  # Legacy model with larger context
        ]
        assert MODEL_PRIORITY == expected_priority

    def test_legacy_constants(self):
        """Test that legacy constants are properly defined."""
        assert MODELS == ALL_MODELS
        assert isinstance(GRAPH_MODEL, str)
        assert GRAPH_MODEL in ALL_MODELS


class TestGetAvailableModels:
    """Test the get_available_models function with various
    environment configurations."""

    def test_no_environment_variable_returns_all_models(self):
        """Test that when no AVAILABLE_MODELS env var is set,
        all models are returned."""
        with patch.dict(os.environ, {}, clear=True):
            # Remove AVAILABLE_MODELS if it exists
            if "AVAILABLE_MODELS" in os.environ:
                del os.environ["AVAILABLE_MODELS"]
            result = get_available_models()
            assert result == ALL_MODELS

    def test_empty_environment_variable_returns_all_models(self):
        """Test that an empty AVAILABLE_MODELS env var returns all models."""
        with patch.dict(os.environ, {"AVAILABLE_MODELS": ""}):
            result = get_available_models()
            assert result == ALL_MODELS

    def test_single_valid_model(self):
        """Test that a single valid model is returned correctly."""
        with patch.dict(
            os.environ, {"AVAILABLE_MODELS": "gpt-4.1-2025-04-14"}
        ):
            result = get_available_models()
            assert result == ["gpt-4.1-2025-04-14"]

    def test_multiple_valid_models(self):
        """Test that multiple valid models are returned correctly."""
        avaliable_models = (
            "gpt-4.1-2025-04-14,o3-2025-04-16,gpt-4o-mini-2024-07-18"
        )
        expected = [
            "gpt-4.1-2025-04-14",
            "o3-2025-04-16",
            "gpt-4o-mini-2024-07-18",
        ]
        with patch.dict(os.environ, {"AVAILABLE_MODELS": avaliable_models}):
            result = get_available_models()
            assert result == expected

    def test_models_with_whitespace(self):
        """Test that models with whitespace are handled correctly."""
        avaliable_models = (
            " gpt-4.1-2025-04-14 , o3-2025-04-16 , gpt-4o-mini-2024-07-18 "
        )
        expected = [
            "gpt-4.1-2025-04-14",
            "o3-2025-04-16",
            "gpt-4o-mini-2024-07-18",
        ]
        with patch.dict(os.environ, {"AVAILABLE_MODELS": avaliable_models}):
            result = get_available_models()
            assert result == expected

    def test_invalid_models_are_filtered_out(self):
        """Test that invalid models are filtered out but valid ones remain."""
        avaliable_models = (
            "gpt-4.1-2025-04-14,invalid-model,o3-2025-04-16,another-invalid"
        )
        expected = ["gpt-4.1-2025-04-14", "o3-2025-04-16"]
        with patch.dict(os.environ, {"AVAILABLE_MODELS": avaliable_models}):
            result = get_available_models()
            assert result == expected

    def test_only_invalid_models_returns_all_models(self):
        """Test that when only invalid models are specified,
        all models are returned."""
        with patch.dict(
            os.environ, {"AVAILABLE_MODELS": "invalid-model,another-invalid"}
        ):
            result = get_available_models()
            assert result == ALL_MODELS

    def test_empty_strings_and_commas_are_handled(self):
        """Test that empty strings and extra commas don't cause issues."""
        avaliable_models = "gpt-4.1-2025-04-14,,o3-2025-04-16,,,"
        expected = ["gpt-4.1-2025-04-14", "o3-2025-04-16"]
        with patch.dict(os.environ, {"AVAILABLE_MODELS": avaliable_models}):
            result = get_available_models()
            assert result == expected


class TestGetDefaultModel:
    """Test the get_default_model function and priority logic."""

    def test_returns_highest_priority_available_model(self):
        """Test that the highest priority available model is returned."""
        # When all models are available, should return the first in priority
        with patch.dict(os.environ, {}, clear=True):
            if "AVAILABLE_MODELS" in os.environ:
                del os.environ["AVAILABLE_MODELS"]
            result = get_default_model()
            assert result == MODEL_PRIORITY[0]
            assert result == "gpt-4.1-2025-04-14"

    def test_returns_highest_priority_from_limited_set(self):
        """Test priority selection when only some models are available."""
        # Only make lower priority models available
        limited_models = "gpt-4o-mini-2024-07-18,gpt-3.5-turbo-0125"
        with patch.dict(os.environ, {"AVAILABLE_MODELS": limited_models}):
            result = get_default_model()
            # Should return the highest priority among available models
            assert result == "gpt-4o-mini-2024-07-18"

    def test_fallback_when_no_priority_models_available(self):
        """Test fallback behavior when no priority models
        are in the available set."""
        # This would be an edge case where available
        # models aren't in priority list
        with patch("models.get_available_models") as mock_get_available:
            # Mock a scenario where available models don't match priority
            mock_get_available.return_value = ["some-other-model"]
            result = get_default_model()
            # Should fallback to first available model
            assert result == "some-other-model"

    def test_returns_first_priority_model_when_multiple_available(self):
        """Test that first priority model is chosen when multiple
        high-priority models are available."""
        # Make multiple high-priority models available
        high_priority_models = (
            "o3-2025-04-16,gpt-4.1-2025-04-14,gpt-4o-2024-08-06"
        )
        with patch.dict(
            os.environ, {"AVAILABLE_MODELS": high_priority_models}
        ):
            result = get_default_model()
            # Should return the highest priority model
            assert result == "gpt-4.1-2025-04-14"


class TestValidateModel:
    """Test the validate_model function."""

    def test_valid_model_returns_true(self):
        """Test that a valid model returns True."""
        with patch.dict(os.environ, {}, clear=True):
            if "AVAILABLE_MODELS" in os.environ:
                del os.environ["AVAILABLE_MODELS"]
            # When all models are available
            assert validate_model("gpt-4.1-2025-04-14") is True
            assert validate_model("o3-2025-04-16") is True

    def test_invalid_model_returns_false(self):
        """Test that an invalid model returns False."""
        with patch.dict(os.environ, {}, clear=True):
            if "AVAILABLE_MODELS" in os.environ:
                del os.environ["AVAILABLE_MODELS"]
            assert validate_model("invalid-model") is False
            assert validate_model("gpt-5-turbo") is False

    def test_model_not_in_available_set_returns_false(self):
        """Test that a model not in the available set returns False."""
        # Limit available models
        with patch.dict(
            os.environ, {"AVAILABLE_MODELS": "gpt-4.1-2025-04-14"}
        ):
            assert validate_model("gpt-4.1-2025-04-14") is True
            assert (
                validate_model("o3-2025-04-16") is False
            )  # Valid model but not available

    def test_empty_string_returns_false(self):
        """Test that an empty string returns False."""
        assert validate_model("") is False

    def test_none_value_returns_false(self):
        """Test that None value returns False."""
        # validate_model handles None gracefully and returns False
        assert validate_model(None) is False


class TestGetBestAvailableModel:
    """Test the get_best_available_model function with preferences."""

    def test_returns_preferred_model_when_available(self):
        """Test that preferred model is returned when it's available."""
        with patch.dict(os.environ, {}, clear=True):
            if "AVAILABLE_MODELS" in os.environ:
                del os.environ["AVAILABLE_MODELS"]
            # All models available, preferred should be returned
            result = get_best_available_model("o3-2025-04-16")
            assert result == "o3-2025-04-16"

    def test_returns_default_when_preferred_unavailable(self):
        """Test that default model is returned when
        preferred is not available."""
        # Limit available models to exclude the preferred one
        with patch.dict(
            os.environ,
            {"AVAILABLE_MODELS": "gpt-4o-mini-2024-07-18,gpt-3.5-turbo-0125"},
        ):
            result = get_best_available_model("gpt-4.1-2025-04-14")
            # Should return highest priority available model instead
            assert result == "gpt-4o-mini-2024-07-18"

    def test_returns_default_when_no_preference_given(self):
        """Test that default model is returned when no preference is given."""
        with patch.dict(os.environ, {}, clear=True):
            if "AVAILABLE_MODELS" in os.environ:
                del os.environ["AVAILABLE_MODELS"]
            result = get_best_available_model()
            assert result == get_default_model()

    def test_returns_default_when_preference_is_none(self):
        """Test that default model is returned when preference is None."""
        with patch.dict(os.environ, {}, clear=True):
            if "AVAILABLE_MODELS" in os.environ:
                del os.environ["AVAILABLE_MODELS"]
            result = get_best_available_model(None)
            assert result == get_default_model()

    def test_returns_default_when_preference_is_empty_string(self):
        """Test that default model is returned
        when preference is empty string."""
        with patch.dict(os.environ, {}, clear=True):
            if "AVAILABLE_MODELS" in os.environ:
                del os.environ["AVAILABLE_MODELS"]
            result = get_best_available_model("")
            assert result == get_default_model()


class TestIntegration:
    """Integration tests that test multiple functions working together."""

    def test_environment_configuration_affects_all_functions(self):
        """Test that environment configuration affects all model
        functions consistently."""
        test_models = "gpt-4.1-2025-04-14,o3-2025-04-16"
        expected_models = ["gpt-4.1-2025-04-14", "o3-2025-04-16"]

        with patch.dict(os.environ, {"AVAILABLE_MODELS": test_models}):
            # Test that all functions respect the environment configuration
            available = get_available_models()
            default = get_default_model()

            assert available == expected_models
            assert (
                default == "gpt-4.1-2025-04-14"
            )  # Highest priority available
            assert validate_model("gpt-4.1-2025-04-14") is True
            assert validate_model("o3-2025-04-16") is True
            assert (
                validate_model("gpt-4o-mini-2024-07-18") is False
            )  # Not in available set

            # Test best available model
            assert (
                get_best_available_model("gpt-4.1-2025-04-14")
                == "gpt-4.1-2025-04-14"
            )
            assert get_best_available_model("o3-2025-04-16") == "o3-2025-04-16"
            assert (
                get_best_available_model("gpt-4o-mini-2024-07-18")
                == "gpt-4.1-2025-04-14"
            )  # Falls back to default

    def test_realistic_production_configuration(self):
        """Test a realistic production configuration with
        cost-effective models."""
        prod_models = "gpt-4o-mini-2024-07-18,o4-mini-2025-04-16"
        expected_models = ["gpt-4o-mini-2024-07-18", "o4-mini-2025-04-16"]

        with patch.dict(os.environ, {"AVAILABLE_MODELS": prod_models}):
            available = get_available_models()
            default = get_default_model()

            assert available == expected_models
            assert (
                default == "o4-mini-2025-04-16"
            )  # Higher priority than gpt-4o-mini
            assert validate_model("o4-mini-2025-04-16") is True
            assert (
                validate_model("gpt-4.1-2025-04-14") is False
            )  # Not available in prod

    def test_development_configuration_with_experimental_models(self):
        """Test a development configuration that includes
        experimental models."""
        dev_models = (
            "gpt-4.1-2025-04-14,o3-2025-04-16,"
            "gpt-4o-2024-08-06,o4-mini-2025-04-16"
        )

        with patch.dict(os.environ, {"AVAILABLE_MODELS": dev_models}):
            available = get_available_models()
            default = get_default_model()

            # Should have all the specified models
            assert len(available) == 4
            assert all(model in available for model in dev_models.split(","))
            # Should default to the highest priority model
            assert default == "gpt-4.1-2025-04-14"


class TestEdgeCases:
    """Test edge cases and error conditions."""

    def test_malformed_environment_variable(self):
        """Test handling of malformed environment variables."""
        malformed_cases = [
            ",,,",  # Only commas
            "  ,  ,  ",  # Whitespace and commas
            "invalid1,invalid2,invalid3",  # All invalid models
            ",,gpt-4.1-2025-04-14,,",  # Valid model with empty entries
        ]

        for case in malformed_cases:
            with patch.dict(os.environ, {"AVAILABLE_MODELS": case}):
                result = get_available_models()
                # Should either return the valid models or
                # fall back to all models
                assert isinstance(result, list)
                assert len(result) > 0
                if "gpt-4.1-2025-04-14" in case:
                    assert "gpt-4.1-2025-04-14" in result

    def test_case_sensitivity(self):
        """Test that model names are case sensitive."""
        with patch.dict(
            os.environ,
            {"AVAILABLE_MODELS": "GPT-4.1-2025-04-14,gpt-4.1-2025-04-14"},
        ):
            result = get_available_models()
            # Only the correctly cased model should be included
            assert result == ["gpt-4.1-2025-04-14"]

    def test_very_long_environment_variable(self):
        """Test handling of very long environment variables."""
        # Create a long string with valid and invalid models
        long_models = ",".join(ALL_MODELS * 10 + ["invalid"] * 100)
        with patch.dict(os.environ, {"AVAILABLE_MODELS": long_models}):
            result = get_available_models()
            # Should return valid models (may include duplicates
            # since we don't deduplicate)
            # All models in result should be from ALL_MODELS
            assert all(model in ALL_MODELS for model in result)
            # Should contain all valid models from ALL_MODELS
            assert all(model in result for model in ALL_MODELS)


if __name__ == "__main__":
    # Run the tests if the script is executed directly
    pytest.main([__file__, "-v"])
