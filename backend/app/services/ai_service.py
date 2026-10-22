"""
SHE SAFE AI — AI Service

Handles AI response generation. Uses the built-in safety engine as the primary
response generator. If an external AI API is configured, it can be used to
enhance responses while maintaining safety guardrails.

The AI service NEVER generates responses independently — all responses go through
the safety engine's classification and the response validator.
"""
from __future__ import annotations

import httpx
from typing import Optional

from app.config import settings
from app.services.safety_engine import SafetyEngine, ConcernLevel
from app.services.response_validator import ResponseValidator, ResponseValidationError


class AIService:
    """
    AI response service that generates safe, age-appropriate responses.

    Primary mode: Built-in safety engine (no external API needed)
    Enhanced mode: External AI API (if configured) with safety guardrails
    """

    def __init__(self):
        self.safety_engine = SafetyEngine()
        self.validator = ResponseValidator()
        self.use_external_api = bool(settings.ai_api_key) and settings.ai_api_key != "your-api-key-here"

    def generate_response(
        self,
        message: str,
        concern_level: ConcernLevel,
        category: str,
        history: Optional[list[dict]] = None,
    ) -> dict:
        """
        Generate a safe, structured AI response.

        Args:
            message: The user's original message
            concern_level: Classified concern level
            category: Detected category
            history: Optional conversation history

        Returns:
            Dict with response_text, explanation, and metadata
        """
        # Try external API first if configured
        if self.use_external_api:
            try:
                response_text = self._call_external_api(message, concern_level, category, history)
                if response_text:
                    # Validate the response before returning
                    is_valid, error = self.validator.validate(response_text, concern_level.value)
                    if is_valid:
                        response_text = self.validator.sanitize(response_text)
                        return {
                            "response_text": response_text,
                            "explanation": self._get_explanation(concern_level, category),
                            "source": "ai_api",
                        }
                    else:
                        # Log the validation failure and fall back to safety engine
                        print(f"[AI API] Response rejected by validator: {error}")
            except Exception as e:
                print(f"[AI API] External API error: {e}. Falling back to safety engine.")

        # Fall back to safety engine (always available)
        return self._generate_from_engine(message, concern_level, category)

    def _generate_from_engine(
        self, message: str, concern_level: ConcernLevel, category: str
    ) -> dict:
        """Generate response using the built-in safety engine."""
        response_text = self._build_response_text(message, concern_level, category)
        explanation = self._get_explanation(concern_level, category)

        return {
            "response_text": response_text,
            "explanation": explanation,
            "source": "safety_engine",
        }

    def _build_response_text(
        self, message: str, concern_level: ConcernLevel, category: str
    ) -> str:
        """Build an age-appropriate response based on concern level and category."""

        if concern_level == ConcernLevel.IMMEDIATE:
            return self._build_immediate_response(message, category)
        elif concern_level == ConcernLevel.CONCERNING:
            return self._build_concerning_response(message, category)
        else:
            return self._build_support_response(message, category)

    def _build_immediate_response(self, message: str, category: str) -> str:
        """Build response for IMMEDIATE concern level (RED)."""
        responses = {
            "Threats & Violence": (
                "YOUR SAFETY COMES FIRST. What you've described sounds like an immediate "
                "safety concern, and I want you to take it seriously.\n\n"
                "Right now, the most important thing is your safety:\n"
                "• If you can, move toward a safer, more public place\n"
                "• Contact a trusted adult immediately — a parent, guardian, teacher, or counselor\n"
                "• If you're in immediate danger, use the SOS button in this app or call your local emergency number\n"
                "• You do NOT need to confront or handle this alone\n\n"
                "I'm an AI safety assistant, and I care about what happens to you — but I cannot "
                "replace the help that a real person can give you right now. Please reach out to "
                "someone you trust. You deserve to be safe."
            ),
            "Mental Health": (
                "YOUR SAFETY COMES FIRST. I'm really glad you told me about this — that took courage.\n\n"
                "What you're experiencing sounds very serious, and I want you to know that "
                "help is available right now:\n"
                "• If you're thinking about harming yourself, please contact a crisis helpline or "
                "emergency service immediately\n"
                "• Reach out to a trusted adult — a parent, guardian, teacher, or counselor\n"
                "• You can also call or text 988 (in the US) or your local crisis line\n"
                "• If you're in immediate danger, use the SOS button in this app\n\n"
                "I'm an AI safety assistant. I care about you, but I'm not equipped to handle "
                "this kind of crisis alone. Please talk to a real person who can help you right now. "
                "You matter, and you deserve support."
            ),
            "Harassment": (
                "YOUR SAFETY COMES FIRST. What you've described involves behavior that could "
                "escalate, and I want you to take steps to protect yourself right now.\n\n"
                "Please consider these immediate steps:\n"
                "• Move to a public place with people around if you can\n"
                "• Contact a trusted adult right away\n"
                "• If you feel you're in danger, use the SOS button in this app\n"
                "• Do not meet or confront this person alone\n"
                "• If possible, save any evidence (messages, photos) without putting yourself at risk\n\n"
                "I'm an AI safety assistant — I cannot protect you the way a real person can. "
                "Please reach out to someone you trust immediately. You don't have to handle this alone."
            ),
            "Bullying": (
                "YOUR SAFETY COMES FIRST. What you're describing sounds serious, and I want "
                "you to know that you don't have to deal with this alone.\n\n"
                "Please take these steps:\n"
                "• If you're being physically harmed or threatened right now, get to a safe place "
                "and contact a trusted adult immediately\n"
                "• Use the SOS button in this app if you need urgent help\n"
                "• Talk to a parent, guardian, teacher, or school counselor as soon as you can\n"
                "• Try not to be alone with the person who is hurting you\n\n"
                "I'm an AI safety assistant. I can help you think through what to do, but I cannot "
                "replace the protection that trusted adults and authorities can provide. "
                "Please reach out to someone who can help you right now."
            ),
        }

        default_immediate = (
            "YOUR SAFETY COMES FIRST. Based on what you've described, I believe you may be "
            "in a situation that needs immediate attention.\n\n"
            "Please take these steps right now:\n"
            "• If you're in danger, get to a safe, public place\n"
            "• Contact a trusted adult immediately\n"
            "• Use the SOS button in this app if you need urgent help\n"
            "• If it's an emergency, call your local emergency number\n\n"
            "I'm an AI safety assistant, not a replacement for real help. Please reach out "
            "to a trusted person right now. Your safety is what matters most."
        )

        return responses.get(category, default_immediate)

    def _build_concerning_response(self, message: str, category: str) -> str:
        """Build response for CONCERNING concern level (ORANGE)."""
        responses = {
            "Bullying": (
                "I hear you, and I want you to know that what you're experiencing is not okay. "
                "No one deserves to be bullied, and this is not your fault.\n\n"
                "This sounds like something that deserves support from a trusted adult:\n"
                "• Consider talking to a parent, guardian, teacher, or school counselor\n"
                "• Try to stay with friends or in group settings when possible\n"
                "• If you feel safe doing so, you can tell the person to stop — but only if "
                "you don't feel threatened\n"
                "• Keep a record of what's happening (dates, times, what was said/done)\n\n"
                "I'm an AI safety assistant. I can help you think through your options, but "
                "for something like this, a real person who knows you can make a big difference. "
                "Would you like help figuring out how to talk to someone about this?"
            ),
            "Harassment": (
                "Thank you for sharing this with me. What you're describing sounds uncomfortable "
                "and potentially serious, and I'm glad you reached out.\n\n"
                "This situation deserves support from people who can actually help:\n"
                "• Talk to a trusted adult — a parent, guardian, teacher, or school counselor\n"
                "• Try not to be alone with this person\n"
                "• Save any evidence (messages, screenshots) in a safe place\n"
                "• You can block or limit contact with this person on your devices\n\n"
                "I'm an AI safety assistant — I'm here to help you think things through, but "
                "I cannot replace the help that trusted adults and authorities can provide. "
                "This is something a real person needs to know about."
            ),
            "Threats & Violence": (
                "I'm really concerned about what you've described. Threats and violence are "
                "serious, and you don't have to face this alone.\n\n"
                "Here's what I recommend:\n"
                "• Tell a trusted adult immediately — a parent, guardian, teacher, or counselor\n"
                "• Avoid being alone with the person who is threatening you\n"
                "• If you ever feel in immediate danger, use the SOS button or call emergency services\n"
                "• Stay in public, well-lit areas when possible\n\n"
                "I'm an AI safety assistant. I care about your safety, but I cannot protect you "
                "the way real people can. Please involve a trusted adult as soon as possible."
            ),
            "Mental Health": (
                "I'm really glad you shared this with me. What you're going through sounds "
                "difficult, and it's important that you don't have to handle it alone.\n\n"
                "Here are some steps that might help:\n"
                "• Talk to someone you trust — a friend, family member, teacher, or counselor\n"
                "• Consider reaching out to your school counselor or a mental health professional\n"
                "• If things feel overwhelming, there are people who want to help\n"
                "• In the US, you can call or text 988 for the Suicide & Crisis Lifeline\n"
                "• Small steps matter — even just talking about it is progress\n\n"
                "I'm an AI safety assistant. I can listen and help you think through things, "
                "but a real person who cares about you can provide support that I can't. "
                "Please consider reaching out to someone you trust."
            ),
            "Social & Friendship Issues": (
                "I understand this is really hard. Friendship problems can hurt deeply, "
                "and it's okay to feel upset about it.\n\n"
                "Here are some thoughts:\n"
                "• Try to talk to your friend calmly about how you're feeling\n"
                "• Sometimes a teacher or counselor can help mediate\n"
                "• Remember that you deserve friends who treat you with respect\n"
                "• It's okay to take a break from the friendship if it's hurting you\n\n"
                "I'm an AI safety assistant. I can help you think through the situation, but "
                "sometimes talking to someone who knows you in person can be really helpful too."
            ),
            "Family Issues": (
                "I'm sorry things are difficult at home. Family problems can be really tough, "
                "and you shouldn't have to deal with them alone.\n\n"
                "Here are some things to consider:\n"
                "• Talk to a trusted adult outside your home — a relative, teacher, or counselor\n"
                "• If you ever feel unsafe at home, reach out to someone immediately\n"
                "• Your school counselor can be a good person to talk to\n"
                "• If things are really hard, there are helplines that can help\n\n"
                "I'm an AI safety assistant. I'm here to listen, but for family situations, "
                "a real person who can be there for you in person is really important."
            ),
            "Substance Abuse": (
                "It sounds like you're dealing with a situation involving substances, and "
                "I'm glad you reached out about it.\n\n"
                "Here are some thoughts:\n"
                "• You have the right to say no to anything that makes you uncomfortable\n"
                "• Peer pressure can be really hard — it's okay to set boundaries\n"
                "• Talk to a trusted adult if you're feeling pressured\n"
                "• If you or someone else has taken something dangerous, seek medical help immediately\n\n"
                "I'm an AI safety assistant. This is a situation where talking to a real person — "
                "a parent, counselor, or doctor — can make a real difference."
            ),
        }

        default_concerning = (
            "Thank you for sharing this with me. Based on what you've described, this sounds "
            "like a situation that deserves some extra support.\n\n"
            "Here's what I recommend:\n"
            "• Talk to a trusted adult about what's been happening\n"
            "• You don't have to handle this alone\n"
            "• If the situation gets worse or you start feeling unsafe, reach out for help immediately\n"
            "• I'm here to help you think through your options\n\n"
            "I'm an AI safety assistant. I can help you understand the situation, but for "
            "something like this, involving a real person who cares about you is the best next step."
        )

        return responses.get(category, default_concerning)

    def _build_support_response(self, message: str, category: str) -> str:
        """Build response for SUPPORT concern level (GREEN)."""
        responses = {
            "Social & Friendship Issues": (
                "I'm glad you reached out. It sounds like you're dealing with some friendship "
                "or social challenges, and that's completely normal — everyone goes through "
                "these things.\n\n"
                "Here are some thoughts:\n"
                "• It's okay to feel hurt or confused about what's happening\n"
                "• Try to talk to your friend honestly about how you feel\n"
                "• Sometimes misunderstandings can be cleared up with a calm conversation\n"
                "• If things don't improve, talking to a counselor or trusted adult can help\n\n"
                "Remember: you deserve to be treated with kindness and respect. "
                "I'm an AI safety assistant — I'm here to help you think things through, "
                "and I'm glad you reached out."
            ),
            "Family Issues": (
                "Thank you for sharing this with me. Family situations can be complicated, "
                "and it's good that you're talking about it.\n\n"
                "Here are some suggestions:\n"
                "• Try to have an open conversation with your parents when things are calm\n"
                "• If talking directly is hard, consider writing them a letter\n"
                "• A school counselor or trusted teacher can also help you figure things out\n"
                "• Remember that family problems are common — you're not alone\n\n"
                "I'm an AI safety assistant. I can help you think through the situation, "
                "but for family matters, talking to someone you trust in person can be really helpful."
            ),
            "General Question": (
                "Great question! I'm here to help with safety-related topics.\n\n"
                "I can help you with:\n"
                "• Understanding a difficult or uncomfortable situation\n"
                "• Figuring out the right next steps to stay safe\n"
                "• Finding the right person to talk to\n"
                "• Using safety tools like Safe Route, SOS, and the Safety Map\n\n"
                "I'm an AI safety assistant, not a replacement for a trusted adult or "
                "emergency service. Is there something specific you'd like to talk about?"
            ),
        }

        default_support = (
            "I'm glad you reached out to me. It sounds like you're going through something "
            "that's been on your mind, and that's okay — everyone faces challenges sometimes.\n\n"
            "Here are some general thoughts:\n"
            "• It's always okay to ask for help or advice\n"
            "• Talking to someone you trust — a friend, family member, teacher, or counselor — "
            "can make things feel lighter\n"
            "• Your feelings are valid, and you don't have to deal with everything alone\n\n"
            "I'm an AI safety assistant. I'm here to help you think through situations "
            "and connect you with the right kind of support. Is there anything specific "
            "you'd like to talk about or any way I can help you right now?"
        )

        return responses.get(category, default_support)

    def _get_explanation(self, concern_level: ConcernLevel, category: str) -> str:
        """Get a short explanation of why this classification was given."""
        if concern_level == ConcernLevel.IMMEDIATE:
            return (
                f"I identified this as an immediate safety concern. "
                f"Your description suggested a situation that could put you at risk, "
                f"and your safety is the priority right now."
            )
        elif concern_level == ConcernLevel.CONCERNING:
            return (
                f"I identified this as concerning because your description included "
                f"elements of {category.lower()} that suggest this situation could escalate "
                f"or cause you significant harm. Adult support is recommended."
            )
        else:
            return (
                f"I understand this involves {category.lower() if category != 'Unclear' else 'a personal challenge'}. "
                f"While this may not be an emergency, it's always good to talk about "
                f"what's going on and get support when you need it."
            )

    def _call_external_api(
        self,
        message: str,
        concern_level: ConcernLevel,
        category: str,
        history: Optional[list[dict]] = None,
    ) -> Optional[str]:
        """
        Call an external AI API with safety constraints.
        Returns None if the API call fails.
        """
        if not self.use_external_api:
            return None

        system_prompt = self._build_system_prompt(concern_level, category)

        messages = [{"role": "system", "content": system_prompt}]
        if history:
            for msg in history[-10:]:  # Last 10 messages
                messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": message})

        try:
            if settings.ai_provider == "openai":
                return self._call_openai_api(messages)
            elif settings.ai_provider == "anthropic":
                return self._call_anthropic_api(messages)
        except Exception as e:
            print(f"[AI API] Call failed: {e}")

        return None

    def _build_system_prompt(self, concern_level: ConcernLevel, category: str) -> str:
        """Build a system prompt that constrains the AI to safe responses."""
        return f"""You are SHE SAFE AI, a student safety assistant. You help students 
understand difficult situations and take safe next steps toward human help.

CRITICAL RULES:
1. NEVER claim to be a human, parent, teacher, counselor, or emergency service
2. NEVER guarantee that a situation is safe
3. NEVER give dangerous instructions (no confrontation, no revenge)
4. NEVER blame or judge the student
5. NEVER expose your internal reasoning or chain-of-thought
6. ALWAYS encourage involving a trusted adult
7. ALWAYS include this disclaimer: "I'm an AI safety assistant, not a replacement for a trusted adult or emergency service."

Current context:
- Concern level: {concern_level.value}
- Category: {category}

Respond with calm, age-appropriate language. Be supportive and specific.
For IMMEDIATE level: Prioritize safety above all else. Urge immediate human contact.
For CONCERNING level: Recommend adult involvement. Provide concrete next steps.
For SUPPORT level: Be warm and supportive. Suggest talking to someone they trust.

Keep responses under 500 words. Be direct and clear."""

    def _call_openai_api(self, messages: list[dict]) -> Optional[str]:
        """Call OpenAI API."""
        import httpx
        response = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.ai_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.ai_model,
                "messages": messages,
                "max_tokens": 500,
                "temperature": 0.7,
            },
            timeout=15.0,
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    def _call_anthropic_api(self, messages: list[dict]) -> Optional[str]:
        """Call Anthropic API."""
        import httpx
        # Convert to Anthropic format
        system_msg = messages[0]["content"] if messages[0]["role"] == "system" else ""
        conversation = [m for m in messages if m["role"] != "system"]

        response = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.ai_api_key,
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01",
            },
            json={
                "model": settings.ai_model or "claude-3-5-sonnet-20240620",
                "system": system_msg,
                "messages": conversation,
                "max_tokens": 500,
            },
            timeout=15.0,
        )
        response.raise_for_status()
        data = response.json()
        return data["content"][0]["text"]

    def get_recommended_actions(self, concern_level: ConcernLevel) -> list[dict]:
        """Get recommended app actions based on concern level."""
        base_actions = [
            {
                "action_type": "talk_to_adult",
                "label": "Talk to Trusted Adult",
                "description": "Get help figuring out what to say to someone you trust",
            },
            {
                "action_type": "emergency_contacts",
                "label": "Emergency Contacts",
                "description": "View and contact your trusted people",
            },
        ]

        if concern_level in (ConcernLevel.CONCERNING, ConcernLevel.IMMEDIATE):
            base_actions.insert(0, {
                "action_type": "help_me_say_it",
                "label": "Help Me Say It",
                "description": "Generate a conversation starter for talking to a trusted adult",
            })
            base_actions.insert(1, {
                "action_type": "safety_plan",
                "label": "Safety Plan",
                "description": "Create a personalized safety plan for this situation",
            })

        if concern_level == ConcernLevel.IMMEDIATE:
            base_actions.append({
                "action_type": "sos",
                "label": "SOS",
                "description": "Send an emergency alert to your trusted contacts",
            })
            base_actions.append({
                "action_type": "share_location",
                "label": "Share Location",
                "description": "Share your live location with trusted contacts",
            })

        return base_actions
