import { CreditPack } from "@/models/credit-transaction";

export const CREDIT_PACKS: CreditPack[] = [
    {
      id: 'starter',
      name: 'Starter',
      credits: 5,
      price: 2000
    },
    {
      id: 'standard',
      name: 'Standard',
      credits: 10,
      price: 3500,
      savings: 12.5
    },
    {
      id: 'advanced',
      name: 'Avancé',
      credits: 25,
      price: 7500,
      savings: 25
    },
    {
      id: 'premium',
      name: 'Premium',
      credits: 50,
      price: 12500,
      savings: 37.5
    }
  ] 