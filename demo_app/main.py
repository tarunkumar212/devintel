import os
import sys
import time

import requests


DEVINTEL_URL = "http://127.0.0.1:8000/logs"
APPLICATION_ID = int(
    os.getenv("DEVINTEL_APPLICATION_ID", "1") # we can give the application ID in the terminal while running to send logs to that application.
)


def send_log(level, message):
    response = requests.post(
        DEVINTEL_URL,
        json={
            "application_id": APPLICATION_ID,
            "level": level,
            "message": message,
        },
        timeout=5,
    )

    response.raise_for_status()


def run_normal_mode():
    print("Demo app running in NORMAL mode")

    while True:
        send_log(
            "INFO",
            "Demo application request completed successfully",
        )

        time.sleep(2)


def run_failure_mode():
    print("Demo app running in FAILURE mode")

    while True:
        send_log(
            "ERROR",
            "Demo application database timeout",
        )

        time.sleep(2)


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "normal"

    if mode == "normal":
        run_normal_mode()

    elif mode == "failure":
        run_failure_mode()

    else:
        print("Usage:")
        print("python demo_app/main.py normal")
        print("python demo_app/main.py failure")