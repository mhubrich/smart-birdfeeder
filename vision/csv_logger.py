# -----------------------------------------------------------------------------
# Module: CSVLogger
# Purpose: Provides a custom Logging Handler to write vision events to a CSV file.
# -----------------------------------------------------------------------------

import logging
import csv
import os
import datetime

class CSVHandler(logging.Handler):
    """
    A custom logging handler that formats log records as CSV rows and appends them to a file.
    """

    def __init__(self, filename):
        """
        Initializes the CSVHandler.

        Args:
            filename (str): The absolute or relative path to the CSV log file.
        """
        super().__init__()
        self.filename = filename
        
        # Ensure the directory exists
        os.makedirs(os.path.dirname(self.filename), exist_ok=True)
        
        # Write the header row if the file is being created for the first time
        if not os.path.exists(self.filename):
            with open(self.filename, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['timestamp', 'level', 'module', 'message'])

    def emit(self, record):
        """
        Processes a single log record and writes it to the CSV file.

        Args:
            record (logging.LogRecord): The log record to be emitted.
        """
        try:
            timestamp = datetime.datetime.fromtimestamp(record.created).isoformat()
            
            # We use a simple CSV writer to handle escaping of commas or quotes in the message
            with open(self.filename, 'a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([
                    timestamp,
                    record.levelname,
                    record.name,
                    record.getMessage()
                ])
        except Exception:
            self.handleError(record)
