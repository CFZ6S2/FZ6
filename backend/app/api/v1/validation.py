"""
TuCitaSegura - Server-Side Validation API
Provides validation endpoints for user input
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional
import re
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/validation", tags=["Validation"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class EmailValidation(BaseModel):
    email: EmailStr


class PasswordValidation(BaseModel):
    password: str = Field(min_length=8)


class PhoneValidation(BaseModel):
    phone: str = Field(pattern=r'^\+?[0-9]{9,15}$')


class UsernameValidation(BaseModel):
    username: str = Field(min_length=3, max_length=30)

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_.-]+$', v):
            raise ValueError('Username can only contain letters, numbers, dots, hyphens, and underscores')
        if v.startswith('.') or v.startswith('-'):
            raise ValueError('Username cannot start with dot or hyphen')
        return v


class DNIValidation(BaseModel):
    dni: str = Field(pattern=r'^[0-9]{8}[A-Z]$|^[XYZ][0-9]{7}[A-Z]$')


class ValidationResponse(BaseModel):
    valid: bool
    message: str
    details: Optional[dict] = None


# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

def validate_password_strength(password: str) -> dict:
    """
    Validates password strength and returns detailed feedback
    """
    errors = []
    score = 0

    # Length check
    if len(password) >= 8:
        score += 25
    else:
        errors.append("Password must be at least 8 characters")

    # Uppercase check
    if re.search(r'[A-Z]', password):
        score += 25
    else:
        errors.append("Password must contain at least one uppercase letter")

    # Lowercase check
    if re.search(r'[a-z]', password):
        score += 25
    else:
        errors.append("Password must contain at least one lowercase letter")

    # Number check
    if re.search(r'[0-9]', password):
        score += 25
    else:
        errors.append("Password must contain at least one number")

    # Special character check (bonus)
    if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        score += 10

    # Length bonus
    if len(password) >= 12:
        score += 10

    strength = "débil"
    if score >= 90:
        strength = "muy fuerte"
    elif score >= 75:
        strength = "fuerte"
    elif score >= 50:
        strength = "moderada"

    return {
        "score": min(score, 100),
        "strength": strength,
        "errors": errors,
        "valid": len(errors) == 0
    }


def validate_dni_nie(dni: str) -> dict:
    """
    Validates Spanish DNI or NIE
    """
    dni = dni.upper().strip()

    # DNI/NIE regex
    if not re.match(r'^[0-9]{8}[A-Z]$|^[XYZ][0-9]{7}[A-Z]$', dni):
        return {
            "valid": False,
            "message": "Formato de DNI/NIE inválido"
        }

    # Letter validation
    letters = "TRWAGMYFPDXBNJZSQVHLCKE"

    if dni[0] in 'XYZ':
        # NIE
        nie_map = {'X': '0', 'Y': '1', 'Z': '2'}
        number = nie_map[dni[0]] + dni[1:8]
    else:
        # DNI
        number = dni[:8]

    expected_letter = letters[int(number) % 23]
    actual_letter = dni[-1]

    if expected_letter != actual_letter:
        return {
            "valid": False,
            "message": f"Letra incorrecta. Debería ser '{expected_letter}'"
        }

    return {
        "valid": True,
        "message": "DNI/NIE válido",
        "type": "NIE" if dni[0] in 'XYZ' else "DNI"
    }


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/email", response_model=ValidationResponse)
async def validate_email(data: EmailValidation):
    """
    Validates email format
    """
    try:
        return ValidationResponse(
            valid=True,
            message="Email válido",
            details={"email": data.email}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/password", response_model=ValidationResponse)
async def validate_password(data: PasswordValidation):
    """
    Validates password strength

    Returns detailed feedback on password strength including:
    - Score (0-100)
    - Strength level (débil, moderada, fuerte, muy fuerte)
    - Specific improvement suggestions
    """
    try:
        result = validate_password_strength(data.password)

        return ValidationResponse(
            valid=result["valid"],
            message=f"Contraseña {result['strength']} (score: {result['score']}/100)",
            details=result
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/phone", response_model=ValidationResponse)
async def validate_phone(data: PhoneValidation):
    """
    Validates phone number format

    Accepts formats:
    - +34612345678 (international)
    - 612345678 (national)
    """
    try:
        return ValidationResponse(
            valid=True,
            message="Teléfono válido",
            details={"phone": data.phone}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/username", response_model=ValidationResponse)
async def validate_username(data: UsernameValidation):
    """
    Validates username format

    Rules:
    - 3-30 characters
    - Only letters, numbers, dots, hyphens, underscores
    - Cannot start with dot or hyphen
    """
    try:
        return ValidationResponse(
            valid=True,
            message="Nombre de usuario válido",
            details={"username": data.username}
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/dni", response_model=ValidationResponse)
async def validate_dni(data: DNIValidation):
    """
    Validates Spanish DNI or NIE

    Formats accepted:
    - DNI: 12345678A
    - NIE: X1234567A, Y1234567A, Z1234567A
    """
    try:
        result = validate_dni_nie(data.dni)

        return ValidationResponse(
            valid=result["valid"],
            message=result["message"],
            details={"type": result.get("type")} if result["valid"] else None
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/age")
async def validate_age(birthdate: str):
    """
    Validates age from birthdate

    - **birthdate**: Date in format YYYY-MM-DD

    Returns whether user is 18+ and calculated age
    """
    try:
        from datetime import datetime

        birth_date = datetime.strptime(birthdate, "%Y-%m-%d")
        today = datetime.now()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))

        return ValidationResponse(
            valid=age >= 18,
            message=f"Edad: {age} años" + (" (válido)" if age >= 18 else " (debe ser mayor de 18)"),
            details={
                "age": age,
                "is_adult": age >= 18,
                "birthdate": birthdate
            }
        )
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Formato de fecha inválido. Use YYYY-MM-DD"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/batch")
async def validate_batch(data: dict):
    """
    Validates multiple fields at once

    Example request body:
    ```json
    {
        "email": "user@example.com",
        "password": "SecurePass123!",
        "phone": "+34612345678",
        "username": "john_doe"
    }
    ```

    Returns validation results for all provided fields
    """
    try:
        results = {}

        if "email" in data:
            try:
                EmailValidation(email=data["email"])
                results["email"] = {"valid": True, "message": "Email válido"}
            except Exception as e:
                results["email"] = {"valid": False, "message": str(e)}

        if "password" in data:
            results["password"] = validate_password_strength(data["password"])

        if "phone" in data:
            try:
                PhoneValidation(phone=data["phone"])
                results["phone"] = {"valid": True, "message": "Teléfono válido"}
            except Exception as e:
                results["phone"] = {"valid": False, "message": str(e)}

        if "username" in data:
            try:
                UsernameValidation(username=data["username"])
                results["username"] = {"valid": True, "message": "Username válido"}
            except Exception as e:
                results["username"] = {"valid": False, "message": str(e)}

        if "dni" in data:
            results["dni"] = validate_dni_nie(data["dni"])

        all_valid = all(r.get("valid", False) for r in results.values())

        return {
            "success": True,
            "all_valid": all_valid,
            "results": results
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
