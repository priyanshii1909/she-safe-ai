"""
SHE SAFE AI — Safety Classification Engine

This is the core safety layer that classifies user messages into concern levels.
It uses a weighted keyword + pattern matching approach with category detection.

Architecture:
    User Input → Pre-process → Keyword Matching → Weighted Scoring →
    Category Detection → Concern Level Classification → Structured Output

This engine does NOT require an external AI API. It works out-of-the-box
with a comprehensive rule-based system, but can be enhanced with an AI API.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class ConcernLevel(str, Enum):
    SUPPORT = "support"
    CONCERNING = "concerning"
    IMMEDIATE = "immediate"


@dataclass
class CategoryDefinition:
    name: str
    description: str
    keywords: dict[str, int]  # keyword/phrase → weight
    patterns: list[str] = field(default_factory=list)  # regex patterns


@dataclass
class ClassificationResult:
    concern_level: ConcernLevel
    category: str
    category_description: str
    score: float
    matched_keywords: list[str]
    explanation: str


# ── Category Definitions ────────────────────────────────────────────────────

CATEGORIES: dict[str, CategoryDefinition] = {
    "bullying": CategoryDefinition(
        name="Bullying",
        description="Repeated aggressive behavior intended to hurt, intimidate, or exclude",
        keywords={
            "bully": 3, "bullying": 3, "picked on": 3, "making fun of me": 1,
            "teasing": 1, "laughing at me": 2, "pushing me": 3, "hitting me": 4,
            "name calling": 2, "calling me names": 2, "threatening me": 4,
            "scared of them": 3, "afraid of them": 3, "hurt me": 3,
            "won't leave me alone": 3, "keeps bothering": 3, "harassing": 4,
            "cyberbullying": 3, "mean messages": 2, "posting about me": 2,
            "spreading rumors": 2, "gossiping about me": 1, "excluding me": 1,
            "leaving me out": 1, "ignoring me": 1, "nobody likes me": 1,
            "everyone hates me": 2, "no one cares": 1, "want to hurt myself": 5,
            "want to die": 5, "end it all": 5, "suicide": 5, "self harm": 5,
            "cutting myself": 5, "don't want to live": 5, "better off without me": 5,
        },
        patterns=[
            r"\b(bull(y|ied|ying))\b",
            r"\b(pick(?:ed|ing)? on me)\b",
            r"\b(making fun of me)\b",
            r"\b(threaten(?:ing|s|ed)? me)\b",
            r"\b(hurt(?:ing)? me)\b",
            r"\b(won'?t leave me alone)\b",
            r"\b(keep(?:s)? bothering me)\b",
        ],
    ),
    "harassment": CategoryDefinition(
        name="Harassment",
        description="Unwelcome behavior that makes someone feel uncomfortable, intimidated, or unsafe",
        keywords={
            "harassing": 4, "harassment": 4, "unwanted messages": 2,
            "won't stop texting": 2, "keeps texting": 2, "won't stop calling": 3,
            "following me": 4, "stalking": 5, "watching me": 3,
            "uncomfortable around": 2, "creepy": 2, "weird feel": 1,
            "touched inappropriately": 5, "inappropriate touch": 5,
            "sexual comments": 4, "sexual remarks": 4, "sexual jokes": 3,
            "unwanted advances": 4, "pressuring me": 4, "making me uncomfortable": 3,
            "doesn't listen when I say no": 4, "won't take no": 4,
            "sends inappropriate": 4, "nude pics": 5, "asking for pics": 4,
            "revenge porn": 5, "sharing photos": 4, "sharing pictures": 3,
        },
        patterns=[
            r"\b(harass(?:ing|ment|ed))\b",
            r"\b(won'?t stop (?:texting|calling|messaging))\b",
            r"\b(following me)\b",
            r"\b(stalk(?:ing|er))\b",
        ],
    ),
    "threats_violence": CategoryDefinition(
        name="Threats & Violence",
        description="Direct threats of harm, physical violence, or weapons",
        keywords={
            "threatening me": 5, "threat to kill": 5, "going to hurt me": 5,
            "going to kill": 5, "going to attack": 5, "has a weapon": 5,
            "carrying a knife": 5, "has a gun": 5, "gang": 3, "gang members": 3,
            "physical attack": 5, "beat me up": 4, "fight me": 3, "punched me": 4,
            "stabbed": 5, "shot at": 5, "domestic violence": 5, "abuse at home": 5,
            "parent hits me": 5, "dad hits": 5, "mom hits": 5, "getting beaten": 5,
            "violence at home": 5, "unsafe at home": 4, "afraid to go home": 4,
            "locked me": 4, "held against": 5, "kidnapped": 5, "abducted": 5,
        },
        patterns=[
            r"\b(threaten(?:ing|s)? me)\b",
            r"\b(going to (?:hurt|kill|attack) me)\b",
            r"\b(has a (?:weapon|gun|knife))\b",
            r"\b(b[ea]t(?:ten)? me up)\b",
            r"\b(domestic violence)\b",
        ],
    ),
    "substance_abuse": CategoryDefinition(
        name="Substance Abuse",
        description="Pressure to use drugs or alcohol, or concerns about substance use",
        keywords={
            "drugs": 3, "alcohol": 2, "vaping": 2, "smoking": 1, "offering drugs": 4,
            "pressuring me to drink": 4, "pressuring me to smoke": 3,
            "marijuana": 3, "weed": 3, "pills": 3, "pushing me to use": 4,
            "addicted": 3, "substance abuse": 4, "overdose": 5, "passed out": 3,
            "can't stop drinking": 4, "can't stop using": 4,
        },
        patterns=[
            r"\b(pressur(?:e|ing) me to (?:drink|smoke|use))\b",
            r"\b(offering (?:me )?drugs)\b",
        ],
    ),
    "mental_health": CategoryDefinition(
        name="Mental Health",
        description="Emotional distress, anxiety, depression, self-harm, or suicidal thoughts",
        keywords={
            "depressed": 2, "depression": 2, "anxiety": 1, "anxious": 1,
            "panic attack": 3, "can't breathe": 2, "crying all the time": 2,
            "can't sleep": 1, "no sleep": 1, "always tired": 1, "no energy": 1,
            "hopeless": 3, "worthless": 3, "empty": 1, "numb": 2,
            "want to hurt myself": 5, "want to die": 5, "end it all": 5,
            "suicide": 5, "suicidal": 5, "self harm": 5, "cutting myself": 5,
            "don't want to live": 5, "better off without me": 5, "kill myself": 5,
            "no reason to live": 4, "give up": 2, "can't take it anymore": 3,
            "stress": 1, "overwhelmed": 2, "too much pressure": 2,
            "grades dropping": 1, "failing": 1, "can't focus": 1,
        },
        patterns=[
            r"\b(suicid(?:e|al))\b",
            r"\b(self[ -]?harm)\b",
            r"\b(kill(?:ing)? myself)\b",
            r"\b(want to die)\b",
            r"\b(end (?:it all|my life))\b",
        ],
    ),
    "social_issues": CategoryDefinition(
        name="Social & Friendship Issues",
        description="Friendship conflicts, peer pressure, exclusion, or social challenges",
        keywords={
            "friend being mean": 1, "friend ignoring": 1, "friend mad at me": 1,
            "best friend": 1, "friendship": 1, "argument with friend": 1,
            "fight with friend": 1, "fell out": 1, "drama": 1,
            "peer pressure": 2, "pressure to fit in": 2, "want to fit in": 1,
            "left out": 1, "excluded": 1, "not invited": 1, "left on read": 1,
            "ghosted": 1, "dumped me": 1, "broke up with": 1, "relationship issues": 1,
            "boyfriend": 1, "girlfriend": 1, "cheated on me": 2, "broke my heart": 1,
            "crush": 1, "liked someone": 1, "rejected": 1,
        },
    ),
    "family_issues": CategoryDefinition(
        name="Family Issues",
        description="Problems at home, family conflict, or difficult home situations",
        keywords={
            "parents arguing": 2, "parents fighting": 2, "divorce": 2, "divorced": 2,
            "dad left": 2, "mom left": 2, "parent yelling": 2, "screaming at home": 2,
            "strict parents": 1, "not allowed": 1, "grounded": 1, "no phone": 1,
            "parents don't understand": 1, "nobody understands": 1,
            "trouble at home": 2, "bad at home": 2, "can't go home": 3,
            "kicked out": 4, "thrown out": 4, "ran away": 3, "homeless": 4,
            "no food at home": 3, "food insecurity": 3, "can't afford": 2,
            "afraid to go home": 5, "scared to go home": 5, "hitting me": 5,
        },
        patterns=[
            r"\b(parents? (?:arguing|fighting|yelling|screaming))\b",
            r"\b(kicked out|thrown out)\b",
            r"\b(can'?t go home)\b",
        ],
    ),
    "general_question": CategoryDefinition(
        name="General Question",
        description="General questions about safety, the app, or unrelated topics",
        keywords={
            "what can you do": 1, "how does this work": 1, "help me understand": 1,
            "what is this": 1, "who are you": 1, "what do you do": 1,
            "how to stay safe": 1, "safety tips": 1, "stranger danger": 1,
            "online safety": 1, "internet safety": 1, "cyber safety": 1,
            "personal safety": 1,
        },
    ),
    "unclear": CategoryDefinition(
        name="Unclear",
        description="The message doesn't clearly match any known category",
        keywords={},
    ),
}


# ── Concern Level Configuration ─────────────────────────────────────────────

# Minimum score thresholds for concern levels
CONCERN_THRESHOLDS = {
    ConcernLevel.SUPPORT: 0,      # Default for any input
    ConcernLevel.CONCERNING: 3,   # Score >= 3 triggers CONCERNING
    ConcernLevel.IMMEDIATE: 6,    # Score >= 6 triggers IMMEDIATE
}

# Keywords that ALWAYS trigger IMMEDIATE regardless of other scoring
IMMEDIATE_KEYWORDS = {
    "want to die", "kill myself", "end it all", "suicide", "suicidal",
    "self harm", "cutting myself", "better off without me", "don't want to live",
    "going to kill me", "going to hurt me", "threatens to kill", "has a gun",
    "has a weapon", "carrying a knife", "stabbed me", "shot at me",
    "kidnapped", "abducted", "being followed", "someone's following me",
    "following me home", "domestic violence", "getting beaten",
    "touched inappropriately", "sexual assault", "being raped",
    "being forced", "held against my will", "locked me in",
    "overdose", "passed out", "can't breathe", "choking me",
    "drowning", "on fire", "building collapsing", "earthquake",
    "active shooter", "shooting at school", "bomb threat",
}

# Keywords that suggest CONCERNING (elevate from SUPPORT)
CONCERNING_KEYWORDS = {
    "bully", "bullying", "harassing", "harassment", "threatening",
    "following me", "stalking", "unwanted messages", "won't stop",
    "keeps bothering", "picked on", "name calling", "cyberbullying",
    "inappropriate", "pressuring me", "making me uncomfortable",
    "afraid of them", "scared of them", "unsafe around", "don't feel safe",
    "can't go home", "kicked out", "thrown out", "ran away", "homeless",
    "want to hurt myself", "hopeless", "worthless", "can't take it anymore",
}


class SafetyEngine:
    """
    Core safety classification engine.

    Uses weighted keyword matching and pattern recognition to classify
    user messages into concern levels and categories.
    """

    def __init__(self):
        self.categories = CATEGORIES
        self.immediate_keywords = IMMEDIATE_KEYWORDS
        self.concerning_keywords = CONCERNING_KEYWORDS
        self.thresholds = CONCERN_THRESHOLDS

    def _preprocess(self, text: str) -> str:
        """Normalize input text for matching."""
        text = text.lower().strip()
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        return text

    def _check_immediate_keywords(self, text: str) -> tuple[bool, list[str]]:
        """Check if any immediate keywords are present."""
        matched = []
        for keyword in self.immediate_keywords:
            if keyword in text:
                matched.append(keyword)
        return len(matched) > 0, matched

    def _score_categories(self, text: str) -> dict[str, tuple[float, list[str]]]:
        """
        Score each category based on keyword matches.
        Uses word-boundary matching to avoid substring double-counting.
        Returns dict: category_name → (score, matched_keywords)
        """
        scores = {}
        for cat_name, cat_def in self.categories.items():
            if not cat_def.keywords:
                continue
            score = 0.0
            matched = []

            # Check keyword matches using word boundaries
            for keyword, weight in cat_def.keywords.items():
                # Use word boundary matching for single words, phrase matching for multi-word
                if " " in keyword:
                    if keyword in text:
                        score += weight
                        matched.append(keyword)
                else:
                    # Word boundary match for single keywords
                    pattern = r'\b' + re.escape(keyword) + r'\b'
                    if re.search(pattern, text):
                        score += weight
                        matched.append(keyword)

            # Check regex pattern matches (only if no keyword matches for this category)
            if not matched:
                for pattern in cat_def.patterns:
                    if re.search(pattern, text):
                        score += 1.0
                        matched.append(f"pattern:{pattern[:30]}")

            scores[cat_name] = (score, matched)

        return scores

    def classify(self, message: str) -> ClassificationResult:
        """
        Classify a user message and return the concern level, category, and explanation.

        Args:
            message: The user's message text

        Returns:
            ClassificationResult with all classification details
        """
        text = self._preprocess(message)

        # Step 1: Check for immediate keywords first (highest priority)
        has_immediate, immediate_matches = self._check_immediate_keywords(text)

        # Step 2: Score all categories
        category_scores = self._score_categories(text)

        # Step 3: Find best matching category
        best_category = "unclear"
        best_score = 0.0
        best_matches = []

        for cat_name, (score, matches) in category_scores.items():
            if score > best_score:
                best_score = score
                best_category = cat_name
                best_matches = matches

        # Step 4: Check for concerning keywords
        has_concerning = any(kw in text for kw in self.concerning_keywords)

        # Step 5: Determine concern level
        if has_immediate or best_score >= self.thresholds[ConcernLevel.IMMEDIATE]:
            concern_level = ConcernLevel.IMMEDIATE
        elif has_concerning or best_score >= self.thresholds[ConcernLevel.CONCERNING]:
            concern_level = ConcernLevel.CONCERNING
        else:
            concern_level = ConcernLevel.SUPPORT

        # If we have a strong category match but low score, still use the category
        if best_category == "unclear" and best_score > 0:
            best_category = max(category_scores, key=lambda k: category_scores[k][0]) if category_scores else "unclear"
            best_matches = category_scores.get(best_category, ([], []))[1]

        # Build explanation
        explanation = self._build_explanation(
            concern_level, best_category, best_matches, has_immediate
        )

        return ClassificationResult(
            concern_level=concern_level,
            category=self.categories.get(best_category, CATEGORIES["unclear"]).name,
            category_description=self.categories.get(best_category, CATEGORIES["unclear"]).description,
            score=best_score,
            matched_keywords=best_matches,
            explanation=explanation,
        )

    def _build_explanation(
        self,
        concern_level: ConcernLevel,
        category: str,
        matched_keywords: list[str],
        has_immediate: bool,
    ) -> str:
        """Build a human-readable explanation of the classification."""
        if concern_level == ConcernLevel.IMMEDIATE:
            if matched_keywords:
                return (
                    f"I identified this as an immediate safety concern because your "
                    f"description included: {', '.join(matched_keywords[:3])}. "
                    f"Your safety is the priority right now."
                )
            return (
                "I identified this as an immediate safety concern based on your description. "
                "Your safety is the priority right now."
            )

        if concern_level == ConcernLevel.CONCERNING:
            if matched_keywords:
                return (
                    f"I identified this as concerning because your description included: "
                    f"{', '.join(matched_keywords[:3])}. This involves repeated or "
                    f"potentially harmful behavior that deserves adult support."
                )
            return (
                "I identified this as concerning based on your description. "
                "This situation deserves adult support."
            )

        # SUPPORT level
        if matched_keywords:
            return (
                f"I understand this involves {category.lower()}. "
                f"While this may not be an emergency, it's important to talk to "
                f"someone you trust about how you're feeling."
            )
        return (
            "I understand you're going through something difficult. "
            "It's good that you're reaching out. Talking to a trusted person can help."
        )

    def get_safety_plan(self, situation: str, concern_level: ConcernLevel) -> list[dict]:
        """Generate a safety plan based on the situation and concern level."""
        plan = [
            {
                "title": "Where can I go?",
                "content": self._get_safe_places(concern_level),
            },
            {
                "title": "Who can I contact?",
                "content": self._get_contacts_for_situation(concern_level),
            },
            {
                "title": "What can I say?",
                "content": self._get_phrases(concern_level),
            },
            {
                "title": "What should my next safe step be?",
                "content": self._get_next_steps(concern_level),
            },
            {
                "title": "Do I need immediate help?",
                "content": self._get_immediate_help(concern_level),
            },
        ]
        return plan

    def _get_safe_places(self, concern_level: ConcernLevel) -> str:
        if concern_level == ConcernLevel.IMMEDIATE:
            return (
                "Move to a public place with people around. Go to a nearby store, "
                "school office, hospital, or police station. If you can, go to a "
                "location where there are security cameras and other people present."
            )
        if concern_level == ConcernLevel.CONCERNING:
            return (
                "Stay in public, well-lit areas when possible. Know where nearby "
                "help points are (schools, hospitals, police stations). Avoid being "
                "alone with the person who concerns you."
            )
        return (
            "Stay in familiar, comfortable places. Spend time with friends or in "
            "public areas. Your home, a friend's house, or a school library are "
            "usually safe options."
        )

    def _get_contacts_for_situation(self, concern_level: ConcernLevel) -> str:
        if concern_level == ConcernLevel.IMMEDIATE:
            return (
                "Contact emergency services immediately. Then reach out to a parent, "
                "guardian, or trusted adult. If you can't reach them, call a crisis "
                "helpline or go to the nearest safe place."
            )
        if concern_level == ConcernLevel.CONCERNING:
            return (
                "Talk to a parent, guardian, teacher, or school counselor. "
                "You can also reach out to a trusted relative or a close friend's parent. "
                "You don't have to handle this alone."
            )
        return (
            "Consider talking to a friend, parent, teacher, or school counselor. "
            "Even small problems can feel lighter when you share them with someone you trust."
        )

    def _get_phrases(self, concern_level: ConcernLevel) -> str:
        if concern_level == ConcernLevel.IMMEDIATE:
            return (
                "\"I need help right now. I don't feel safe.\" "
                "\"Can you come get me? I'm at [location].\" "
                "\"Please call [emergency number] — I need help.\""
            )
        if concern_level == ConcernLevel.CONCERNING:
            return (
                "\"I need to talk to you about something that's been bothering me.\" "
                "\"Something is happening at school and I don't know what to do.\" "
                "\"Can you help me figure out what to do?\""
            )
        return (
            "\"I wanted to talk about something that's been on my mind.\" "
            "\"I've been feeling a bit down lately and wanted to talk.\" "
            "\"Can we chat? I need some advice about something.\""
        )

    def _get_next_steps(self, concern_level: ConcernLevel) -> str:
        if concern_level == ConcernLevel.IMMEDIATE:
            return (
                "1. Get to a safe, public location immediately.\n"
                "2. Call emergency services (or have someone call for you).\n"
                "3. Contact a trusted adult.\n"
                "4. Do not confront the person who is threatening you.\n"
                "5. If possible, share your live location with someone you trust."
            )
        if concern_level == ConcernLevel.CONCERNING:
            return (
                "1. Document what's happening (save messages, note dates/times).\n"
                "2. Talk to a trusted adult — parent, teacher, or counselor.\n"
                "3. Avoid being alone with the person causing concern.\n"
                "4. Stay in public or group settings when possible.\n"
                "5. Consider blocking or limiting contact with the person."
            )
        return (
            "1. Take some time to understand your own feelings about the situation.\n"
            "2. Talk to a friend or someone you trust.\n"
            "3. If the situation continues or worsens, reach out to a trusted adult.\n"
            "4. Remember: it's always okay to ask for help."
        )

    def _get_immediate_help(self, concern_level: ConcernLevel) -> str:
        if concern_level == ConcernLevel.IMMEDIATE:
            return (
                "YES — if you are in immediate danger, contact emergency services now. "
                "Your safety is more important than anything else. "
                "Use the SOS button in this app or call your local emergency number."
            )
        if concern_level == ConcernLevel.CONCERNING:
            return (
                "Not immediately, but this situation needs adult attention soon. "
                "If at any point you feel in immediate danger, use the SOS feature "
                "or contact emergency services."
            )
        return (
            "No — this doesn't appear to be an emergency. But if your situation "
            "changes or you start feeling unsafe, don't hesitate to reach out."
        )

    def generate_help_me_say_it(
        self, situation: str, audience: str = "trusted_adult"
    ) -> dict:
        """Generate a conversation starter for talking to a trusted adult."""
        classification = self.classify(situation)
        category = classification.category.lower()

        starters = {
            "trusted_adult": {
                "default": (
                    "I want to tell you about something that's been making me uncomfortable. "
                    "I'm not sure how to explain everything, but I really need your help."
                ),
                "bullying": (
                    "Someone at school has been treating me badly and it's been going on "
                    "for a while. I didn't know how to tell you, but I think I need your help."
                ),
                "harassment": (
                    "Something has been happening that makes me feel really uncomfortable, "
                    "and I don't know what to do about it. Can we talk about it?"
                ),
                "mental health": (
                    "Lately I've been feeling really overwhelmed and I don't know how to "
                    "handle it. I think I need someone to talk to about what I'm going through."
                ),
                "threats & violence": (
                    "I'm scared because someone has been threatening me. "
                    "I don't feel safe and I need your help right away."
                ),
                "social & friendship issues": (
                    "I've been having a hard time with some friendships at school, "
                    "and it's been really affecting me. Can we talk about it?"
                ),
                "family issues": (
                    "Things have been difficult at home lately and it's been hard for me. "
                    "I wanted to talk to you about it because I trust you."
                ),
            },
            "parent": {
                "default": (
                    "Mom/Dad, I need to talk to you about something important. "
                    "Something has been going on and I think I need your help with it."
                ),
            },
            "teacher": {
                "default": (
                    "I wanted to talk to you about something that's been happening at school. "
                    "I'm not sure what to do, and I thought you might be able to help."
                ),
            },
            "counselor": {
                "default": (
                    "I've been going through a difficult situation and I think I need "
                    "some support. Can we talk about what's been happening?"
                ),
            },
        }

        # Get the appropriate starter
        audience_starters = starters.get(audience, starters["trusted_adult"])
        if isinstance(audience_starters, dict):
            text_starter = audience_starters.get(category, audience_starters["default"])
        else:
            text_starter = audience_starters

        # Build tips based on concern level
        tips = self._get_say_it_tips(classification.concern_level)

        return {
            "conversation_starter": text_starter,
            "tips": tips,
        }

    def _get_say_it_tips(self, concern_level: ConcernLevel) -> list[str]:
        """Generate tips for the conversation."""
        base_tips = [
            "Find a quiet, private place to talk.",
            "It's okay to feel nervous — that's normal.",
            "You can start with just one sentence and take your time.",
            "If you get stuck, you can show them this conversation.",
            "It's okay to cry or feel emotional — that's part of it.",
        ]

        if concern_level == ConcernLevel.IMMEDIATE:
            return [
                "Find a safe, private place to talk.",
                "Be direct: \"I need help right now.\"",
                "Share as much detail as you can — it helps them understand.",
                "If they don't take you seriously at first, tell another trusted adult.",
                "Your safety is the most important thing.",
            ]
        if concern_level == ConcernLevel.CONCERNING:
            return base_tips + [
                "Try to give specific examples of what's been happening.",
                "Let them know how it's been affecting you.",
                "Ask them what they think you should do — you don't have to figure it out alone.",
            ]
        return base_tips + [
            "Remember: asking for help is a sign of strength, not weakness.",
            "If the first conversation doesn't go well, try again with someone else.",
        ]
