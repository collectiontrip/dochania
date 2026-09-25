
from urllib.parse import urlparse

from django.conf import settings

from djoser.email import ActivationEmail


class CustomActivationEmail(ActivationEmail):
    """
    Custom Djoser activation email.

    Uses the custom activation template and generates the
    activation URL from FRONTEND_URL instead of the Django
    Sites domain.
    """

    template_name = "email/activation.html"

    def get_context_data(self):
        """
        Build the activation email context using FRONTEND_URL.
        """

        context = super().get_context_data()

        frontend_url = settings.FRONTEND_URL.rstrip("/")

        parsed_url = urlparse(frontend_url)

        context["frontend_url"] = frontend_url
        context["protocol"] = parsed_url.scheme
        context["domain"] = parsed_url.netloc

        return context
