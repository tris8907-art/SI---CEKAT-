
import { GoogleGenAI } from "@google/genai";
import { InspectionData } from "../types";

// Use VITE_GEMINI_API_KEY for client-side Vite apps (Vercel/Production)
// Fallback to process.env.GEMINI_API_KEY for the AI Studio preview environment
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export async function generateDraftMessage(data: InspectionData, instruction: string) {
  try {
    const prompt = `
      Unit: ${data.unitNumber}
      Personel Pelapor: ${data.personnelName}
      Status Kesiapan: ${data.status}
      BBM: ${data.fuelLevel}%
      Air Tangki: ${data.waterLevel}%
      Detail Kendala: ${data.notes}
      Timestamp: ${new Date(data.timestamp).toLocaleString('id-ID')}.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: instruction
      }
    });

    return response.text;
  } catch (error) {
    console.error(error);
    return "Gagal membuat draf laporan.";
  }
}

export async function generateDailySummary(history: InspectionData[], instruction: string) {
  try {
    // Group reports by unit to get the latest status for each unit
    const latestReports: { [key: string]: InspectionData } = {};
    history.forEach(report => {
      if (!latestReports[report.unitNumber] || new Date(report.timestamp) > new Date(latestReports[report.unitNumber].timestamp)) {
        latestReports[report.unitNumber] = report;
      }
    });

    const fleetStatus = Object.values(latestReports).map(r => ({
      unit: r.unitNumber,
      status: r.status,
      fuel: `${r.fuelLevel}%`,
      water: `${r.waterLevel}%`,
      notes: r.notes,
      lastUpdate: new Date(r.timestamp).toLocaleString('id-ID')
    }));

    const prompt = `
      DATA OPERASIONAL ARMADA TERBARU:
      ${JSON.stringify(fleetStatus, null, 2)}

      INSTRUKSI ANALISIS:
      ${instruction}
      
      FORMAT OUTPUT (WAJIB JSON):
      {
        "fleetSummary": "Ringkasan eksekutif kondisi seluruh armada saat ini.",
        "unitPredictions": [
          {
            "unit": "Nama Unit",
            "risk": 0-100 (angka tingkat risiko operasional),
            "prediction": "Analisis prediktif singkat (misal: estimasi kapan BBM habis atau potensi kerusakan berdasarkan catatan)."
          }
        ]
      }

      HARAP PERHATIKAN:
      1. Berikan analisis untuk SEMUA unit yang ada di data (biasanya 3 unit).
      2. Jika data unit tidak ada, berikan prediksi default 'Data Belum Tersedia'.
      3. Pastikan output HANYA berupa JSON yang valid agar bisa diproses sistem.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah analis intelijen operasional Damkar Seluma. Tugas Anda adalah memberikan analisis prediktif yang akurat dalam format JSON murni.",
        responseMimeType: "application/json"
      }
    });

    return response.text;
  } catch (error) {
    console.error(error);
    return "Gagal memproses ringkasan intelijen.";
  }
}
