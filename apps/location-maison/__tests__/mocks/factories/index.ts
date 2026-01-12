/**
 * Index des factories de mocks
 * 
 * Usage:
 * ```typescript
 * import { UserFactory, PropertyFactory, CreditPurchaseFactory } from '@mocks/factories';
 * 
 * const user = UserFactory.createAnnouncer();
 * const property = PropertyFactory.createApartment();
 * const purchase = CreditPurchaseFactory.createCompleted();
 * ```
 */

// User factories
export { UserFactory } from './user.factory';

// Property factories
export { PropertyFactory } from './property.factory';

// Transaction factories
export {
  CreditPackFactory,
  CreditPurchaseFactory,
  CreditExpenseFactory,
  CreditWalletFactory,
} from './transaction.factory';

// Re-export default pour compatibilité
import { UserFactory } from './user.factory';
import { PropertyFactory } from './property.factory';
import {
  CreditPackFactory,
  CreditPurchaseFactory,
  CreditExpenseFactory,
  CreditWalletFactory,
} from './transaction.factory';

/**
 * Réinitialise toutes les factories
 * Utile dans beforeEach() des tests
 */
export function resetAllFactories(): void {
  UserFactory.reset();
  PropertyFactory.reset();
  CreditPurchaseFactory.reset();
  CreditExpenseFactory.reset();
}

export default {
  UserFactory,
  PropertyFactory,
  CreditPackFactory,
  CreditPurchaseFactory,
  CreditExpenseFactory,
  CreditWalletFactory,
  resetAllFactories,
};

