console.log("Iniciando el servidor...");

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

// !! DIRECCIÓN DE ORIGEN ACTUALIZADA !!
const DIRECCION_ORIGEN = "Río Aconcagua 683, Padre Hurtado, Región Metropolitana de Santiago";

// --- !! TABULADOR DE PRECIOS ACTUALIZADO CON TUS VALORES !! ---
// La distancia está en kilómetros.
const TABULADOR_PRECIOS = [
    { distanciaMaxima: 1.49, precio: 1200 }, // 0 a 1.49 km
    { distanciaMaxima: 2.49, precio: 1500 }, // 1.5 km a 2.49 km
    { distanciaMaxima: 3.49, precio: 1800 }, // 2.5 a 3.49 km
    { distanciaMaxima: 4.4,  precio: 2200 }, // 3.5 a 4.4 km
    { distanciaMaxima: 6,    precio: 3000 }, // 4.41 a 6 km
];
const PRECIO_FUERA_DE_RANGO = "Fuera de zona"; // Para distancias mayores a 6 km

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
        // Ordenamos el tabulador por si acaso está desordenado
        const tabuladorOrdenado = TABULADOR_PRECIOS.sort((a, b) => a.distanciaMaxima - b.distanciaMaxima);

        for (const tramo of tabuladorOrdenado) {
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
        console.error("Error en la llamada a Google Maps:", error.message);
        res.status(500).json({ costo: PRECIO_FUERA_DE_RANGO, error: "Error interno del servidor." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de cálculo de despacho escuchando en el puerto ${PORT}`);
});


