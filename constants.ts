
import { UnitInfo, AIConfig } from './types';

export const UNITS: UnitInfo[] = [
  { id: 'UNIT-01', name: 'Unit 01 Tais', location: 'Pos Tais' },
  { id: 'UNIT-02', name: 'Unit 02 Sukaraja', location: 'Pos Sukaraja' },
  { id: 'UNIT-03', name: 'Unit 03 Semidang Alas Maras', location: 'Pos Semidang Alas Maras' }
];

export const MOCK_HISTORY = [];

export const DEFAULT_AI_CONFIG: AIConfig = {
  draftInstruction: "Anda adalah asisten pelaporan teknis pemadam kebakaran profesional. Buat draf laporan singkat dan sangat tegas untuk Kabid Sarpras mengenai kerusakan armada.",
  summaryInstruction: "Analisis kondisi teknis dan operasional dari 3 unit armada Damkar Seluma. Berikan prediksi kapan unit akan membutuhkan pengisian ulang (BBM/Air) atau pemeliharaan berdasarkan tren data dan catatan kendala. Fokus pada kesiapan tempur (Combat Readiness)."
};
