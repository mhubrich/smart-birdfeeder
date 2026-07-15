# -----------------------------------------------------------------------------
# Module: GeminiClient
# Purpose: Handles communication with Google's Gemini Flash API using the official SDK.
# -----------------------------------------------------------------------------

import os
import json
import logging
import time
from google import genai
from google.genai import types

class GeminiClient:
    """
    Client for interacting with the Gemini API using the official google-genai SDK.
    """

    def __init__(self, api_key):
        """
        Initialize the GeminiClient.

        Args:
            api_key (str): The Google Gemini API Key.
        """
        self.api_key = api_key
        # Using Gemini 3 Flash (Preview) for improved visual reasoning on low-quality streams
        self.client = genai.Client(api_key=self.api_key)
        self.model_id = "gemini-3-flash-preview"
        self.logger = logging.getLogger(__name__)

    def analyze_image(self, image_data, context=None):
        """
        Sends an image to Gemini for analysis.

        Args:
            image_data (str or bytes): Path to the image file OR raw image bytes.
            context (dict, optional): Metadata about the image (location, time, date, setting).

        Returns:
            dict: The JSON response with bird identification data or None if failed.
        """
        try:
            # We strictly expect bytes now to avoid Disk I/O overhead
            if not isinstance(image_data, bytes):
                self.logger.error("GeminiClient expected raw image bytes but received a different type.")
                return None
            
            image_bytes = image_data

            # Build context metadata
            ctx = context or {}
            
            # System instructions define the model's persona and core rules.
            # Structured as a robust negative-constraint power prompt for Gemini 3.
            system_instruction = (
                "You are a professional ornithologist and a highly precise visual classification system. "
                "Your objective is to analyze cropped image frames from an outdoor birdfeeder's RTSP security camera. "
                "You must strictly classify whether a bird is present and identify its species.\n\n"
                "CRITICAL CLASSIFICATION RULE:\n"
                "- You must distinguish real birds from non-bird subjects. Common false triggers include humans, hands, "
                "leaves, branches, rain, shadows, reflections, lens glare, and insects.\n"
                "- If the subject is a human, a hand, any other non-bird object, or simply empty background, you MUST classify it as:\n"
                "  is_bird: False\n"
                "  species: 'None'\n"
                "  confidence: 1.0\n"
                "  identification_reason: A brief description of the non-bird trigger observed (e.g., 'Human present near the feeder.').\n\n"
                "IDENTIFICATION GUIDELINES:\n"
                "- If a bird is definitely present, identify the species using location and seasonal context to narrow down candidates.\n"
                "- If you cannot determine the species due to severe motion blur or compression, do NOT guess or hallucinate. "
                "Instead, output is_bird: True, species: 'Unknown Bird', and a lower confidence value (e.g., 0.2 to 0.6).\n\n"
                "SPECIES LOOKALIKES & BIASES:\n"
                "- Blue Jay vs. Pigeon/Mourning Dove: Look for the crest, black collar, and blue plumage of the Blue Jay.\n"
                "- Song Sparrow vs. House Sparrow/House Finch/Dark-eyed Junco: Look for the streaked breast with a central chest spot of the Song Sparrow."
            )

            # Prompt content contains the specific image and situational context.
            # Written as an objective, non-leading query suited for Gemini 3 Flash.
            prompt = (
                "Perform a step-by-step visual evaluation of the provided image crop:\n"
                "1. Observe the shapes, colors, and textures in the image.\n"
                "2. Determine if the moving subject is a bird or a non-bird trigger (human, hand, reflections, shadow, rain, etc.).\n"
                "3. If a bird is present, identify its species.\n\n"
                f"Context Metadata:\n"
                f"- Location: {ctx.get('location', 'Unknown Location')}\n"
                f"- Date & Time: {ctx.get('date', 'Unknown Date')} at {ctx.get('time', 'Unknown Time')}\n"
                f"- Setting: {ctx.get('setting', 'Outdoor')}\n"
                "- Source: Cropped frame from RTSP security camera (expect compression and motion blur)."
            )

            # Response Schema ensures deterministic JSON output
            response_schema = {
                'type': 'OBJECT',
                'properties': {
                    'is_bird': {'type': 'BOOLEAN'},
                    'species': {
                        'type': 'STRING',
                        'description': 'Common name of the bird species (e.g., "American Robin"). If not a bird, return "None".'
                    },
                    'confidence': {
                        'type': 'NUMBER',
                        'description': 'Confidence level of the identification (0.0 to 1.0).'
                    },
                    'identification_reason': {
                        'type': 'STRING',
                        'description': 'A single concise sentence explaining the scientific reason for this identification or non-bird trigger. Max 20 words.'
                    }
                },
                'required': ['is_bird', 'species', 'confidence', 'identification_reason']
            }

            start_time = time.time()
            
            # Call Gemini with advanced configurations.
            # Temperature is set to 0.1 to maximize determinism and prevent hallucinations in classification.
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type='application/json',
                    response_schema=response_schema,
                    # Set to 0.1 for deterministic classification
                    temperature=0.1,
                    # Disable AFC
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                    # Relax safety settings to avoid false flagging of wildlife
                    safety_settings=[
                        types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
                    ]
                )
            )
            
            elapsed = time.time() - start_time
            tokens = response.usage_metadata.total_token_count if response.usage_metadata else "unknown"
            self.logger.info(f"Gemini API took {elapsed:.2f}s (Tokens: {tokens})")

            if not response or not response.text:
                self.logger.error("Gemini API returned an empty response")
                return None

            # Parse the response
            try:
                analysis = json.loads(response.text)
                return analysis
            except json.JSONDecodeError as e:
                self.logger.error(f"Failed to parse Gemini JSON: {e}. Raw: {response.text}")
                return None

        except Exception as e:
            self.logger.error(f"Gemini Client SDK Exception: {e}")
            return None
