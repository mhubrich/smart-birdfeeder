# -----------------------------------------------------------------------------
# Module: SunTracker
# Purpose: Calculates sunrise and sunset times to determine daylight hours.
#          Manages caching to avoid redundant calculations.
# -----------------------------------------------------------------------------

import datetime
from suntime import Sun
import logging
import os

class SunTracker:
    """
    Manages sun position calculations to determine if the vision service
    should be active (daylight) or sleeping (night).
    """

    def __init__(self, lat=None, lng=None):
        """
        Initialize the SunTracker.

        Args:
            lat (float, optional): Latitude. Defaults to env var LOCATION_LAT or 40.7128 (NYC).
            lng (float, optional): Longitude. Defaults to env var LOCATION_LNG or -74.0060 (NYC).
        """
        self.logger = logging.getLogger(__name__)
        
        # Load location from environment if not provided
        self.lat = lat if lat is not None else float(os.getenv("LOCATION_LAT", 40.7128))
        self.lng = lng if lng is not None else float(os.getenv("LOCATION_LNG", -74.0060))
        
        self.sun = Sun(self.lat, self.lng)
        
        # Cache structure to store calculated times for the current day
        self.cache = {
            "date": None,
            "sunrise": None,
            "sunset": None,
            "tomorrow_sunrise": None
        }

    def check_daylight(self):
        """
        Checks if it is currently daylight at the configured location.
        Updates the internal cache if the date has changed.

        Returns:
            tuple: (bool is_daylight, float seconds_until_next_event)
                - is_daylight: True if currently between sunrise and sunset.
                - seconds_until_next_event: Seconds until sunrise (if night) or 0 (if day).
        """
        now = datetime.datetime.now().astimezone()
        today = now.date()

        try:
            # Refresh cache if it's a new day or first run
            if self.cache["date"] != today:
                self._update_cache(now, today)

            sunrise = self.cache["sunrise"]
            sunset = self.cache["sunset"]

            # Edge case handling: Polar day/night or error in calculation
            # If sunrise >= sunset, it's ambiguous, so we default to "Daylight" (True) for safety.
            if sunrise >= sunset:
                return True, 0

            # Check if we are currently within daylight hours
            if sunrise < now < sunset:
                return True, 0

            # If not daylight, calculate time until next sunrise
            if now < sunrise:
                # Early morning, before today's sunrise
                sleep_sec = (sunrise - now).total_seconds()
            else:
                # Evening, after today's sunset. Wait for tomorrow's sunrise.
                next_sunrise = self.cache["tomorrow_sunrise"]
                sleep_sec = (next_sunrise - now).total_seconds()

            return False, max(0, sleep_sec)

        except Exception as e:
            self.logger.warning(f"Suntime calculation failed: {e}. Defaulting to True (Daylight).")
            return True, 0

    def _update_cache(self, now, today):
        """
        Calculates and caches sunrise/sunset times for the given date.
        
        Args:
            now (datetime): Current localized datetime.
            today (date): Current date.
        """
        # sun.get_sunrise_time returns a UTC datetime. 
        # .astimezone() converts it to the local system time zone.
        sunrise = self.sun.get_sunrise_time(at_date=now).astimezone()
        sunset = self.sun.get_sunset_time(at_date=now).astimezone()

        # Pre-calc tomorrow's sunrise for the evening sleep cycle
        tomorrow_dt = now + datetime.timedelta(days=1)
        tomorrow_sunrise = self.sun.get_sunrise_time(at_date=tomorrow_dt).astimezone()

        self.cache["sunrise"] = sunrise
        self.cache["sunset"] = sunset
        self.cache["tomorrow_sunrise"] = tomorrow_sunrise
        self.cache["date"] = today
        
        fmt = "%I:%M %p"
        self.logger.info(
            f"Sun times updated for {today}: "
            f"Sunrise {sunrise.strftime(fmt)}, Sunset {sunset.strftime(fmt)}"
        )
