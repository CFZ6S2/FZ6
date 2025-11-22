#!/usr/bin/env python3
"""
Script para debuggear el sistema de moderación de mensajes
"""

from app.services.nlp.message_moderator import moderate_user_message

def test_moderation():
    print("=== Testing Message Moderation ===\n")
    
    # Test 1: Mensaje limpio
    print("Test 1: Mensaje limpio")
    result1 = moderate_user_message(
        "¡Hola! ¿Te gustaría salir a tomar un café?",
        "user_123",
        {"sender_id": "user_123", "receiver_id": "user_456"}
    )
    print(f"Texto: '¡Hola! ¿Te gustaría salir a tomar un café?'")
    print(f"Seguro: {result1['is_safe']}, Severidad: {result1['severity']}, Categorías: {result1['categories']}")
    print()
    
    # Test 2: Mensaje tóxico
    print("Test 2: Mensaje tóxico")
    toxic_text = "Eres un estúpido idiota imbécil, no vuelvas a hablarme más"
    result2 = moderate_user_message(
        toxic_text,
        "user_123",
        {"sender_id": "user_123", "receiver_id": "user_456"}
    )
    print(f"Texto: '{toxic_text}'")
    print(f"Seguro: {result2['is_safe']}, Severidad: {result2['severity']}, Categorías: {result2['categories']}")
    print(f"Frases marcadas: {result2['flagged_phrases']}")
    print()
    
    # Test 3: Información personal
    print("Test 3: Información personal")
    personal_text = "Mi número de cuenta bancaria es ES1234567890123456789012, llámame al teléfono 612345678 o escríbeme a miemail@dominio.com"
    result3 = moderate_user_message(
        personal_text,
        "user_123",
        {"sender_id": "user_123", "receiver_id": "user_456"}
    )
    print(f"Texto: '{personal_text}'")
    print(f"Seguro: {result3['is_safe']}, Severidad: {result3['severity']}, Categorías: {result3['categories']}")
    print(f"Frases marcadas: {result3['flagged_phrases']}")
    print()

if __name__ == "__main__":
    test_moderation()