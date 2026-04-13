
export enum InspectionStatus {
  AMAN = 'Aman',
  PERBAIKAN = 'Perlu Perbaikan'
}

export enum ReadinessStatus {
  SIAGA = 'SIAGA (READY TO FIGHT)',
  SIAGA_TERBATAS = 'SIAGA TERBATAS',
  OFF_SERVICE = 'OFF-SERVICE (RUSAK)'
}

export interface InspectionData {
  id: string;
  timestamp: string;
  personnelName: string;
  unitNumber: string;
  odometer: number;
  engineOilRadiator: InspectionStatus;
  electricalLights: InspectionStatus;
  sirenHorn: InspectionStatus;
  tireCondition: InspectionStatus;
  pumpPTO: InspectionStatus;
  tankCondition: InspectionStatus;
  hoseCondition: InspectionStatus;
  nozzleCondition: InspectionStatus;
  brakesCondition: InspectionStatus;
  fuelLevel: number;
  waterLevel: number;
  notes: string;
  status: ReadinessStatus;
  aiDraft?: string;
  statusSync: 'pending' | 'synced';
}

export interface UnitInfo {
  id: string;
  name: string;
  location: string;
}

export interface AIConfig {
  draftInstruction: string;
  summaryInstruction: string;
}
