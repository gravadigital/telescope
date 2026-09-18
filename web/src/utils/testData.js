// Script para crear datos de prueba en la API
// Puedes ejecutar estas funciones desde la consola del navegador

import { API_CONFIG, apiRequest } from '../config/api';

export const createTestEvents = async () => {
  const events = [
    {
      name: "Concurso de Fotografía Digital 2025",
      description: "Muestra tu talento en fotografía digital. Categorías: paisajes, retratos, arquitectura.",
      start_date: "2025-08-25",
      end_date: "2025-09-15"
    },
    {
      name: "Hackathon Telescopio",
      description: "Desarrolla la próxima gran aplicación en 48 horas. Premios para las mejores ideas.",
      start_date: "2025-09-01",
      end_date: "2025-09-03"
    },
    {
      name: "Concurso de Arte Digital",
      description: "Creatividad sin límites. Ilustraciones, diseños, arte conceptual.",
      start_date: "2025-09-10",
      end_date: "2025-09-30"
    }
  ];

  console.log('Creando eventos de prueba...');
  
  for (const event of events) {
    try {
      const result = await apiRequest(API_CONFIG.ENDPOINTS.EVENTS, {
        method: 'POST',
        body: JSON.stringify(event)
      });
      console.log('Evento creado:', result);
    } catch (error) {
      console.error('Error creando evento:', error);
    }
  }
};

export const updateEventToParticipation = async (eventId) => {
  try {
    const result = await apiRequest(API_CONFIG.ENDPOINTS.EVENT_STAGE(eventId), {
      method: 'PATCH',
      body: JSON.stringify({ stage: 'participation' })
    });
    console.log('Evento actualizado a participación:', result);
    return result;
  } catch (error) {
    console.error('Error actualizando evento:', error);
  }
};

// Función helper para mostrar instrucciones en la consola
export const showTestInstructions = () => {
  console.log(`
🔧 INSTRUCCIONES PARA PROBAR EL FLUJO:

1. Abrir la consola del navegador (F12)
2. Ejecutar los siguientes comandos:

// Crear eventos de prueba
import { createTestEvents, updateEventToParticipation } from './src/utils/testData.js';
await createTestEvents();

// Obtener la lista de eventos para ver sus IDs
const events = await fetch('http://localhost:8080/api/events').then(r => r.json());
console.log('Eventos:', events);

// Actualizar un evento a fase de participación (usar el ID del evento)
await updateEventToParticipation('EVENT_ID_AQUI');

3. FLUJO DE PRUEBA:
   - Ver eventos sin estar logueado ✅
   - Hacer login como usuario
   - Registrarse y subir archivo en fase 'participation' (unificada)
   - Avanzar evento a fase 'voting'
   - Votar
   
4. COMANDOS ÚTILES:
   - Ver todos los eventos: fetch('http://localhost:8080/api/events').then(r => r.json())
   - Ver participantes: fetch('http://localhost:8080/api/events/EVENT_ID/participants').then(r => r.json())
  `);
};

// Función para limpiar localStorage (logout manual)
export const clearAuth = () => {
  localStorage.removeItem('telescopio_user');
  window.location.reload();
};

// Exponer funciones globalmente para testing
if (typeof window !== 'undefined') {
  window.telescopioTest = {
    createTestEvents,
    updateEventToParticipation,
    showTestInstructions,
    clearAuth
  };
}
