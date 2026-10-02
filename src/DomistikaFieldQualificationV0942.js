import './v0942/fieldQualificationRuntime.js';
import './v0942/fieldQualificationPanel.js';

export const VERSION = '0.9.42';
export const SCHEMA = 'domistika.field-qualification.v1';

if (typeof document !== 'undefined') {
  document.documentElement.dataset.fieldQualification = VERSION;
}
