"""
Servicio para enviar emails transaccionales a usuarios.
"""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any
from datetime import datetime
import os

logger = logging.getLogger(__name__)

class EmailService:
    """Servicio para enviar emails usando SMTP."""

    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_user)
        self.from_name = os.getenv("FROM_NAME", "TuCitaSegura")

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Envía un email a un destinatario.

        Args:
            to_email: Email del destinatario
            subject: Asunto del email
            html_content: Contenido HTML del email
            text_content: Contenido en texto plano (fallback)

        Returns:
            True si se envió correctamente
        """
        # Si no hay credenciales SMTP configuradas, solo loggear
        if not self.smtp_user or not self.smtp_password:
            logger.warning(
                f"SMTP no configurado. Email que se habría enviado:\n"
                f"Para: {to_email}\n"
                f"Asunto: {subject}\n"
                f"Contenido: {text_content or html_content[:100]}..."
            )
            return True

        try:
            # Crear mensaje
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email

            # Agregar contenido
            if text_content:
                part1 = MIMEText(text_content, "plain", "utf-8")
                message.attach(part1)

            part2 = MIMEText(html_content, "html", "utf-8")
            message.attach(part2)

            # Conectar y enviar
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(message)

            logger.info(f"Email enviado a {to_email}: {subject}")
            return True

        except Exception as e:
            logger.error(f"Error enviando email a {to_email}: {e}")
            return False

    async def send_payment_confirmation(
        self,
        user_email: str,
        payment_data: Dict[str, Any],
        subscription_data: Dict[str, Any]
    ) -> bool:
        """
        Envía email de confirmación de pago y activación de suscripción.

        Args:
            user_email: Email del usuario
            payment_data: Datos del pago realizado
            subscription_data: Datos de la suscripción activada

        Returns:
            True si se envió correctamente
        """
        amount = payment_data.get("amount", "0")
        currency = payment_data.get("currency", "EUR")
        order_id = payment_data.get("order_id", "N/A")
        plan_type = subscription_data.get("plan_type", "premium")
        end_date = subscription_data.get("end_date")

        # Formatear fecha de expiración
        end_date_str = end_date.strftime("%d/%m/%Y") if end_date else "N/A"

        subject = "¡Pago confirmado! Tu suscripción está activa 🎉"

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .success-box {{ background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }}
        .details {{ background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }}
        .details-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }}
        .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>¡Pago Confirmado!</h1>
            <p>Tu suscripción a TuCitaSegura ya está activa</p>
        </div>
        <div class="content">
            <div class="success-box">
                <strong>✅ Pago procesado exitosamente</strong><br>
                Hemos recibido tu pago y activado tu cuenta premium.
            </div>

            <h2>Detalles del Pago</h2>
            <div class="details">
                <div class="details-row">
                    <span><strong>Monto pagado:</strong></span>
                    <span>{amount} {currency}</span>
                </div>
                <div class="details-row">
                    <span><strong>ID de transacción:</strong></span>
                    <span>{order_id}</span>
                </div>
                <div class="details-row">
                    <span><strong>Plan:</strong></span>
                    <span>{plan_type.capitalize()}</span>
                </div>
                <div class="details-row">
                    <span><strong>Fecha de activación:</strong></span>
                    <span>{datetime.now().strftime("%d/%m/%Y")}</span>
                </div>
                <div class="details-row">
                    <span><strong>Válido hasta:</strong></span>
                    <span>{end_date_str}</span>
                </div>
            </div>

            <h2>¿Qué incluye tu suscripción?</h2>
            <ul>
                <li>✨ Acceso ilimitado a todos los perfiles</li>
                <li>💬 Mensajería sin restricciones</li>
                <li>🔒 Verificación de identidad avanzada</li>
                <li>🛡️ Sistema de emergencia activado</li>
                <li>⭐ Perfil destacado en búsquedas</li>
                <li>📊 Estadísticas de tu perfil</li>
            </ul>

            <div style="text-align: center;">
                <a href="https://tucitasegura.com/dashboard" class="button">
                    Ir a mi cuenta
                </a>
            </div>

            <div class="footer">
                <p>Este es un email automático, por favor no respondas.</p>
                <p>Si tienes alguna pregunta, contacta a soporte@tucitasegura.com</p>
                <p>&copy; 2025 TuCitaSegura - Citas seguras y verificadas</p>
            </div>
        </div>
    </div>
</body>
</html>
"""

        text_content = f"""
¡Pago Confirmado!

Hemos recibido tu pago y activado tu suscripción premium a TuCitaSegura.

Detalles del Pago:
- Monto: {amount} {currency}
- ID de transacción: {order_id}
- Plan: {plan_type.capitalize()}
- Válido hasta: {end_date_str}

Ahora puedes disfrutar de todos los beneficios premium:
- Acceso ilimitado a todos los perfiles
- Mensajería sin restricciones
- Verificación de identidad avanzada
- Sistema de emergencia activado
- Perfil destacado en búsquedas

Accede a tu cuenta en: https://tucitasegura.com/dashboard

Gracias por confiar en TuCitaSegura.

---
Este es un email automático, por favor no respondas.
Si tienes alguna pregunta, contacta a soporte@tucitasegura.com
"""

        return await self.send_email(user_email, subject, html_content, text_content)

    async def send_subscription_cancelled(
        self,
        user_email: str,
        refund_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Envía email de notificación de cancelación de suscripción.

        Args:
            user_email: Email del usuario
            refund_data: Datos del reembolso si aplica

        Returns:
            True si se envió correctamente
        """
        subject = "Tu suscripción ha sido cancelada"

        refund_info = ""
        if refund_data:
            refund_amount = refund_data.get("amount", "N/A")
            refund_id = refund_data.get("refund_id", "N/A")
            refund_info = f"""
            <div class="success-box">
                <strong>💰 Reembolso procesado</strong><br>
                Se ha procesado un reembolso de {refund_amount} a tu método de pago original.<br>
                ID de reembolso: {refund_id}
            </div>
            """

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #f44336; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .success-box {{ background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }}
        .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Suscripción Cancelada</h1>
        </div>
        <div class="content">
            <p>Lamentamos informarte que tu suscripción a TuCitaSegura ha sido cancelada.</p>

            {refund_info}

            <p>Aún puedes acceder a la plataforma con una cuenta gratuita, aunque con funcionalidades limitadas.</p>

            <p>Si deseas reactivar tu suscripción premium, puedes hacerlo en cualquier momento desde tu cuenta.</p>

            <div style="text-align: center;">
                <a href="https://tucitasegura.com/pricing" class="button">
                    Ver planes
                </a>
            </div>

            <div class="footer">
                <p>Si tienes alguna pregunta, contacta a soporte@tucitasegura.com</p>
                <p>&copy; 2025 TuCitaSegura</p>
            </div>
        </div>
    </div>
</body>
</html>
"""

        text_content = f"""
Suscripción Cancelada

Lamentamos informarte que tu suscripción a TuCitaSegura ha sido cancelada.

{"Se ha procesado un reembolso a tu método de pago original." if refund_data else ""}

Aún puedes acceder a la plataforma con una cuenta gratuita.

Si deseas reactivar tu suscripción, visita: https://tucitasegura.com/pricing

---
Si tienes alguna pregunta, contacta a soporte@tucitasegura.com
"""

        return await self.send_email(user_email, subject, html_content, text_content)

# Instancia global del servicio
email_service = EmailService()
