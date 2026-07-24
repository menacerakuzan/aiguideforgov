/**
 * Mailer — інтерфейс надсилання листів. Локальна реалізація пише в консоль;
 * production-реалізація (Resend) підставляється без зміни викликів.
 */
export interface Mailer {
  send(input: { to: string; subject: string; text: string }): Promise<void>;
}

export class ConsoleMailer implements Mailer {
  async send(input: { to: string; subject: string; text: string }): Promise<void> {
    console.log(`\n[ConsoleMailer] Лист до ${input.to}\nТема: ${input.subject}\n\n${input.text}\n`);
  }
}
