"""Guard the pg8000 / Scramp API used for Render PostgreSQL auth.

pg8000==1.31.5 calls scramp.make_channel_binding during SCRAM authentication.
Scramp 1.5.0 removed this function. The backend should catch dependency drift
in CI rather than failing only after it is deployed.
"""
import pg8000
import scramp


def test_pg8000_scramp_channel_binding_compatibility():
    assert pg8000.__version__ == "1.31.5"
    assert callable(getattr(scramp, "make_channel_binding", None)), (
        "Installed scramp is incompatible with pg8000 1.31.5: "
        "scramp.make_channel_binding is missing. "
        "Keep scramp==1.4.18 or upgrade both libraries compatibly."
    )
