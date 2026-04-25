from django.apps import AppConfig
import threading
import time


class LiveConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'live'

    def ready(self):
        from .utils.cleanup import cleanup_dead_streams

        def run_cleanup():
            while True:
                try:
                    cleanup_dead_streams()
                except Exception as e:
                    print("Cleanup error:", e)

                time.sleep(60)  # har 1 min check

        thread = threading.Thread(target=run_cleanup, daemon=True)
        thread.start()