"""AI Assistant API routes."""
from __future__ import annotations

import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    AIAnalyzeRequest,
    AIAnalyzeResponse,
    ChatRequest,
    ChatResponse,
    HelpMeSayItRequest,
    HelpMeSayItResponse,
    SafetyPlanRequest,
    SafetyPlan,
    SafetyPlanSection,
    RecommendedAction,
)
from app.services.safety_engine import SafetyEngine, ConcernLevel
from app.services.ai_service import AIService
from app.models import database

router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])

safety_engine = SafetyEngine()
ai_service = AIService()


@router.post("/analyze", response_model=AIAnalyzeResponse)
async def analyze_message(request: AIAnalyzeRequest):
    """
    Analyze a user message and return structured safety classification.
    
    This is the core endpoint that processes user input through the safety engine.
    """
    # Classify the message
    classification = safety_engine.classify(request.message)

    # Generate AI response
    ai_result = ai_service.generate_response(
        message=request.message,
        concern_level=classification.concern_level,
        category=classification.category,
        history=[{"role": m.role, "content": m.content} for m in request.history],
    )

    # Get recommended actions
    recommended_actions = ai_service.get_recommended_actions(classification.concern_level)

    # Determine feature flags
    show_sos = classification.concern_level in (ConcernLevel.CONCERNING, ConcernLevel.IMMEDIATE)
    show_location = classification.concern_level == ConcernLevel.IMMEDIATE
    show_safety_plan = classification.concern_level in (ConcernLevel.CONCERNING, ConcernLevel.IMMEDIATE)

    # Create or update conversation
    conversation_id = request.conversation_id or str(uuid.uuid4())

    return AIAnalyzeResponse(
        concern_level=classification.concern_level,
        category=classification.category,
        summary=classification.category_description,
        response_text=ai_result["response_text"],
        explanation=classification.explanation,
        recommended_actions=[
            RecommendedAction(**action) for action in recommended_actions
        ],
        show_sos=show_sos,
        show_location=show_location,
        show_safety_plan=show_safety_plan,
        conversation_id=conversation_id,
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Full chat endpoint that analyzes and responds in one call.
    """
    # Classify the message
    classification = safety_engine.classify(request.message)

    # Generate AI response
    ai_result = ai_service.generate_response(
        message=request.message,
        concern_level=classification.concern_level,
        category=classification.category,
        history=[{"role": m.role, "content": m.content} for m in request.history],
    )

    # Get recommended actions
    recommended_actions = ai_service.get_recommended_actions(classification.concern_level)

    # Determine feature flags
    show_sos = classification.concern_level in (ConcernLevel.CONCERNING, ConcernLevel.IMMEDIATE)
    show_location = classification.concern_level == ConcernLevel.IMMEDIATE
    show_safety_plan = classification.concern_level in (ConcernLevel.CONCERNING, ConcernLevel.IMMEDIATE)

    conversation_id = request.conversation_id or str(uuid.uuid4())

    analysis = AIAnalyzeResponse(
        concern_level=classification.concern_level,
        category=classification.category,
        summary=classification.category_description,
        response_text=ai_result["response_text"],
        explanation=classification.explanation,
        recommended_actions=[
            RecommendedAction(**action) for action in recommended_actions
        ],
        show_sos=show_sos,
        show_location=show_location,
        show_safety_plan=show_safety_plan,
        conversation_id=conversation_id,
    )

    return ChatResponse(
        reply=ai_result["response_text"],
        analysis=analysis,
    )


@router.post("/help-me-say-it", response_model=HelpMeSayItResponse)
async def help_me_say_it(request: HelpMeSayItRequest):
    """
    Generate a conversation starter for talking to a trusted adult.
    """
    result = safety_engine.generate_help_me_say_it(
        situation=request.situation,
        audience=request.audience or "trusted_adult",
    )

    return HelpMeSayItResponse(
        conversation_starter=result["conversation_starter"],
        tips=result["tips"],
    )


@router.post("/safety-plan", response_model=SafetyPlan)
async def create_safety_plan(request: SafetyPlanRequest):
    """
    Generate a personalized safety plan based on the situation.
    """
    # Classify if concern level not provided
    if request.concern_level:
        concern_level = request.concern_level
    else:
        classification = safety_engine.classify(request.situation)
        concern_level = classification.concern_level

    # Generate plan sections
    plan_sections = safety_engine.get_safety_plan(request.situation, concern_level)

    sections = [
        SafetyPlanSection(title=s["title"], content=s["content"])
        for s in plan_sections
    ]

    return SafetyPlan(
        plan_id=str(uuid.uuid4()),
        situation_summary=request.situation[:200],
        sections=sections,
        created_at=datetime.utcnow(),
    )
