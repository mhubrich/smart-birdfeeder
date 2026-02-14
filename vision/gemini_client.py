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

    def analyze_image(self, image_path, context=None):
        """
        Sends an image to Gemini for analysis.

        Args:
            image_path (str): Path to the image file.
            context (dict, optional): Metadata about the image (location, time, date, setting).

        Returns:
            dict: The JSON response with bird identification data or None if failed.
        """
        try:
            if not os.path.exists(image_path):
                self.logger.error(f"Image not found: {image_path}")
                return None

            with open(image_path, "rb") as f:
                image_bytes = f.read()

            # Build context string
            ctx = context or {}
            location = ctx.get("location", "Unknown Location")
            time_str = ctx.get("time", "Unknown Time")
            date_str = ctx.get("date", "Unknown Date")
            setting = ctx.get("setting", "Outdoor")
            
            prompt = (
                "You are an expert ornithologist and avian biologist. "
                "Analyze the provided image with high precision. "
                "Your goal is to identify if a bird is present and determine its species. "
                "\n\n"
                "CONTEXT:\n"
                f"- Location: {location}\n"
                f"- Date & Time: {date_str} at {time_str}\n"
                f"- Setting: {setting}\n"
                "- Image Source: Cropped frame from a low-quality RTSP security camera (expect motion blur/compression).\n"
                "\n\n"
                "GUIDELINES:\n"
                "- Use the provided location and date to filter for species likely to be present in this region and season.\n"
                "- Focus on key identifiers: beak shape, plumage patterns, coloration, and silhouette.\n"
                "- Distinguish birds from common lookalikes (leaves, shadows, rain, snow, insects).\n"
                "- If the image is blurry, use your expert knowledge to infer the species from visible traits.\n"
                "- If multiple species are present, identify the most dominant subject.\n"
                "\n\n"
                "RESPONSE FORMAT:\n"
                "Return a single valid JSON object strictly following this schema:\n"
                "{ \n"
                "  \"is_bird\": boolean, \n"
                "  \"species\": \"Common Name\" (or \"unknown\" if not a bird), \n"
                "  \"confidence\": float (0.0 to 1.0), \n"
                "  \"identification_reason\": \"A concise, one-sentence scientific explanation of the key features used for ID, referencing the location/season if relevant.\" \n"
                "}"
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
