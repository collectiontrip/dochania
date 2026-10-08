import re

from .normalizer import (
    normalize_message,
)

from .profanity import (
    ALL_PROFANITY_WORDS,
    ALL_GENERAL_INSULT_WORDS,
)


# ============================================================
# REGEX HELPERS
# ============================================================

WORD_BOUNDARY_PATTERN = re.compile(
    r"(?<!\w){word}(?!\w)",
    re.IGNORECASE,
)


# ============================================================
# PROFANITY ROOTS
# ============================================================

PROFANITY_ROOTS = {
    # Chut family
    "chut",

    # Chod family
    "chod",

    # Chud family
    "chud",

    # Bhosdi / bosdi family
    "bhosd",
    "bosd",

    # Gand family
    "gand",
    "gaand",

    # Lund / laand / loda family
    "lund",
    "laand",
    "land",
    "loda",
    "lode",
    "lodu",
    "lodi",

    # Madarchod family
    "madarchod",
    "madarchut",

    # Behenchod family
    "behenchod",
    "bhenchod",

    # Randi family
    "randi",
    "rand",

    # Gandmar family
    "gandmar",
    "gaandmar",

    # Jhant family
    "jhant",

    # Nunnu family
    "nunnu",

    # Bhadwa family
    "bhadwa",
    "bhadwe",
    "bhadwi",
}


# ============================================================
# NORMALIZE FILTER WORD
# ============================================================

def _normalize_filter_word(
    word,
):
    """
    Normalize an individual dictionary word using the same
    normalization pipeline used for user messages.
    """

    result = normalize_message(
        word,
    )

    return result["normalized"]


# ============================================================
# BUILD NORMALIZED WORD SET
# ============================================================

def _build_normalized_words(
    words,
):
    """
    Normalize all words in a moderation dictionary.
    """

    normalized_words = set()

    for word in words:

        normalized_word = _normalize_filter_word(
            word,
        )

        if normalized_word:

            normalized_words.add(
                normalized_word,
            )

    return normalized_words


# ============================================================
# BUILD COMPACT WORD SET
# ============================================================

def _build_compact_words(
    words,
):
    """
    Build a compact representation of moderation words.

    Spaces are removed so obfuscated forms such as:

        p u s s y
        f u c k
        c h u t

    can also be detected.
    """

    compact_words = set()

    for word in words:

        normalized_word = _normalize_filter_word(
            word,
        )

        if not normalized_word:

            continue

        compact_word = re.sub(
            r"\s+",
            "",
            normalized_word,
        )

        if compact_word:

            compact_words.add(
                compact_word,
            )

    return compact_words


# ============================================================
# BUILD NORMALIZED PROFANITY ROOTS
# ============================================================

def _build_normalized_roots(
    roots,
):
    """
    Normalize profanity roots before derived-word matching.
    """

    normalized_roots = set()

    for root in roots:

        normalized_root = _normalize_filter_word(
            root,
        )

        if normalized_root:

            normalized_roots.add(
                normalized_root,
            )

    return normalized_roots


# ============================================================
# BUILD COMPACT PROFANITY ROOTS
# ============================================================

def _build_compact_roots(
    roots,
):
    """
    Build compact profanity roots for spaced obfuscation.
    """

    compact_roots = set()

    for root in roots:

        normalized_root = _normalize_filter_word(
            root,
        )

        if not normalized_root:

            continue

        compact_root = re.sub(
            r"\s+",
            "",
            normalized_root,
        )

        if compact_root:

            compact_roots.add(
                compact_root,
            )

    return compact_roots


# ============================================================
# PREPARE FILTER DICTIONARIES
# ============================================================

NORMALIZED_PROFANITY_WORDS = (
    _build_normalized_words(
        ALL_PROFANITY_WORDS,
    )
)


NORMALIZED_GENERAL_INSULT_WORDS = (
    _build_normalized_words(
        ALL_GENERAL_INSULT_WORDS,
    )
)


# ============================================================
# PREPARE COMPACT DICTIONARIES
# ============================================================

COMPACT_PROFANITY_WORDS = (
    _build_compact_words(
        ALL_PROFANITY_WORDS,
    )
)


COMPACT_GENERAL_INSULT_WORDS = (
    _build_compact_words(
        ALL_GENERAL_INSULT_WORDS,
    )
)


# ============================================================
# PREPARE PROFANITY ROOTS
# ============================================================

NORMALIZED_PROFANITY_ROOTS = (
    _build_normalized_roots(
        PROFANITY_ROOTS,
    )
)


COMPACT_PROFANITY_ROOTS = (
    _build_compact_roots(
        PROFANITY_ROOTS,
    )
)


# ============================================================
# CREATE COMPACT TEXT
# ============================================================

def _compact_text(
    text,
):
    """
    Remove whitespace from normalized text.

    This is used only for detecting obfuscated profanity.
    """

    if not text:

        return ""

    return re.sub(
        r"\s+",
        "",
        text,
    )


# ============================================================
# FIND NORMAL WORD MATCH
# ============================================================

def _find_word_match(
    text,
    words,
):
    """
    Find a blocked word or phrase inside normalized text.

    Returns:
        matched word or None
    """

    if not text:

        return None

    sorted_words = sorted(
        words,
        key=len,
        reverse=True,
    )

    for word in sorted_words:

        if not word:

            continue

        pattern = WORD_BOUNDARY_PATTERN.pattern.format(
            word=re.escape(
                word,
            ),
        )

        if re.search(
            pattern,
            text,
            re.IGNORECASE,
        ):

            return word

    return None


# ============================================================
# FIND COMPACT MATCH
# ============================================================

def _find_compact_match(
    text,
    words,
):
    """
    Find profanity after removing whitespace.

    This catches spaced obfuscation such as:

        c h u t
        p u s s y
        f u c k
    """

    if not text:

        return None

    compact_text = _compact_text(
        text,
    )

    if not compact_text:

        return None

    sorted_words = sorted(
        words,
        key=len,
        reverse=True,
    )

    for word in sorted_words:

        if not word:

            continue

        pattern = re.compile(
            rf"(?<!\w){re.escape(word)}(?!\w)",
            re.IGNORECASE,
        )

        if pattern.search(
            compact_text,
        ):

            return word

    return None


# ============================================================
# FIND DERIVED PROFANITY MATCH
# ============================================================

def _find_derived_profanity_match(
    text,
    roots,
):
    """
    Detect profanity roots followed by derived characters.

    Examples:

        chud
        chodu
        chudakad
        chudvane
        chudwana
        chudai

        chut
        chutgiri
        chutiya
        chutiyapa

        chod
        chodu
        chodna
        chodvane

    The root must start at a word boundary so normal
    unrelated words are not matched in the middle.
    """

    if not text:

        return None

    sorted_roots = sorted(
        roots,
        key=len,
        reverse=True,
    )

    for root in sorted_roots:

        if not root:

            continue

        pattern = re.compile(
            rf"(?<!\w){re.escape(root)}\w*",
            re.IGNORECASE,
        )

        match = pattern.search(
            text,
        )

        if match:

            return match.group(
                0,
            )

    return None


# ============================================================
# FIND COMPACT DERIVED PROFANITY MATCH
# ============================================================

def _find_compact_derived_match(
    text,
    roots,
):
    """
    Detect spaced profanity roots after whitespace removal.

    Examples:

        c h u d u
        c h u d a k a d
        c h u t g i r i
        c h u d v a n e
    """

    if not text:

        return None

    compact_text = _compact_text(
        text,
    )

    if not compact_text:

        return None

    sorted_roots = sorted(
        roots,
        key=len,
        reverse=True,
    )

    for root in sorted_roots:

        if not root:

            continue

        pattern = re.compile(
            rf"(?<!\w){re.escape(root)}\w*",
            re.IGNORECASE,
        )

        match = pattern.search(
            compact_text,
        )

        if match:

            return match.group(
                0,
            )

    return None


# ============================================================
# FIND MATCH
# ============================================================

def _find_match(
    text,
    words,
    compact_words,
    use_derived_roots=False,
):
    """
    Find normal, obfuscated, and derived-word matches.
    """

    if not text:

        return None

    # Normal matching

    matched_word = _find_word_match(
        text,
        words,
    )

    if matched_word:

        return matched_word

    # Compact matching

    matched_word = _find_compact_match(
        text,
        compact_words,
    )

    if matched_word:

        return matched_word

    # Derived profanity matching

    if use_derived_roots:

        matched_word = _find_derived_profanity_match(
            text,
            NORMALIZED_PROFANITY_ROOTS,
        )

        if matched_word:

            return matched_word

        # Compact derived matching

        matched_word = _find_compact_derived_match(
            text,
            COMPACT_PROFANITY_ROOTS,
        )

        if matched_word:

            return matched_word

    return None


# ============================================================
# CHECK PROFANITY
# ============================================================

def contains_profanity(
    text,
):
    """
    Check whether text contains hard-block profanity.
    """

    normalized_data = normalize_message(
        text,
    )

    normalized_text = normalized_data[
        "normalized"
    ]

    matched_word = _find_match(
        normalized_text,
        NORMALIZED_PROFANITY_WORDS,
        COMPACT_PROFANITY_WORDS,
        use_derived_roots=True,
    )

    if matched_word:

        return {
            "blocked": True,
            "category": "profanity",
            "matched_word": matched_word,
        }

    return {
        "blocked": False,
        "category": None,
        "matched_word": None,
    }


# ============================================================
# CHECK GENERAL INSULT
# ============================================================

def contains_general_insult(
    text,
):
    """
    Detect general insults.

    General insults are detected but do not block
    the live-chat message.
    """

    normalized_data = normalize_message(
        text,
    )

    normalized_text = normalized_data[
        "normalized"
    ]

    matched_word = _find_match(
        normalized_text,
        NORMALIZED_GENERAL_INSULT_WORDS,
        COMPACT_GENERAL_INSULT_WORDS,
    )

    if matched_word:

        return {
            "detected": True,
            "category": "general_insult",
            "matched_word": matched_word,
        }

    return {
        "detected": False,
        "category": None,
        "matched_word": None,
    }


# ============================================================
# CHECK LIVE CHAT MESSAGE
# ============================================================

def check_live_chat_message(
    text,
):
    """
    Run the complete live-chat content moderation check.

    Hard-blocked profanity is rejected.

    General insults are detected but do not block
    the message.
    """

    if not isinstance(
        text,
        str,
    ):

        return {
            "allowed": False,
            "category": "invalid",
            "matched_word": None,
            "message": "Message must be text.",
        }

    if not text.strip():

        return {
            "allowed": False,
            "category": "empty",
            "matched_word": None,
            "message": "Message cannot be empty.",
        }

    profanity_result = contains_profanity(
        text,
    )

    if profanity_result["blocked"]:

        return {
            "allowed": False,
            "category": profanity_result[
                "category"
            ],
            "matched_word": profanity_result[
                "matched_word"
            ],
            "message": (
                "This message contains "
                "prohibited language."
            ),
        }

    # General insults

    insult_result = contains_general_insult(
        text,
    )

    return {
        "allowed": True,
        "category": (
            insult_result["category"]
            if insult_result["detected"]
            else None
        ),
        "matched_word": (
            insult_result["matched_word"]
            if insult_result["detected"]
            else None
        ),
        "message": None,
    }


# ============================================================
# SERVICE COMPATIBILITY LAYER
# ============================================================

def moderate_live_message(
    text,
):
    """
    Service-level moderation entry point.
    """

    result = check_live_chat_message(
        text,
    )

    # Blocked / invalid message

    if not result.get(
        "allowed",
        False,
    ):

        return {
            "allowed": False,
            "category": result.get(
                "category",
            ),
            "matched_word": result.get(
                "matched_word",
            ),
            "message": result.get(
                "message",
                "This message contains prohibited language.",
            ),
        }

    # Allowed message

    return {
        "allowed": True,
        "category": result.get(
            "category",
        ),
        "matched_word": result.get(
            "matched_word",
        ),
        "message": text,
    }


# ============================================================
# SIMPLE BOOLEAN CHECK
# ============================================================

def is_live_message_allowed(
    text,
):
    """
    Return True when a live chat message is allowed.
    """

    result = moderate_live_message(
        text,
    )

    return result[
        "allowed"
    ]