# Encuestas pacientes · Dr. Gabriel Morales

Proyecto independiente para encuestas de experiencia de pacientes del Dr. Gabriel Morales.

## Encuestas
- Labioplastia
- Fertilidad

## Arquitectura objetivo
Kommo → enlace personalizado → encuesta web → Supabase → seguimiento en Kommo.

La intención es operar **sin n8n** para este flujo.

## Estado
Primera versión visual creada. Falta conectar el envío seguro de respuestas a Supabase y después configurar la automatización en Kommo.

## Parámetros de enlace
Las encuestas aceptan:
- `lead`: ID del lead de Kommo
- `n`: nombre de la paciente

Ejemplo:
`labioplastia.html?lead=123456&n=Ana`
