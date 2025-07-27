export interface AutomationRule {
  id?: number;
  user_id?: number;
  name: string;
  is_active: boolean;
  trigger_device_mac: string;
  trigger_metric: TriggerMetric;
  comparison_operator: ComparisonOperator;
  threshold_value: number;
  action_device_mac: string;
  action_capability_id: ActionCapability;
  action_payload: string;
  active_time_start?: string;
  active_time_end?: string;
  created_at?: string;
  updated_at?: string;
}

export type TriggerMetric =
  | 'motion'
  | 'temperature'
  | 'humidity'
  | 'lux'
  | 'voltage'
  | 'current'
  | 'power'
  | 'energy'
  | 'frequency'
  | 'pf'
  | 'workday_start'
  | 'workday_end';

export type ComparisonOperator =
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'EQUAL'
  | 'NOT_EQUAL';

export type ActionCapability = 1 | 2; // 1: RELAY_CONTROL, 2: INFRARED_EMITTER

export interface AutomationRuleCreateRequest {
  name: string;
  is_active: boolean;
  trigger_device_mac: string;
  trigger_metric: TriggerMetric;
  comparison_operator: ComparisonOperator;
  threshold_value: number;
  action_device_mac: string;
  action_capability_id: ActionCapability;
  action_payload: string;
  active_time_start?: string;
  active_time_end?: string;
}

export interface AutomationRuleUpdateRequest
  extends Partial<AutomationRuleCreateRequest> {}

export interface AutomationRuleStatusUpdate {
  is_active: boolean;
}

export interface AutomationRuleScheduleUpdate {
  active_time_start: string;
  active_time_end: string;
}

// Opciones para los selects del formulario
export const TRIGGER_METRICS: { value: TriggerMetric; label: string }[] = [
  { value: 'motion', label: 'Movimiento' },
  { value: 'temperature', label: 'Temperatura' },
  { value: 'humidity', label: 'Humedad' },
  { value: 'lux', label: 'Luz (Lux)' },
  { value: 'voltage', label: 'Voltaje' },
  { value: 'current', label: 'Corriente' },
  { value: 'power', label: 'Potencia' },
  { value: 'energy', label: 'Energía' },
  { value: 'frequency', label: 'Frecuencia' },
  { value: 'pf', label: 'Factor de Potencia' },
  { value: 'workday_start', label: 'Inicio de Jornada' },
  { value: 'workday_end', label: 'Fin de Jornada' },
];

export const COMPARISON_OPERATORS: {
  value: ComparisonOperator;
  label: string;
}[] = [
  { value: 'GREATER_THAN', label: 'Mayor que (>)' },
  { value: 'LESS_THAN', label: 'Menor que (<)' },
  { value: 'EQUAL', label: 'Igual a (=)' },
  { value: 'NOT_EQUAL', label: 'Diferente de (≠)' },
];

export const ACTION_CAPABILITIES: { value: ActionCapability; label: string }[] =
  [
    { value: 1, label: 'Control de Relevador' },
    { value: 2, label: 'Emisor Infrarrojo' },
  ];

export const ACTION_PAYLOADS: {
  [key in ActionCapability]: { value: string; label: string }[];
} = {
  1: [
    // RELAY_CONTROL
    { value: 'ON', label: 'Encender' },
    { value: 'OFF', label: 'Apagar' },
  ],
  2: [
    // INFRARED_EMITTER
    { value: 'ON', label: 'Encender' },
    { value: 'OFF', label: 'Apagar' },
  ],
};
