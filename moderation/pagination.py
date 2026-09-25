from rest_framework.pagination import PageNumberPagination


# ============================================================
# MODERATION CASE PAGINATION
# ============================================================


class ModerationCasePagination(
    PageNumberPagination,
):

    # --------------------------------------------------------
    # Default page size
    # --------------------------------------------------------

    page_size = 10

    # --------------------------------------------------------
    # Allow frontend to request a custom page size.
    #
    # Example:
    # ?page=2&page_size=20
    # --------------------------------------------------------

    page_size_query_param = "page_size"

    # --------------------------------------------------------
    # Maximum allowed page size
    # --------------------------------------------------------

    max_page_size = 50

    # --------------------------------------------------------
    # Page query parameter
    #
    # Example:
    # ?page=2
    # --------------------------------------------------------

    page_query_param = "page"
