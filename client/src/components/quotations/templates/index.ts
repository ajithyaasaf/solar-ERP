export { BaseTemplate } from './base-template';
export { OnGridTemplate } from './on-grid-template';
export { TemplateEngine } from './template-engine';

import { BaseTemplate } from './base-template';
import { OnGridTemplate } from './on-grid-template';

// Template type mapping for dynamic template selection
export const TEMPLATE_COMPONENTS = {
  base_template: BaseTemplate,
  on_grid_template: OnGridTemplate,
  off_grid_template: BaseTemplate, // Will be implemented later
  hybrid_template: BaseTemplate,   // Will be implemented later
  water_heater_template: BaseTemplate, // Will be implemented later
  water_pump_template: BaseTemplate    // Will be implemented later
} as const;

export type TemplateType = keyof typeof TEMPLATE_COMPONENTS;