export class CLIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly suggestion?: string,
    public readonly exitCode: number = 1,
  ) {
    super(message);
    this.name = 'CLIError';
  }
}
