from app.models.user import UserRole
from app.schemas.user import UserRegisterRequest


def test_user_roles_include_unified_participant_types():
    assert UserRole.INDIVIDUAL.value == "individual"
    assert UserRole.NGO.value == "ngo"
    assert UserRole.RESCUER.value == "rescuer"
    assert UserRole.VOLUNTEER.value == "volunteer"
    assert UserRole.FEEDER.value == "feeder"


def test_register_request_accepts_profile_type_and_organization_name():
    req = UserRegisterRequest(
        name="Jane Volunteer",
        email="jane@example.com",
        password="StrongPass123!",
        role="citizen",
        profile_type="volunteer",
        organization_name="City Animal Care",
    )

    assert req.role == "citizen"
    assert req.profile_type == "volunteer"
    assert req.organization_name == "City Animal Care"
