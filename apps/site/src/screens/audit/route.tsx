// The route of SCR-audit (ARCHITECTURE.md section 3.2: /audit). The Audit Desk itself arrives in a later build; until
// then the page says so and what it will do.

import type { RouteObject } from 'react-router'
import { AuditScreen } from './AuditScreen.tsx'

export const routes: RouteObject[] = [{ path: 'audit', Component: AuditScreen }]

export default routes
