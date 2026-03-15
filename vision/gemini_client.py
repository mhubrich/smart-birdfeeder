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
        # Using Gemini 2.5 Flash for speed and cost efficiency
        self.client = genai.Client(api_key=self.api_key)
        self.model_id = "gemini-2.5-flash"
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
            
            # System instructions define the model's persona and core rules
            system_instruction = (
                "You are an expert ornithologist and avian biologist. "
                "Analyze images from low-quality RTSP streams to identify bird species with high precision. "
                "Use the provided location and date context to filter for species likely to be present. "
                "Distinguish birds from common lookalikes (leaves, shadows, insects, humans). "
                "If identification is uncertain, provide the most likely species based on visible traits."
            )

            # Prompt content contains the specific image and situational context
            prompt = (
                f"- Location: {ctx.get('location', 'Unknown Location')}\n"
                f"- Date & Time: {ctx.get('date', 'Unknown Date')} at {ctx.get('time', 'Unknown Time')}\n"
                f"- Setting: {ctx.get('setting', 'Outdoor')}\n"
                "- Image Source: Cropped frame from a low-quality RTSP security camera (expect motion blur and compression).\n\n"
                "Analyze the bird in this image and determine its species."
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
                        'description': 'A single concise sentence explaining the scientific reason for this identification. Max 20 words.'
                    }
                },
                'required': ['is_bird', 'species', 'confidence', 'identification_reason']
            }

            start_time = time.time()
            
            # Call Gemini with advanced configurations
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
                    # Deterministic output for classification
                    temperature=1.0,
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
