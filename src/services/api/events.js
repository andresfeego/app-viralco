import { apiRequest } from './http';

export function listEventsApi() {
  return apiRequest('/api/events', { method: 'GET' });
}

export function getEventDetailApi(eventId) {
  return apiRequest(`/api/events/${eventId}`, { method: 'GET' });
}

export function createEventApi(input) {
  return apiRequest('/api/events', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateEventApi(eventId, input) {
  return apiRequest(`/api/events/${eventId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function updateEventBrandingApi(eventId, input) {
  return apiRequest(`/api/events/${eventId}/branding`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function listEventOverlaysApi(eventId) {
  return apiRequest(`/api/events/${eventId}/overlays`, { method: 'GET' });
}

export function createEventOverlayApi(eventId, input) {
  return apiRequest(`/api/events/${eventId}/overlays`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateEventOverlayApi(eventId, overlayId, input) {
  return apiRequest(`/api/events/${eventId}/overlays/${overlayId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
