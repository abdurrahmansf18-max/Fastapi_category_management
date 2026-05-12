from app.core.sessions import issue_refresh_token, secret_hash


def test_secret_hash_is_stable_and_not_plaintext():
    token = "session-token"
    assert secret_hash(token) == secret_hash(token)
    assert secret_hash(token) != token
    assert len(secret_hash(token)) == 64


def test_refresh_tokens_are_unique_and_high_entropy():
    first = issue_refresh_token()
    second = issue_refresh_token()
    assert first != second
    assert len(first) >= 48
    assert len(second) >= 48
