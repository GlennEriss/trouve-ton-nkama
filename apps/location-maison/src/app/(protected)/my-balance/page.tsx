import { redirect } from 'next/navigation'
import { routes } from '@/constantes/routes'

export default function MyBalancePage() {
  redirect(routes.protected.my_balance_history)
}
