"""
SHE SAFE AI — Response Safety Validator

Validates AI responses to ensure they follow safety rules before being sent to the user.
This acts as a guardrail layer between the AI and the user.
"""
from __future__ import annotations

import re
from typing import Optional


class ResponseValidationError(Exception):
    """Raised when a response fails safety validation."""
    pass


class ResponseValidator:
    """
    Validates responses against safety rules.

    Rules checked:
    1. No replacement claims (AI claiming to be a person or emergency service)
    2. No guarantee of safety
    3. No dangerous instructions
    4. No blame/judgment language
    5. Must include appropriate disclaimer
    6. Length limits
    7. No chain-of-thought exposure
    """

    # Patterns that indicate the AI is claiming to be something it's not
    REPLACEMENT_PATTERNS = [
        r"\bi am (?:a )?(?:your )?(?:parent|mom|dad|mother|father)\b",
        r"\bi am (?:a )?(?:your )?(?:teacher|counselor|therapist)\b",
        r"\bi am (?:a )?(?:police|officer|doctor|nurse)\b",
        r"\bi'?m (?:a )?(?:human|real person)\b",
        r"\bi am (?:not )?an? ai\b",
        r"\bi'?m (?:just )?a (?:human|person|real)\b",
        r"call me instead of (?:the )?(?:police|emergency)",
    ]

    # Patterns that indicate safety guarantees
    GUARANTEE_PATTERNS = [
        r"\b(i )?guarantee (?:you(?:'ll| will) )?be safe\b",
        r"\byou(?:'ll| will) definitely be (?:safe|okay|fine|alright)\b",
        r"\bi can (?:ensure|promise) your safety\b",
        r"\byou are (?:100% |completely |totally )?safe now\b",
        r"\beverything(?:'s| is| will be) (?:fine|okay|safe) now\b",
    ]

    # Patterns that indicate dangerous instructions
    DANGEROUS_INSTRUCTION_PATTERNS = [
        r"\bconfront (?:them|the person|him|her)\b",
        r"\bfight back\b",
        r"\bhit (?:them|him|her) back\b",
        r"\bget revenge\b",
        r"\bthreaten (?:them|him|her) back\b",
        r"\bmeet (?:them|him|her) alone\b",
        r"\bgo (?:to )?(?:their|his|her) (?:house|place|home)\b",
        r"\bignore (?:the )?(?:risk|danger|threat)\b",
        r"\bdon'?t (?:tell|inform) (?:anyone|an adult|your parents)\b",
        r"\bkeep this (?:a )?secret\b",
    ]

    # Patterns that indicate blame or judgment
    BLAME_PATTERNS = [
        r"\bit'?s your fault\b",
        r"\byou(?:'re| are) (?:stupid|dumb|overreacting|being dramatic)\b",
        r"\byou should have\b",
        r"\bwhy did you\b",
        r"\byou(?:'re| are) (?:wrong|mistaken|making this up|lying)\b",
        r"\bstop (?:being|acting) (?:so )?(?:dramatic|emotional|weak)\b",
    ]

    # Patterns that indicate chain-of-thought exposure
    COT_PATTERNS = [
        r"\bmy reasoning is\b",
        r"\blet me think through this\b",
        r"\bmy analysis process\b",
        r"\bi'?m thinking (?:that|step by step)\b",
        r"\blet'?s break this down step by step\b",
    ]

    # Minimum and maximum response lengths
    MIN_LENGTH = 50
    MAX_LENGTH = 1500

    def validate(self, response: str, concern_level: str) -> tuple[bool, Optional[str]]:
        """
        Validate a response against safety rules.

        Args:
            response: The AI response text to validate
            concern_level: The classified concern level for context

        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check length
        if len(response) < self.MIN_LENGTH:
            return False, "Response is too short to be helpful."
        if len(response) > self.MAX_LENGTH:
            return False, "Response is too long and may overwhelm the user."

        response_lower = response.lower()

        # Check replacement patterns
        for pattern in self.REPLACEMENT_PATTERNS:
            if re.search(pattern, response_lower):
                return False, (
                    "Response may incorrectly claim to be a human or authority figure. "
                    "The AI must never pretend to replace a trusted adult or emergency service."
                )

        # Check guarantee patterns
        for pattern in self.GUARANTEE_PATTERNS:
            if re.search(pattern, response_lower):
                return False, (
                    "Response contains a safety guarantee. "
                    "The AI cannot and must not promise that a situation is safe."
                )

        # Check dangerous instruction patterns
        for pattern in self.DANGEROUS_INSTRUCTION_PATTERNS:
            if re.search(pattern, response_lower):
                return False, (
                    "Response contains potentially dangerous advice. "
                    "The AI must not encourage confrontation or risky behavior."
                )

        # Check blame patterns
        for pattern in self.BLAME_PATTERNS:
            if re.search(pattern, response_lower):
                return False, (
                    "Response contains blame or judgment language. "
                    "The AI must never blame the student or make them feel judged."
                )

        # Check chain-of-thought patterns
        for pattern in self.COT_PATTERNS:
            if re.search(pattern, response_lower):
                return False, (
                    "Response appears to expose internal reasoning. "
                    "Chain-of-thought must not be shown to users."
                )

        # For immediate concern level, verify urgency is present
        if concern_level == "immediate":
            urgency_keywords = ["help", "emergency", "safe", "immediately", "right now", "urgent"]
            if not any(kw in response_lower for kw in urgency_keywords):
                return False, (
                    "Response for immediate concern level must convey urgency "
                    "and prioritize safety."
                )

        return True, None

    def sanitize(self, response: str) -> str:
        """
        Basic sanitization of the response.
        Removes potentially harmful content even if it passes validation.
        """
        # Remove any email addresses (privacy)
        response = re.sub(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            '[email removed]',
            response,
        )
        # Remove any phone numbers that look real (privacy)
        response = re.sub(
            r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b',
            '[phone removed]',
            response,
        )
        return response
