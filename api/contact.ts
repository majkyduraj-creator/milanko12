/**
 * Serverless funkcia pre Vercel: POST /api/contact
 * Premenné prostredia nastavte v projekte Vercel (pozri README).
 */
import { contactNodeHandler } from '../server/node-adapter';

export default contactNodeHandler;
