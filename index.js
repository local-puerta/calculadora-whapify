console.log("Iniciando el servidor..."); // Mensaje de prueba

// Importamos las herramientas necesarias
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- CONFIGURACIÓN IMPORTANTE ---
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// !! MODIFICA AQUÍ LA DIRECCIÓN DE TU RESTAURANTE !!
const DIRECCION_ORIGEN = "Av. Providencia 2124, Providencia, Santiago, Chile";

// --- DEFINE TU TABULADOR DE PRECIOS AQUÍ ---
const TABULADOR_PRECIOS = [
    { distanciaMaxima: 3, precio: 2000 },
    { distanciaMaxima: 5, precio: 3000 },
    { distanciaMaxima: 8, precio: 4500 },
    { distanciaMaxima: 10, precio: 6000 },
];
const PRECIO_FUERA_DE_RANGO = "Fuera de zona";

// Ruta que Whapify llamará
app.post('/calcular-despacho', async (req, res) => {
    const { destino } = req.body;

    if (!destino || !GOOGLE_MAPS_API_KEY) {
        return res.status(400).json({ error: "Falta el destino o la clave de API no está configurada." });
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(DIRECCION_ORIGEN)}&destination=${encodeURIComponent(destino)}&key=${GOOGLE_MAPS_API_KEY}&region=CL`;

    try {
        const response = await axios.get(url);
        const data = response.data;

        if (data.status !== 'OK' || !data.routes.length) {
            return res.json({ costo: PRECIO_FUERA_DE_RANGO, error: "No se pudo encontrar la ruta." });
        }

        const distanciaEnMetros = data.routes[0].legs[0].distance.value;
        const distanciaEnKm = distanciaEnMetros / 1000;

        let costoDespacho = PRECIO_FUERA_DE_RANGO;
        for (const tramo of TABULADOR_PRECIOS) {
            if (distanciaEnKm <= tramo.distanciaMaxima) {
                costoDespacho = tramo.precio;
                break;
            }
        }
        
        res.json({
            costo: costoDespacho,
            distancia_km: distanciaEnKm.toFixed(2)
        });

    } catch (error) {
        res.status(500).json({ costo: PRECIO_FUERA_DE_RANGO, error: "Error interno del servidor." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de cálculo de despacho escuchando en el puerto ${PORT}`);
});
