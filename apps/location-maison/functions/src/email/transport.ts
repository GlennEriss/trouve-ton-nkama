import * as nodemailer from 'nodemailer';

/** Transport partagé avec les e-mails de vérification ; aucun secret dans les logs. */
export function createEmailTransport(user: string, pass: string) {
  if (!user || !pass) throw new Error('Configuration SMTP manquante');
  return nodemailer.createTransport({
    host: user.toLowerCase().endsWith('@gmail.com') ? 'smtp.gmail.com' : 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });
}
