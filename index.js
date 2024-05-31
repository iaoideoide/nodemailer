import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const port = process.env.PORT;

const allowedOrigins = ['http://localhost:3000', 'https://iaoideoide.github.io'];
const corsOptions = {
    origin: function (origin, callback) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            console.error(`No permitido por CORS: ${origin}`);
            callback(new Error('No permitido por CORS'));
        }
    },
};

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // Limita cada IP a 10 solicitudes por ventana de 15 minutos
    message: "Demasiadas solicitudes desde esta IP, por favor intente de nuevo después de 15 minutos",
});

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api/mail', limiter);

app.post('/api/mail', [
    body('nombre').isString().notEmpty().trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('telefono').isString().notEmpty().trim().escape(),
    body('mensaje').isString().notEmpty().trim().escape(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, email, telefono, mensaje } = req.body;

    const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    // Verificar la conexión del transporte
    transporter.verify((error, success) => {
        if (error) {
            console.error('Error en la configuración del transporte de nodemailer:', error);
            return res.status(500).send({ error: 'Error en la configuración del transporte de correo' });
        }
    });

    try {
        const info = await transporter.sendMail({
            from: `"Pagina Contacto" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_RECIEVER,
            subject: `Mensaje de ${nombre}`,
            text: `Nombre: ${nombre}\nEmail: ${email}\nTeléfono: ${telefono}\nMensaje: ${mensaje}`,
            html: `<b>Nombre:</b> ${nombre}<br><b>Email:</b> ${email}<br><b>Teléfono:</b> ${telefono}<br><b>Mensaje:</b> ${mensaje}`,
        });

        console.log("Message sent: %s", info.messageId);
        res.send({ message: "Email enviado exitosamente" });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Error al enviar el email" });
    }
});

app.listen(port, () => {
    console.log('Aplicación abierta en el puerto:', port);
});
