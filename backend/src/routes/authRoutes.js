import { Router } from 'express';
import * as c from '../controllers/authController.js';
import { wajibLogin } from '../services/authService.js';

export default Router()
  .post('/login', c.login)
  .get('/saya', wajibLogin, c.sesiSaya);