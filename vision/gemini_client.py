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

    def analyze_image(self, image_path):
        """
        Sends an image to Gemini for analysis.

        Args:
            image_path (str): Path to the image file.

        Returns:
            dict: The JSON response with bird identification data or None if failed.
        """
        try:
            if not os.path.exists(image_path):
                self.logger.error(f"Image not found: {image_path}")
                return None

            with open(image_path, "rb") as f:
                image_bytes = f.read()

            prompt = (
                "You are an expert ornithologist. Analyze this image. "
                "Return a JSON object: { \"is_bird\": boolean, \"species\": string, \"identification_reason\": \"short sentence\" }. "
                "If it is not a bird, set is_bird to false and species to 'unknown'."
            )

            start_time = time.time()
            
            # Using the official SDK
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=[
                    prompt,
                    types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
                ],
                config=types.GenerateContentConfig(
                    response_mime_type='application/json'
                )
            )
            
            elapsed = time.time() - start_time
            self.logger.info(f"Gemini API (SDK) took {elapsed:.2f}s")

            if not response or not response.text:
                self.logger.error("Gemini API returned an empty response")
                return None

            # Parse the response
            try:
                # The SDK with response_mime_type='application/json' should return valid JSON text
                analysis = json.loads(response.text)
                return analysis
            except json.JSONDecodeError as e:
                self.logger.error(f"Failed to parse Gemini JSON: {e}. Raw: {response.text}")
                return None

        except Exception as e:
            self.logger.error(f"Gemini Client SDK Exception: {e}")
            return None
