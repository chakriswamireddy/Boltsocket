/**
 * Custom error classes for better error handling
 */

export class EventRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventRegistryError';
  }
}

export class UnknownEventError extends EventRegistryError {
  constructor(eventName: string) {
    super(`Unknown event: "${eventName}"`);
    this.name = 'UnknownEventError';
  }
}

export class ValidationError extends EventRegistryError {
  constructor(eventName: string, details: string) {
    super(`Validation failed for event "${eventName}": ${details}`);
    this.name = 'ValidationError';
  }
}

export class InvalidSchemaError extends EventRegistryError {
  constructor(eventName: string, reason: string) {
    super(`Invalid schema for event "${eventName}": ${reason}`);
    this.name = 'InvalidSchemaError';
  }
}
