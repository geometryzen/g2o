import { root } from './root.js';

export const performance = ((root.performance && root.performance.now) ? root.performance : Date);
