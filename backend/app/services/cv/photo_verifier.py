"""
TuCitaSegura - Verificación de Fotos con Computer Vision

Este módulo implementa verificación de autenticidad de fotos usando:
- Detección de rostros y personas reales
- Estimación de edad
- Detección de filtros excesivos
- Análisis de contenido inapropiado
- Detección de imágenes generadas por IA
- Verificación de calidad de imagen
"""

import cv2
import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import logging
from PIL import Image, ImageEnhance
import requests
from io import BytesIO
import base64
from datetime import datetime
import firebase_admin
from firebase_admin import firestore
import json

logger = logging.getLogger(__name__)

@dataclass
class FaceDetection:
    """Resultado de detección de rostros"""
    bbox: Tuple[int, int, int, int]  # (x, y, width, height)
    confidence: float
    landmarks: List[Tuple[int, int]]  # Puntos clave del rostro
    is_real: bool  # Si es una persona real (no foto de foto)
    quality_score: float

@dataclass
class AgeEstimation:
    """Estimación de edad"""
    predicted_age: int
    age_range: Tuple[int, int]
    confidence: float
    model_used: str

@dataclass
class FilterDetection:
    """Detección de filtros y edición"""
    has_filters: bool
    filter_intensity: float  # 0-1
    filter_types: List[str]  # ['beauty', 'color', 'distortion', 'ai_enhancement']
    editing_score: float  # Probabilidad de edición significativa
    is_ai_generated: bool

@dataclass
class ContentAnalysis:
    """Análisis de contenido"""
    is_appropriate: bool
    inappropriate_flags: List[str]
    nudity_detected: bool
    violence_detected: bool
    spam_detected: bool
    contains_text: bool
    text_content: str

@dataclass
class PhotoVerificationResult:
    """Resultado completo de verificación"""
    is_real_person: bool
    has_excessive_filters: bool
    is_appropriate: bool
    estimated_age: int
    confidence: float
    faces_detected: int
    warnings: List[str]
    details: Dict[str, any]
    verification_score: float
    recommendation: str
    processing_time_ms: int

class PhotoVerification:
    """
    Sistema de verificación de fotos con múltiples capas de análisis
    """
    
    def __init__(self):
        self.db = firestore.client()
        self.min_face_confidence = 0.7
        self.max_filter_intensity = 0.3
        self.min_quality_score = 0.6
        
        # Umbrales de configuración
        self.min_age_confidence = 0.8
        self.max_editing_score = 0.4
        self.min_verification_score = 0.7
        
        # Modelos de referencia (simulados para este ejemplo)
        self.face_cascade = None  # Se cargaría en producción
        self.age_model = None
        self.filter_detector = None
        self.content_classifier = None
        
    def verify_photo(
        self, 
        image_url: str, 
        claimed_age: Optional[int] = None,
        user_id: Optional[str] = None
    ) -> PhotoVerificationResult:
        """
        Verificar foto completa con todos los análisis
        
        Args:
            image_url: URL de la imagen
            claimed_age: Edad declarada por el usuario
            user_id: ID del usuario para contexto
            
        Returns:
            Resultado completo de verificación
        """
        start_time = datetime.now()
        
        try:
            logger.info(f"[PhotoVerification] Iniciando verificación de foto para usuario {user_id}")
            
            # 1. Descargar y preprocesar imagen
            image = self._download_and_preprocess_image(image_url)
            if image is None:
                return self._create_error_result("No se pudo descargar o procesar la imagen")
            
            # 2. Detección de rostros
            faces = self._detect_faces(image)
            
            # 3. Verificar si es persona real
            is_real = self._verify_real_person(image, faces)
            
            # 4. Estimar edad
            age_result = self._estimate_age(image, faces)
            
            # 5. Detectar filtros y edición
            filter_result = self._detect_filters(image)
            
            # 6. Análisis de contenido
            content_result = self._analyze_content(image)
            
            # 7. Evaluar calidad de imagen
            quality_score = self._assess_image_quality(image)
            
            # 8. Verificar consistencia con edad declarada
            age_consistency = self._check_age_consistency(claimed_age, age_result)
            
            # 9. Calcular score final y recomendaciones
            verification_score = self._calculate_verification_score(
                is_real, filter_result, content_result, quality_score, age_consistency
            )
            
            # 10. Generar recomendación final
            recommendation = self._generate_recommendation(verification_score, filter_result, content_result)
            
            # 11. Preparar warnings
            warnings = self._generate_warnings(age_consistency, filter_result, content_result, quality_score)
            
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            result = PhotoVerificationResult(
                is_real_person=is_real,
                has_excessive_filters=filter_result.has_filters and filter_result.filter_intensity > self.max_filter_intensity,
                is_appropriate=content_result.is_appropriate,
                estimated_age=age_result.predicted_age if age_result else 0,
                confidence=verification_score,
                faces_detected=len(faces),
                warnings=warnings,
                details={
                    'face_detection': len(faces),
                    'filter_analysis': filter_result.__dict__,
                    'content_analysis': content_result.__dict__,
                    'quality_score': quality_score,
                    'age_consistency': age_consistency,
                    'processing_time_ms': processing_time
                },
                verification_score=verification_score,
                recommendation=recommendation,
                processing_time_ms=processing_time
            )
            
            # Log del resultado
            logger.info(f"[PhotoVerification] Verificación completada en {processing_time}ms - Score: {verification_score:.2f}")
            
            # Guardar en Firestore para auditoría
            if user_id:
                self._save_verification_result(user_id, image_url, result)
            
            return result
            
        except Exception as e:
            logger.error(f"[PhotoVerification] Error en verificación: {e}", exc_info=True)
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            return self._create_error_result(f"Error en verificación: {str(e)}", processing_time)
    
    def _download_and_preprocess_image(self, image_url: str) -> Optional[np.ndarray]:
        """Descargar y preprocesar imagen"""
        try:
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            
            # Convertir a imagen PIL
            image = Image.open(BytesIO(response.content))
            
            # Convertir a RGB si es necesario
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Redimensionar si es muy grande
            max_size = (1024, 1024)
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Convertir a numpy array
            image_array = np.array(image)
            
            # Verificar tamaño mínimo
            if image_array.shape[0] < 100 or image_array.shape[1] < 100:
                logger.warning("[PhotoVerification] Imagen demasiado pequeña")
                return None
            
            return image_array
            
        except Exception as e:
            logger.error(f"[PhotoVerification] Error descargando imagen: {e}")
            return None
    
    def _detect_faces(self, image: np.ndarray) -> List[FaceDetection]:
        """Detectar rostros en la imagen"""
        try:
            # Simulación de detección de rostros (en producción usar OpenCV o similar)
            faces = []
            
            # Análisis simple de patrones faciales
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            
            # Simular detección de 1 rostro con alta confianza
            # En producción, esto usaría modelos reales de detección
            height, width = image.shape[:2]
            
            # Asumimos que hay al menos un rostro centrado
            face_bbox = (
                width // 4, height // 4,  # x, y
                width // 2, height // 2    # width, height
            )
            
            face_detection = FaceDetection(
                bbox=face_bbox,
                confidence=0.85,
                landmarks=[(width//2, height//3), (width//3, height//2), (2*width//3, height//2)],
                is_real=True,  # Por defecto asumimos real
                quality_score=0.8
            )
            
            faces.append(face_detection)
            
            logger.info(f"[PhotoVerification] Detectados {len(faces)} rostros")
            return faces
            
        except Exception as e:
            logger.error(f"[PhotoVerification] Error detectando rostros: {e}")
            return []
    
    def _verify_real_person(self, image: np.ndarray, faces: List[FaceDetection]) -> bool:
        """Verificar si es una persona real (no foto de foto)"""
        try:
            if not faces:
                return False
            
            # Análisis de calidad y consistencia
            # En producción, esto incluiría:
            # - Detección de reflejos en ojos
            # - Análisis de textura de piel
            # - Detección de bordes artificiales
            # - Análisis de iluminación
            
            # Simulación: verificar calidad general
            quality_indicators = []
            
            # 1. Análisis de nitidez
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            sharpness_score = min(laplacian_var / 1000, 1.0)
            quality_indicators.append(sharpness_score)
            
            # 2. Análisis de ruido
            noise_level = self._estimate_noise_level(image)
            noise_score = max(0, 1.0 - noise_level)
            quality_indicators.append(noise_score)
            
            # 3. Análisis de iluminación
            brightness = np.mean(gray)
            brightness_score = 1.0 if 50 < brightness < 200 else 0.5
            quality_indicators.append(brightness_score)
            
            # 4. Verificar consistencia de rostros
            face_consistency = all(face.confidence > self.min_face_confidence for face in faces)
            quality_indicators.append(1.0 if face_consistency else 0.3)
            
            # Score final
            final_score = np.mean(quality_indicators)
            is_real = final_score > 0.6
            
            logger.info(f"[PhotoVerification] Verificación de persona real: {is_real} (score: {final_score:.2f})")
            
            return is_real
            
        except Exception as e:
            logger.error(f"[PhotoVerification] Error verificando persona real: {e}")
            return False
    
    def _estimate_age(self, image: np.ndarray, faces: List[FaceDetection]) -> Optional[AgeEstimation]:
        """Estimar edad basada en el rostro detectado"""
        try:
            if not faces:
                return None
            
            # En producción, usaría modelos de deep learning entrenados
            # Aquí simulamos con análisis de características
            
            # Análisis simple basado en proporciones y textura
            face = faces[0]  # Usar el rostro principal
            x, y, w, h = face.bbox
            
            # Extraer región del rostro
            face_region = image[y:y+h, x:x+w]
            
            # Análisis de textura (más rugosidad = mayor edad)
            gray_face = cv2.cvtColor(face_region, cv2.COLOR_RGB2GRAY)
            
            # Calcular desviación estándar como proxy de textura
            texture_score = np.std(gray_face)
            
            # Estimar edad basada en textura (modelo simplificado)
            # En producción, usar modelos entrenados con datasets de edad
            base_age = 25  # Edad base
            texture_factor = texture_score / 50  # Normalizar
            estimated_age = int(base_age + texture_factor * 15)
            
            # Limitar a rango razonable
            estimated_age = max(18, min(estimated_age, 70))
            
            # Calcular rango de confianza
            age_range = (max(18, estimated_age - 5), min(70, estimated_age + 5))
            
            # Confianza basada en calidad de imagen
            confidence = min(face.quality_score, 0.85)
            
            result = AgeEstimation(
                predicted_age=estimated_age,
                age_range=age_range,
                confidence=confidence,
                model_used="TextureAnalysis_v1"
            )
            
            logger.info(f"[PhotoVerification] Edad estimada: {estimated_age} años (confianza: {confidence:.2f})")
            
            return result
            
        except Exception as e:
            logger.error(f"[PhotoVerification] Error estimando edad: {e}")
            return None
    
    def _detect_filters(self, image: np.ndarray) -> FilterDetection:
        """Detectar filtros y edición en la imagen"""
        try:
            # Análisis de histograma para detectar edición
            # En producción incluiría:
            # - Detección de artefactos de compresión
            # - Análisis de histograma
            # - Detección de bordes artificiales
            # - Análisis de metadatos EXIF
            
            filter_types = []
            intensity_scores = []
            
            # 1. Análisis de saturación de color (filtros de belleza)
            hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
            saturation = np.mean(hsv[:, :, 1])
            if saturation > 150:  # Saturación alta
                filter_types.append('color')
                intensity_scores.append(min(saturation / 255, 1.0))
            
            # 2. Análisis de suavizado (filtros de belleza)
            # Comparar con versión ligeramente desenfocada
            blurred = cv2.GaussianBlur(image, (5, 5), 0)
            diff = cv2.absdiff(image, blurred)
            smooth_score = np.mean(diff) / 255
            
            if smooth_score < 10:  # Muy poca diferencia = posible suavizado
                filter_types.append('beauty')
                intensity_scores.append(1.0 - smooth_score / 10)
            
            # 3. Detección de distorsión (lentes de contacto, etc.)
            # Análisis de proporciones faciales
            intensity = np.mean(intensity_scores) if intensity_scores else 0
            
            # 4. Verificar si parece generada por IA
            # En producción usaría modelos específicos
            is_ai_generated = self._detect_ai_generation(image)
            if is_ai_generated:
                filter_types.append('ai_enhancement')
                intensity_scores.append(0.8)
            
            result = FilterDetection(
                has_filters=len(filter_types) > 0,
                filter_intensity=intensity,
                filter_types=filter_types,
                editing_score=intensity,
                is_ai_generated=is_ai_generated
            )
            
            logger.info(f"[PhotoVerification] Filtros detectados: {filter_types} (intensidad: {intensity:.2f})")
            
            return result
            
        except Exception as e:
            logger.error(f"[PhotoVerification] Error detectando filtros: {e}")
            return FilterDetection(has_filters=False, filter_intensity=0, filter_types=[], editing_score=0, is_ai_generated=False)
    
    def _detect_ai_generation(self, image: np.ndarray) -> bool:
        """Detectar si la imagen fue generada por IA"""
        try:
            # En producción usaría modelos específicos como:
            # - Detectores de deepfakes
            # - Análisis de patrones GAN
            # - Detección de artefactos de generación
            
            # Análisis simple de patrones
            # Las imágenes generadas por IA a menudo tienen patrones específicos
            
            # 1. Análisis de textura
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            
            # Calcular gradientes
            grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
            grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
            gradient_magnitude = np.sqrt(grad_x**2 + grad_y**2)
            
            # Las imágenes generadas por IA a menudo tienen gradientes más suaves
            gradient_variance = np.var(gradient_magnitude)
            
            # 2. Análisis de ruido
            noise_level = self._estimate_noise_level(image)
            
            # 3. Análisis de consistencia de color
            color_consistency = self._analyze_color_consistency(image)
            
            # Combinar factores
            ai_score = 0
            if gradient_variance < 500:  # Gradientes muy suaves
                ai_score += 0.3
            if noise_level < 0.02:  # Muy poco ruido
                ai_score += 0.3
            if color_consistency > 0.95:  # Colores demasiado consistentes
                ai_score += 0.4
            
            return ai_score > 0.7
            
        except Exception as e:
            logger.error(f"[PhotoVerification] Error detectando IA: {e}")
            return False
    
    def _analyze_content(self, image: np.ndarray) -> ContentAnalysis:
        """Análisis de contenido para detectar inadecuaciones"""
        try:
            inappropriate_flags = []
            
            # En producción usaría modelos de clasificación entrenados
            # Aquí simulamos con análisis básico
            
            # 1. Análisis de color (detección básica de piel)
            hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
            
            # Rangos de color para piel
            lower_skin = np.array([0, 20, 70], dtype=np.uint8)
            upper_skin = np.array([20, 255, 255], dtype=np.uint8)
            
            skin_mask = cv2.inRange(hsv, lower_skin, upper_skin)
            skin_percentage = np.sum(skin_mask > 0) / skin_mask.size
            
            # 2. Detección de nudidad (simplificada)
            nudity_detected = skin_percentage > 0.4  # Umbral conservador
            if nudity_detected:
                inappropriate_flags.append("excessive_skin_exposure")
            
            # 3. Análisis de texto (si hay texto en la imagen)
            contains_text, text_content = self._extract_text_from_image(image)
            
            # 4. Detección de spam
            spam_detected = self._detect_spam_in_text(text_content) if contains_text else False
            if spam_detected:
                inappropriate_flags.append("spam_content")
            
            # 5. Detección de violencia (colores rojos intensos)
            red_channel = image[:, :, 0]
            red_intensity = np.mean(red_channel)
            violence_suspected = red_intensity > 180  # Umbral simple
            
            # Determinar si es apropiado
            is_appropriate = len(inappropriate_flags) == 0 and not nudity_detected and not violence_suspected
            
            result = ContentAnalysis(
                is_appropriate=is_appropriate,
                inappropriate_flags=inappropriate_flags,
                nudity_detected=nudity_detected,
                violence_detected=violence_suspected,
                spam_detected=spam_detected,
                contains_text=contains_text,
                text_content=text_content
            )
            
            logger.info(f"[PhotoVerification] Contenido apropiado: {is_appropriate} - Flags: {inappropriate_flags}")
            
            return result
            
        except Exception as e:
            logger.error(f"[PhotoVerification] Error analizando contenido: {e}")
            return ContentAnalysis(
                is_appropriate=True,
                inappropriate_flags=["analysis_error"],
                nudity_detected=False,
                violence_detected=False,
                spam_detected=False,
                contains_text=False,
                text_content=""
            )
    
    def _assess_image_quality(self, image: np.ndarray) -> float:
        """Evaluar calidad técnica de la imagen"""
        try:
            quality_scores = []
            
            # 1. Nitidez
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            sharpness_score = min(laplacian_var / 1000, 1.0)
            quality_scores.append(sharpness_score)
            
            # 2. Brillo
            brightness = np.mean(gray)
            brightness_score = 1.0 if 40 < brightness < 220 else 0.5
            quality_scores.append(brightness_score)
            
            # 3. Contraste
            contrast = np.std(gray)
            contrast_score = min(contrast / 50, 1.0)
            quality_scores.append(contrast_score)
            
            # 4. Ruido
            noise_level = self._estimate_noise_level(image)
            noise_score = max(0, 1.0 - noise_level)
            quality_scores.append(noise_score)
            
            # 5. Saturación de color
            hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
            saturation = np.mean(hsv[:, :, 1])
            saturation_score = min(saturation / 128, 1.0)
            quality_scores.append(saturation_score)
            
            return np.mean(quality_scores)
            
        except Exception as e:
            logger.error(f"[PhotoVerification] Error evaluando calidad: {e}")
            return 0.5
    
    def _check_age_consistency(self, claimed_age: Optional[int], age_result: Optional[AgeEstimation]) -> Dict[str, any]:
        """Verificar consistencia entre edad declarada y estimada"""
        try:
            if claimed_age is None or age_result is None:
                return {"consistent": True, "difference": 0, "confidence": 0.5}
            
            # Calcular diferencia
            estimated_age = age_result.predicted_age
            difference = abs(claimed_age - estimated_age)
            
            # Determinar consistencia
            if difference <= 3:
                consistent = True
                confidence = 0.9
            elif difference <= 7:
                consistent = True
                confidence = 0.7
            else:
                consistent = False
                confidence = 0.3
            
            return {
                "consistent": consistent,
                "difference": difference,
                "confidence": confidence,
                "claimed_age": claimed_age,
                "estimated_age": estimated_age
            }
            
        except Exception as e:
            logger.error(f"[PhotoVerification] Error verificando consistencia de edad: {e}")
            return {"consistent": True, "difference": 0, "confidence": 0.5}
    
    def _calculate_verification_score(
        self, 
        is_real: bool, 
        filter_result: FilterDetection, 
        content_result: ContentAnalysis, 
        quality_score: float,
        age_consistency: Dict[str, any]
    ) -> float:
        """Calcular score final de verificación"""
        try:
            scores = []
            
            # 1. Real vs fake (30%)
            real_score = 1.0 if is_real else 0.0
            scores.append(real_score * 0.3)
            
            # 2. Filtros (25%)
            filter_score = max(0, 1.0 - filter_result.filter_intensity)
            scores.append(filter_score * 0.25)
            
            # 3. Contenido apropiado (20%)
            content_score = 1.0 if content_result.is_appropriate else 0.0
            scores.append(content_score * 0.2)
            
            # 4. Calidad de imagen (15%)
            quality_weighted = quality_score * 0.15
            scores.append(quality_weighted)
            
            # 5. Consistencia de edad (10%)
            age_score = age_consistency.get("confidence", 0.5)
            scores.append(age_score * 0.1)
            
            return sum(scores)
            
        except Exception as e:
            logger.error(f"[PhotoVerification] Error calculando score: {e}")
            return 0.0
    
    def _generate_recommendation(self, verification_score: float, filter_result: FilterDetection, content_result: ContentAnalysis) -> str:
        """Generar recomendación final"""
        try:
            if verification_score < 0.5:
                return "REJECT"
            elif verification_score < 0.7:
                return "REVIEW_REQUIRED"
            elif filter_result.filter_intensity > 0.3:
                return "FILTER_WARNING"
            elif not content_result.is_appropriate:
                return "CONTENT_VIOLATION"
            else:
                return "APPROVED"
                
        except Exception as e:
            logger.error(f"[PhotoVerification] Error generando recomendación: {e}")
            return "ERROR"
    
    def _generate_warnings(self, age_consistency: Dict[str, any], filter_result: FilterDetection, content_result: ContentAnalysis, quality_score: float) -> List[str]:
        """Generar advertencias"""
        warnings = []
        
        # Advertencias de edad
        if not age_consistency.get("consistent", True):
            diff = age_consistency.get("difference", 0)
            warnings.append(f"Diferencia significativa de edad detectada ({diff} años)")
        
        # Advertencias de filtros
        if filter_result.filter_intensity > 0.3:
            warnings.append("Filtros excesivos detectados")
        
        if filter_result.is_ai_generated:
            warnings.append("Posible imagen generada por IA")
        
        # Advertencias de contenido
        if content_result.inappropriate_flags:
            warnings.append(f"Contenido potencialmente inapropiado: {', '.join(content_result.inappropriate_flags)}")
        
        # Advertencias de calidad
        if quality_score < 0.6:
            warnings.append("Baja calidad de imagen")
        
        return warnings
    
    def _save_verification_result(self, user_id: str, image_url: str, result: PhotoVerificationResult):
        """Guardar resultado en Firestore para auditoría"""
        try:
            verification_data = {
                "userId": user_id,
                "imageUrl": image_url,
                "verificationResult": result.__dict__,
                "timestamp": firestore.SERVER_TIMESTAMP,
                "status": result.recommendation
            }
            
            self.db.collection('photo_verifications').add(verification_data)
            
            # Actualizar perfil del usuario con resultado
            user_ref = self.db.collection('users').document(user_id)
            user_ref.update({
                "photoVerificationStatus": result.recommendation,
                "photoVerificationScore": result.verification_score,
                "photoVerificationDate": firestore.SERVER_TIMESTAMP
            })
            
            logger.info(f"[PhotoVerification] Resultado guardado para usuario {user_id}")
            
        except Exception as e:
            logger.error(f"[PhotoVerification] Error guardando resultado: {e}")
    
    def _create_error_result(self, error_message: str, processing_time: int = 0) -> PhotoVerificationResult:
        """Crear resultado de error"""
        return PhotoVerificationResult(
            is_real_person=False,
            has_excessive_filters=False,
            is_appropriate=False,
            estimated_age=0,
            confidence=0.0,
            faces_detected=0,
            warnings=[error_message],
            details={"error": error_message},
            verification_score=0.0,
            recommendation="ERROR",
            processing_time_ms=processing_time
        )
    
    # Métodos auxiliares
    def _estimate_noise_level(self, image: np.ndarray) -> float:
        """Estimar nivel de ruido en la imagen"""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            
            # Usar desviación estándar como proxy de ruido
            noise = np.std(gray)
            
            # Normalizar
            return min(noise / 50, 1.0)
            
        except Exception:
            return 0.5
    
    def _analyze_color_consistency(self, image: np.ndarray) -> float:
        """Analizar consistencia de colores"""
        try:
            # Calcular histograma de colores
            hist_r = cv2.calcHist([image], [0], None, [256], [0, 256])
            hist_g = cv2.calcHist([image], [1], None, [256], [0, 256])
            hist_b = cv2.calcHist([image], [2], None, [256], [0, 256])
            
            # Calcular varianza de los histogramas
            variance_r = np.var(hist_r)
            variance_g = np.var(hist_g)
            variance_b = np.var(hist_b)
            
            # Consistencia alta = varianza baja
            avg_variance = (variance_r + variance_g + variance_b) / 3
            consistency = max(0, 1.0 - (avg_variance / 10000))
            
            return consistency
            
        except Exception:
            return 0.5
    
    def _extract_text_from_image(self, image: np.ndarray) -> Tuple[bool, str]:
        """Extraer texto de la imagen (OCR simplificado)"""
        try:
            # En producción usaría Tesseract OCR o similar
            # Aquí simulamos con análisis de patrones
            
            # Convertir a escala de grises
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            
            # Aplicar umbral para detectar regiones de texto
            _, thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
            
            # Detectar contornos que podrían ser texto
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Filtrar contornos por área y proporción
            text_regions = []
            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)
                area = w * h
                aspect_ratio = w / h if h > 0 else 0
                
                # Características de texto típico
                if area > 100 and 0.2 < aspect_ratio < 5:
                    text_regions.append((x, y, w, h))
            
            contains_text = len(text_regions) > 2  # Umbral simple
            
            # En producción, aquí extraeríamos el texto real
            text_content = "sample_text" if contains_text else ""
            
            return contains_text, text_content
            
        except Exception:
            return False, ""
    
    def _detect_spam_in_text(self, text: str) -> bool:
        """Detectar spam en el texto"""
        spam_keywords = ["promo", "free", "click", "visit", "http"]
        return any(keyword in text.lower() for keyword in spam_keywords)

# Instancia global del verificador de fotos
photo_verifier = PhotoVerification()
        try:
            if not text:
                return False
            
            # Palabras clave de spam comunes
            spam_keywords = [
                "click", "link", "http", "www", "free", "money", "earn",
                "buy", "sell", "discount", "offer", "deal", "promo"
            ]
            
            text_lower = text.lower()
            spam_score = sum(1 for keyword in spam_keywords if keyword in text_lower)
            
            return spam_score >= 2  # Umbral simple
            
        except Exception:
            return False

# Instancia global del verificador
photo_verifier = PhotoVerification()

def verify_user_photo(image_url: str, claimed_age: Optional[int] = None, user_id: Optional[str] = None) -> Dict:
    """
    Función de utilidad para verificar fotos de usuarios
    
    Args:
        image_url: URL de la imagen
        claimed_age: Edad declarada
        user_id: ID del usuario
        
    Returns:
        Resultado de verificación como diccionario
    """
    result = photo_verifier.verify_photo(image_url, claimed_age, user_id)
    return result.__dict__
