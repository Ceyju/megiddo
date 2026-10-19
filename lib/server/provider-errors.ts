export class ProviderNotFoundError extends Error {
  constructor(message = 'Content not found') {
    super(message);
    this.name = 'ProviderNotFoundError';
  }
}
