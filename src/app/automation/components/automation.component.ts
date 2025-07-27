import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AutomationRuleService } from '../services/automation-rule.service';
import { Device } from '../../devices/services/device.service';
import {
  AutomationRule,
  AutomationRuleCreateRequest,
  TRIGGER_METRICS,
  COMPARISON_OPERATORS,
  ACTION_CAPABILITIES,
  ACTION_PAYLOADS,
  ActionCapability,
  TriggerMetric,
} from '../models/automation-rule.model';

@Component({
  selector: 'app-automation',
  templateUrl: './automation.component.html',
  styleUrls: ['./automation.component.css'],
})
export class AutomationComponent implements OnInit {
  rules: AutomationRule[] = [];
  devices: Device[] = [];
  sensorDevices: Device[] = [];
  actionDevices: Device[] = [];

  ruleForm: FormGroup;
  isEditing = false;
  editingRuleId?: number;
  showForm = false;
  loading = false;

  // Opciones para los selects
  triggerMetrics = TRIGGER_METRICS;
  comparisonOperators = COMPARISON_OPERATORS;
  actionCapabilities = ACTION_CAPABILITIES;
  actionPayloads = ACTION_PAYLOADS;

  constructor(
    private automationService: AutomationRuleService,
    private fb: FormBuilder
  ) {
    this.ruleForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadRules();
    this.loadDevices();
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      trigger_device_mac: ['', Validators.required],
      trigger_metric: ['', Validators.required],
      comparison_operator: ['', Validators.required],
      threshold_value: [0, [Validators.required, Validators.min(0)]],
      action_device_mac: ['', Validators.required],
      action_capability_id: ['', Validators.required],
      action_payload: ['', Validators.required],
      active_time_start: [''],
      active_time_end: [''],
    });
  }

  loadRules(): void {
    this.loading = true;
    this.automationService.getUserRules().subscribe({
      next: (rules) => {
        this.rules = rules;
        console.log('📋 Reglas cargadas:', rules);
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error al cargar reglas:', error);
        this.loading = false;
      },
    });
  }

  loadDevices(): void {
    this.automationService.getAllUserDevices().subscribe({
      next: (devices) => {
        this.devices = devices;
        // Filtrar dispositivos de sensado: SOLO device_type_id = 2 (nodo de sensado)
        this.sensorDevices = devices.filter(
          (device) => device.device_type_id === 2
        );
        // Filtrar dispositivos de acción: TODOS los demás tipos (no tipo 2)
        this.actionDevices = devices.filter(
          (device) => device.device_type_id !== 2
        );

        console.log('🛰️ Dispositivos cargados:', {
          total: devices.length,
          sensors: this.sensorDevices.length,
          actions: this.actionDevices.length,
        });

        console.log(
          '📡 Nodos de sensado (tipo 2):',
          this.sensorDevices.map((d) => ({
            name: d.name,
            mac: d.mac_address,
            type: d.device_type_id,
          }))
        );

        console.log(
          '⚡ Dispositivos de acción (no tipo 2):',
          this.actionDevices.map((d) => ({
            name: d.name,
            mac: d.mac_address,
            type: d.device_type_id,
          }))
        );

        // Advertir si no hay dispositivos del tipo requerido
        if (this.sensorDevices.length === 0) {
          console.warn(
            '⚠️ No se encontraron nodos de sensado (device_type_id = 2)'
          );
        }
        if (this.actionDevices.length === 0) {
          console.warn(
            '⚠️ No se encontraron dispositivos de acción (device_type_id != 2)'
          );
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar dispositivos:', error);
      },
    });
  }

  onTriggerMetricChange(): void {
    const metric = this.ruleForm.get('trigger_metric')?.value as TriggerMetric;

    // Limpiar threshold_value si es métrica de tiempo
    if (metric === 'workday_start' || metric === 'workday_end') {
      this.ruleForm.patchValue({ threshold_value: 0 });
    }
  }

  onActionCapabilityChange(): void {
    // Limpiar action_payload cuando cambia la capacidad
    this.ruleForm.patchValue({ action_payload: '' });
  }

  getAvailablePayloads(): { value: string; label: string }[] {
    const capability = this.ruleForm.get('action_capability_id')
      ?.value as ActionCapability;
    return capability ? this.actionPayloads[capability] : [];
  }

  showCreateForm(): void {
    this.isEditing = false;
    this.editingRuleId = undefined;
    this.ruleForm.reset();

    // Habilitar todos los campos para creación
    this.ruleForm.get('trigger_device_mac')?.enable();
    this.ruleForm.get('trigger_metric')?.enable();
    this.ruleForm.get('comparison_operator')?.enable();
    this.ruleForm.get('action_device_mac')?.enable();
    this.ruleForm.get('action_capability_id')?.enable();
    this.ruleForm.get('action_payload')?.enable();

    this.showForm = true;
  }

  editRule(rule: AutomationRule): void {
    this.isEditing = true;
    this.editingRuleId = rule.id;

    // Llenar todos los campos para mostrar información completa
    this.ruleForm.patchValue({
      name: rule.name,
      trigger_device_mac: rule.trigger_device_mac,
      trigger_metric: rule.trigger_metric,
      comparison_operator: rule.comparison_operator,
      threshold_value: rule.threshold_value,
      action_device_mac: rule.action_device_mac,
      action_capability_id: rule.action_capability_id,
      action_payload: rule.action_payload,
      active_time_start: rule.active_time_start || '',
      active_time_end: rule.active_time_end || '',
    });

    // Deshabilitar campos que NO se pueden editar en modo edición
    this.ruleForm.get('trigger_device_mac')?.disable();
    this.ruleForm.get('trigger_metric')?.disable();
    this.ruleForm.get('comparison_operator')?.disable();
    this.ruleForm.get('action_device_mac')?.disable();
    this.ruleForm.get('action_capability_id')?.disable();
    this.ruleForm.get('action_payload')?.disable();

    this.showForm = true;
  }

  saveRule(): void {
    if (this.ruleForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const formValue = this.ruleForm.value;
    this.loading = true;

    if (this.isEditing && this.editingRuleId) {
      // En modo edición, necesito enviar TODOS los campos al API
      // Pero solo los campos editables se pueden modificar desde el formulario

      // Obtener la regla actual para conservar los valores no editables
      const currentRule = this.rules.find((r) => r.id === this.editingRuleId);

      if (!currentRule) {
        console.error('❌ No se encontró la regla actual para editar');
        this.loading = false;
        return;
      }

      const completeRuleData = {
        name: formValue.name, // Editable
        is_active: currentRule.is_active, // Conservar valor actual
        trigger_device_mac: currentRule.trigger_device_mac, // No editable
        trigger_metric: currentRule.trigger_metric, // No editable
        comparison_operator: currentRule.comparison_operator, // No editable
        threshold_value: formValue.threshold_value, // Editable
        action_device_mac: currentRule.action_device_mac, // No editable
        action_capability_id: currentRule.action_capability_id, // No editable
        action_payload: currentRule.action_payload, // No editable
        active_time_start: formValue.active_time_start || undefined, // Editable
        active_time_end: formValue.active_time_end || undefined, // Editable
      };

      console.log(
        '📝 Datos completos a enviar (editables + no editables):',
        completeRuleData
      );

      this.automationService
        .updateRule(this.editingRuleId, completeRuleData)
        .subscribe({
          next: (updatedRule) => {
            console.log('✅ Regla actualizada:', updatedRule);
            this.loadRules();
            this.cancelForm();
            this.loading = false;
          },
          error: (error) => {
            console.error('❌ Error al actualizar regla:', error);
            this.loading = false;
          },
        });
    } else {
      // En modo creación, enviar todos los campos con is_active: true por defecto
      const ruleData: AutomationRuleCreateRequest = {
        ...formValue,
        is_active: true, // Siempre true por defecto en creación
        active_time_start: formValue.active_time_start || undefined,
        active_time_end: formValue.active_time_end || undefined,
      };

      console.log('✨ Creando regla con is_active: true por defecto');

      this.automationService.createRule(ruleData).subscribe({
        next: (newRule) => {
          console.log('✅ Regla creada:', newRule);
          this.loadRules();
          this.cancelForm();
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error al crear regla:', error);
          this.loading = false;
        },
      });
    }
  }

  deleteRule(id: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar esta regla?')) {
      this.loading = true;
      this.automationService.deleteRule(id).subscribe({
        next: () => {
          console.log('🗑️ Regla eliminada');
          this.loadRules();
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error al eliminar regla:', error);
          this.loading = false;
        },
      });
    }
  }

  toggleRuleStatus(rule: AutomationRule): void {
    if (!rule.id) return;

    this.loading = true;
    this.automationService
      .updateRuleStatus(rule.id, { is_active: !rule.is_active })
      .subscribe({
        next: (updatedRule) => {
          console.log('🔄 Estado de regla actualizado:', updatedRule);
          this.loadRules();
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error al cambiar estado:', error);
          this.loading = false;
        },
      });
  }

  cancelForm(): void {
    this.showForm = false;
    this.isEditing = false;
    this.editingRuleId = undefined;

    // Habilitar todos los campos antes de resetear
    this.ruleForm.get('trigger_device_mac')?.enable();
    this.ruleForm.get('trigger_metric')?.enable();
    this.ruleForm.get('comparison_operator')?.enable();
    this.ruleForm.get('action_device_mac')?.enable();
    this.ruleForm.get('action_capability_id')?.enable();
    this.ruleForm.get('action_payload')?.enable();

    this.ruleForm.reset();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.ruleForm.controls).forEach((key) => {
      this.ruleForm.get(key)?.markAsTouched();
    });
  }

  // Verificar si un campo es editable en modo edición
  isFieldEditable(fieldName: string): boolean {
    const editableFields = [
      'name',
      'threshold_value',
      'active_time_start',
      'active_time_end',
    ];
    return !this.isEditing || editableFields.includes(fieldName);
  }

  // Métodos auxiliares para la vista
  getDeviceName(mac: string): string {
    const device = this.devices.find((d) => d.mac_address === mac);
    return device ? device.name : mac;
  }

  getTriggerMetricLabel(metric: TriggerMetric): string {
    const metricObj = this.triggerMetrics.find((m) => m.value === metric);
    return metricObj ? metricObj.label : metric;
  }

  getComparisonOperatorLabel(operator: string): string {
    const operatorObj = this.comparisonOperators.find(
      (o) => o.value === operator
    );
    return operatorObj ? operatorObj.label : operator;
  }

  getActionCapabilityLabel(capability: ActionCapability): string {
    const capabilityObj = this.actionCapabilities.find(
      (c) => c.value === capability
    );
    return capabilityObj ? capabilityObj.label : capability.toString();
  }

  formatTime(time?: string): string {
    if (!time) return 'No definido';
    return time.substring(0, 5); // Mostrar solo HH:MM
  }

  getActiveRulesCount(): number {
    return this.rules.filter((rule) => rule.is_active).length;
  }

  getInactiveRulesCount(): number {
    return this.rules.filter((rule) => !rule.is_active).length;
  }
}
