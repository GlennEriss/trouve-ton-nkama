import * as nodemailer from 'nodemailer';
import { createEmailTransport } from '../../src/email/transport';
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
it.each([['admin@gmail.com', 'smtp.gmail.com'], ['contact@tonnkama.com', 'smtp.hostinger.com']])('sélectionne le SMTP pour %s', (user, host) => {
  createEmailTransport(user, 'test-only');
  expect(nodemailer.createTransport).toHaveBeenLastCalledWith(expect.objectContaining({ host, port: 465, secure: true }));
});
it('refuse les credentials absents', () => expect(() => createEmailTransport('', '')).toThrow());
