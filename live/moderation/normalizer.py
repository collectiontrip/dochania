# ============================================================
# LIVE CHAT MESSAGE NORMALIZER
# ============================================================

import re
import unicodedata


# ============================================================
# ZERO-WIDTH / INVISIBLE CHARACTERS
# ============================================================

ZERO_WIDTH_CHARACTERS = {
    "\u200b",
    "\u200c",
    "\u200d",
    "\u2060",
    "\ufeff",
}


# ============================================================
# COMMON LEETSPEAK / OBFUSCATION MAP
# ============================================================

LEET_REPLACEMENTS = {
    "0": "o",
    "1": "i",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",

    "@": "a",
    "$": "s",
}


# ============================================================
# SEPARATOR PATTERN
# ============================================================

SEPARATOR_PATTERN = re.compile(
    r"[._,\-~^|:/\\*+=!?#]+"
)


# ============================================================
# WHITESPACE PATTERN
# ============================================================

WHITESPACE_PATTERN = re.compile(
    r"\s+"
)


# ============================================================
# REPEATED CHARACTER PATTERN
# ============================================================

REPEATED_CHARACTER_PATTERN = re.compile(
    r"(.)\1{2,}"
)


# ============================================================
# UNICODE NORMALIZATION
# ============================================================

def normalize_unicode(text):
    """
    Normalize Unicode characters into a consistent form.
    """

    if not text:
        return ""

    return unicodedata.normalize(
        "NFKC",
        text,
    )


# ============================================================
# REMOVE ZERO-WIDTH CHARACTERS
# ============================================================

def remove_zero_width_characters(text):
    """
    Remove invisible Unicode characters.
    """

    if not text:
        return ""

    for character in ZERO_WIDTH_CHARACTERS:

        text = text.replace(
            character,
            "",
        )

    return text


# ============================================================
# NORMALIZE CASE
# ============================================================

def normalize_case(text):
    """
    Convert text to lowercase for matching.
    """

    if not text:
        return ""

    return text.casefold()


# ============================================================
# NORMALIZE LEETSPEAK
# ============================================================

def normalize_leetspeak(text):
    """
    Convert common number and symbol substitutions.
    """

    if not text:
        return ""

    normalized = []

    for character in text:

        replacement = LEET_REPLACEMENTS.get(
            character,
            character,
        )

        normalized.append(
            replacement,
        )

    return "".join(
        normalized,
    )


# ============================================================
# NORMALIZE SEPARATORS
# ============================================================

def normalize_separators(text):
    """
    Remove separators inserted between characters.
    """

    if not text:
        return ""

    return SEPARATOR_PATTERN.sub(
        "",
        text,
    )


# ============================================================
# NORMALIZE WHITESPACE
# ============================================================

def normalize_whitespace(text):
    """
    Collapse multiple whitespace characters.
    """

    if not text:
        return ""

    return WHITESPACE_PATTERN.sub(
        " ",
        text,
    ).strip()


# ============================================================
# REDUCE REPEATED CHARACTERS
# ============================================================

def reduce_repeated_characters(text):
    """
    Reduce excessive repeated characters.
    """

    if not text:
        return ""

    def replace_repetition(match):

        character = match.group(1)

        return (
            character
            + character
        )

    return REPEATED_CHARACTER_PATTERN.sub(
        replace_repetition,
        text,
    )


# ============================================================
# NORMALIZE SYMBOLS
# ============================================================

def normalize_symbols(text):
    """
    Normalize Unicode formatting while preserving
    legitimate symbols and emojis.
    """

    if not text:
        return ""

    normalized = []

    for character in text:

        category = unicodedata.category(
            character,
        )

        # Letters

        if category.startswith("L"):

            normalized.append(
                character,
            )

            continue

        # Numbers

        if category.startswith("N"):

            normalized.append(
                character,
            )

            continue

        # Whitespace

        if character.isspace():

            normalized.append(
                " ",
            )

            continue

        # Other symbols

        normalized.append(
            character,
        )

    return "".join(
        normalized,
    )


# ============================================================
# CREATE MATCHING TEXT
# ============================================================

def normalize_for_matching(text):
    """
    Create normalized text for moderation matching.
    """

    if not text:
        return ""

    normalized = text

    # Unicode normalization

    normalized = normalize_unicode(
        normalized,
    )

    # Remove invisible characters

    normalized = remove_zero_width_characters(
        normalized,
    )

    # Case normalization

    normalized = normalize_case(
        normalized,
    )

    # Leetspeak normalization

    normalized = normalize_leetspeak(
        normalized,
    )

    # Separator normalization

    normalized = normalize_separators(
        normalized,
    )

    # Repeated character normalization

    normalized = reduce_repeated_characters(
        normalized,
    )

    # Symbol normalization

    normalized = normalize_symbols(
        normalized,
    )

    # Whitespace normalization

    normalized = normalize_whitespace(
        normalized,
    )

    return normalized


# ============================================================
# CREATE NORMALIZED MESSAGE
# ============================================================

def normalize_message(text):
    """
    Create original and normalized representations.
    """

    if text is None:

        text = ""

    original = str(
        text,
    )

    normalized = normalize_for_matching(
        original,
    )

    return {
        "original": original,
        "normalized": normalized,
    }