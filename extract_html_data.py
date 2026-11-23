import re
import pandas as pd

# 1. Explicit overrides for local slang, spelling variants, and typos
CANONICAL_OVERRIDES = {
    "balmies": "Balmy's",
    "balmys": "Balmy's",
    "balmy s": "Balmy's",
    "dougs": "Doug's",
    "doug s": "Doug's",
    "hatch": "The Hatchery",
    "hatchery": "The Hatchery",
    "limpdish": "Nimpkish Lake",  # likely typo in dataset
    "nimpkish": "Nimpkish Lake",
    "nova scotia clam": "Nova Scotia, Clam Bay",
    "nova scotia lawrencetown": "Nova Scotia, Lawrencetown",
    "nova scotia rainbow have": "Nova Scotia, Rainbow Haven",
    "sprecks": "Sprecks Beach",
    "ka a": "Ka'a",
}

def make_spot_key(spot: str) -> str:
    if pd.isna(spot) or not str(spot).strip():
        return ""
    s = str(spot).strip().lower()
    s = s.replace("’", "'").replace("`", "'")
    s = re.sub(r"['\".,\-]", " ", s)

    # Expand common sailing/geography abbreviations
    abbr = {
        r"\bbch\b": "beach",
        r"\bpt\b": "point",
        r"\blk\b": "lake",
        r"\bck\b": "creek",
        r"\blgn\b": "lagoon",
        r"\bhbr\b": "harbour",
        r"\bns\b": "nova scotia",
        r"\bb\s*bay\b": "boundary bay",
    }
    for pat, repl in abbr.items():
        s = re.sub(pat, repl, s)

    # Strip leading "the" and trailing generic water/shore words for base matching
    s = re.sub(r"^the\s+", "", s)
    s = re.sub(r"\b(beach|lake|harbour|bay)\b$", "", s).strip()
    s = re.sub(r"\s+", " ", s)
    return CANONICAL_OVERRIDES.get(s, s)

def standardize_spots(df: pd.DataFrame, col: str = "Spot") -> pd.DataFrame:
    df = df.copy()
    keys = df[col].apply(make_spot_key)

    # Pick the best-capitalized, most frequent original spelling for each group
    def pick_canonical(series):
        k = make_spot_key(series.iloc[0])
        if k in CANONICAL_OVERRIDES.values():
            return k
        candidates = series.dropna()
        if candidates.empty:
            return pd.NA
        return sorted(
            candidates,
            key=lambda v: (
                -sum(w[0].isupper() for w in str(v).split() if w),
                -series.tolist().count(v),
                -len(str(v)),
            ),
        )[0]

    canon_map = df.groupby(keys)[col].apply(pick_canonical).to_dict()
    df[col] = keys.map(canon_map)
    return df

# Usage:
df = pd.read_csv('./Data/combined_data.csv')
df = standardize_spots(df, col="spot")
df.to_csv('./Data/standardized_data.csv', index=False)
