# Plan de Refactorización: Migración a Coss UI Drawer y Estandarización de Navegación

## Decisiones del Usuario

- **Query params**: en inglés (`?detail=`, `?log=`, `?request=`, `?user=`)
- **Drawer universal**: siempre usar Drawer para detalles, tanto en vista simple (client/investor) como admin
- **Sidebar desktop**: mantener como está (siempre visible en desktop), no migrar a Drawer
- **Ejecución**: secuencial por fases, con commits separados en rama local, sin push

---

## Resumen Ejecutivo

Este plan aborda dos objetivos: (1) unificar todos los overlays de la aplicación usando el componente **Drawer de Coss UI** (`@base-ui/react/drawer`), y (2) estandarizar la navegación y el comportamiento del botón de retroceso en un entorno Tauri/móvil.

---

## 1. Estado Actual

### 1.1 Componentes de Overlay Existentes

La app tiene **4 archivos primitivos** de overlay en `src/components/ui/`:

| Componente | Librería Base | ¿Se usa en la app? |
|---|---|---|
| `sheet.tsx` | `@base-ui/react/dialog` | ✅ **Sí** — es el componente principal |
| `responsive-sheet.tsx` | Wrapper de Sheet | ✅ **Sí** — **TODOS** los overlays pasan por aquí |
| `drawer.tsx` | `@base-ui/react/drawer` | ❌ **No** — instalado pero sin uso |
| `dialog.tsx` | `@base-ui/react/dialog` | ❌ Solo por `command.tsx` internamente |
| `alert-dialog.tsx` | `@base-ui/react/alert-dialog` | ❌ No se usa |

> **IMPORTANTE:** El Drawer de Coss UI ya está instalado (`drawer.tsx`, 629 líneas, con soporte completo para `position`, nested drawers, menus, snap points, etc.) pero **no se utiliza en ninguna parte de la aplicación**. Todo pasa por `Sheet` → `ResponsiveSheetContent`.

### 1.2 Inventario Completo de Overlays (15 instancias)

**Todos controlados por `useState` local. Ninguno por URL.**

| # | Nombre | Archivo | Propósito | Tipo de Acción |
|---|---|---|---|---|
| 1 | `UserDetailSheet` | `src/components/UserDetailSheet.tsx` | Perfil de usuario (contacto, rol, estado) | Consulta |
| 2 | `ChangePasswordDialog` | `src/components/profile/ChangePasswordDialog.tsx` | Cambio de contraseña | Formulario |
| 3 | `ImageCropperModal` | `src/components/profile/ImageCropperModal.tsx` | Recorte de avatar | Herramienta |
| 4 | `CreateLoanDialog` | `src/features/loans/components/CreateLoanDialog.tsx` | Crear préstamo nuevo | Formulario |
| 5 | `ReviewLoanDialog` | `src/features/loans/components/ReviewLoanDialog.tsx` | Aprobar/rechazar préstamo | Confirmación |
| 6 | `PaymentDialog` | `src/features/loans/components/PaymentWorkflowDialogs.tsx` | Registrar/editar pago | Formulario |
| 7 | `VoucherDialog` | `src/features/loans/components/PaymentWorkflowDialogs.tsx` | Subir/editar comprobante | Formulario |
| 8 | `ProcessVoucherDialog` | `src/features/loans/components/PaymentWorkflowDialogs.tsx` | Aprobar/rechazar comprobante | Confirmación |
| 9 | `DeleteWorkflowDialog` | `src/features/loans/components/PaymentWorkflowDialogs.tsx` | Confirmar eliminación | Confirmación |
| 10 | `AdminLoansOperationsPanel` (sheet) | `src/features/loans/components/AdminLoansOperationsPanel.tsx` | Detalle completo de préstamo (admin avanzado) | Consulta/Acción |
| 11 | `AuditDetailsSheet` | `src/pages/AuditPage.tsx` | Detalle de registro de auditoría | Consulta |
| 12 | `UserFormDialog` | `src/pages/UsersPage.tsx` | Crear/editar usuario | Formulario |
| 13 | `LinkAuthDialog` | `src/pages/UsersPage.tsx` | Vincular cuenta auth a usuario | Formulario |
| 14 | `RequestDetailSheet` | `src/pages/UsersPage.tsx` | Detalle de solicitud de acceso | Consulta |
| 15 | `ReviewRequestDialog` | `src/pages/UsersPage.tsx` | Aprobar/rechazar solicitud | Confirmación |

### 1.3 Estado del Router

| Aspecto | Estado Actual |
|---|---|
| Tipo de Router | **`HashRouter`** — URLs como `/#/home`, `/#/loans` |
| Protección de rutas | `ProtectedRoute` verifica `isAuthenticated`, redirige a `/login` |
| Transiciones | `PageTransitionRoutes` con animaciones CSS (220ms enter, 140ms exit) |
| Navegación mobile (Navbar) | HOME→sección = **PUSH**, sección→sección = **REPLACE**, →HOME = **REPLACE** |
| Navegación desktop (Sidebar) | Siempre **PUSH** |
| Back button mobile | Determinístico vía `getBackTargetPath()` + corrección de POP |
| Detalle de préstamo | Sub-ruta `/loans/:loanId` — renderiza vista inline completa (NO un drawer) |
| Roles | Admin/Investor/Client — mismo routing para todos, UI filtrada por rol |

### 1.4 Sub-rutas que Deben Migrar a Drawer

En `App.tsx`:

```tsx
<Route path="loans" element={<LoansPage />} />
<Route path="loans/:loanId" element={<LoansPage />} />       // ← migrar a drawer
<Route path="investments" element={<LoansPage />} />
<Route path="investments/:loanId" element={<LoansPage />} />  // ← migrar a drawer
```

### 1.5 Sistema de Historia del Sheet Actual

El `sheet.tsx` actual ya tiene un **sistema sofisticado de historial** (líneas 14-178): `useSheetBackNavigation`, `registerSheetBackHandler`, `handleSheetPopState`. Pushea entradas de history con `window.history.pushState` al abrir un Sheet, y escucha `popstate` para cerrar el Sheet al hacer back.

**Sin embargo**, este sistema está implementado en el `Sheet` (`@base-ui/react/dialog`), **no en el Drawer** (`@base-ui/react/drawer`). Necesitaremos portar esta lógica al nuevo componente Drawer.

---

## 2. Plan de Migración a Coss UI Drawer

### 2.1 Categorización de Overlays

#### Categoría A — URL-Driven (Query Params)
Overlays de **consulta de detalle** que deben sincronizarse con la URL:

| Overlay | Query Param | Ejemplo de URL |
|---|---|---|
| Detalle de préstamo (actualmente sub-ruta) | `?detail={loanId}` | `/#/loans?detail=abc123` |
| Detalle de inversión (actualmente sub-ruta) | `?detail={loanId}` | `/#/investments?detail=abc123` |
| `AdminLoansOperationsPanel` (sheet detalle admin) | `?detail={loanId}` | `/#/loans?detail=abc123` |
| `AuditDetailsSheet` | `?log={logId}` | `/#/audit?log=xyz789` |
| `RequestDetailSheet` | `?request={requestId}` | `/#/requests?request=req456` |
| `UserDetailSheet` | `?user={userId}` | `/#/loans?detail=abc&user=usr123` |

#### Categoría B — History-Aware (sin query param, pero con back)
Overlays de **acción/formulario** que deben cerrarse con el botón back pero no necesitan URL persistente:

| Overlay | Comportamiento |
|---|---|
| `CreateLoanDialog` | Back cierra → vuelve a la lista |
| `UserFormDialog` | Back cierra → vuelve a la lista |
| `ChangePasswordDialog` | Back cierra → vuelve al perfil |
| `PaymentDialog` | Back cierra → vuelve al detalle del préstamo |
| `VoucherDialog` | Back cierra → vuelve al detalle del préstamo |

#### Categoría C — Efímeros (sin historia)
Overlays de **confirmación** instantáneos:

| Overlay | Comportamiento |
|---|---|
| `ReviewLoanDialog` | Confirmar/cancelar in-place |
| `ProcessVoucherDialog` | Confirmar/cancelar in-place |
| `DeleteWorkflowDialog` | Confirmar/cancelar in-place |
| `ReviewRequestDialog` | Confirmar/cancelar in-place |
| `ImageCropperModal` | Herramienta efímera |
| `LinkAuthDialog` | Formulario corto, efímero |

### 2.2 Nuevo Componente: `ResponsiveDrawer`

Wrapper que reemplaza `ResponsiveSheetContent` usando el Drawer de Coss UI:

**Comportamiento:**
- Mobile: `position="bottom"` con `showBar` (swipe to dismiss)
- Desktop: `position="right"` con ancho configurable y resize handle
- Integración con historial (portada de `useSheetBackNavigation` del Sheet)
- Props: `historyMode`, control open/onOpenChange

### 2.3 Hook: `useDrawerQueryParam`

Hook para sincronizar drawers con query parameters de la URL:

```
useDrawerQueryParam("detail")
→ { value, isOpen, open(value), close() }
```

**Flujo:**
1. `open("abc123")` → `navigate("?detail=abc123")` → PUSH
2. BACK → `history.back()` → URL pierde `?detail=` → drawer se cierra
3. Nested: `?detail=abc&user=usr123` → BACK quita `user` → nested cierra

---

## 3. Fases de Implementación

### Fase 1 — Infraestructura (sin cambios visibles)

1. Crear `src/components/ui/responsive-drawer.tsx`
2. Crear `src/hooks/use-drawer-query-param.ts`
3. Verificar/ajustar CSS para variables del Drawer
4. Ajustar `PageTransitionRoutes` para que no anime en cambios de query params (solo pathname)

### Fase 2 — Migrar Sub-rutas a Drawers (Categoría A)

5. Eliminar rutas `/loans/:loanId` y `/investments/:loanId` de `App.tsx`
6. Modificar `LoansPage.tsx`: reemplazar `useParams` por `useDrawerQueryParam("detail")`, usar `ResponsiveDrawer` para **todas las vistas** (simple + admin)
7. Actualizar `navigation.ts`: eliminar `routeBackTargets` para `/loans/` e `/investments/`
8. Migrar `AuditDetailsSheet` → `useDrawerQueryParam("log")`
9. Migrar `RequestDetailSheet` → `useDrawerQueryParam("request")`
10. Migrar `UserDetailSheet` → nested drawer con `?user=`

### Fase 3 — Migrar Formularios (Categoría B)

11. `CreateLoanDialog` → `ResponsiveDrawer` con `historyMode="auto"`
12. `UserFormDialog` → `ResponsiveDrawer` con `historyMode="auto"`
13. `ChangePasswordDialog` → `ResponsiveDrawer` con `historyMode="auto"`
14. `PaymentDialog` / `VoucherDialog` → Nested Drawer dentro del drawer de detalle

### Fase 4 — Migrar Confirmaciones (Categoría C)

15. `ReviewLoanDialog`, `ProcessVoucherDialog`, `DeleteWorkflowDialog`, `ReviewRequestDialog` → `ResponsiveDrawer` con `historyMode="never"`
16. `ImageCropperModal`, `LinkAuthDialog` → `ResponsiveDrawer` con `historyMode="never"`

### Fase 5 — Limpieza

17. Eliminar `responsive-sheet.tsx`
18. Evaluar eliminación de `sheet.tsx` (verificar que `sidebar.tsx` no lo requiera en mobile)
19. Limpiar dependencias no usadas (`vaul`)

---

## 4. Lista de Archivos a Modificar

### Archivos Nuevos

| Archivo | Descripción |
|---|---|
| `src/components/ui/responsive-drawer.tsx` | Wrapper responsive del Drawer Coss UI |
| `src/hooks/use-drawer-query-param.ts` | Hook de sincronización URL ↔ Drawer |

### Archivos a Modificar

| Archivo | Cambio Principal |
|---|---|
| `src/App.tsx` | Eliminar rutas `:loanId` |
| `src/lib/navigation.ts` | Eliminar `routeBackTargets` de loans/investments |
| `src/pages/LoansPage.tsx` | useParams → useDrawerQueryParam, añadir ResponsiveDrawer |
| `src/components/UserDetailSheet.tsx` | Sheet → ResponsiveDrawer (nested) |
| `src/features/loans/components/CreateLoanDialog.tsx` | Sheet → ResponsiveDrawer |
| `src/features/loans/components/ReviewLoanDialog.tsx` | Sheet → ResponsiveDrawer |
| `src/features/loans/components/PaymentWorkflowDialogs.tsx` | 4 diálogos → ResponsiveDrawer / Nested |
| `src/features/loans/components/AdminLoansOperationsPanel.tsx` | Sheet → ResponsiveDrawer con query param |
| `src/pages/AuditPage.tsx` | AuditDetailsSheet → ResponsiveDrawer |
| `src/pages/UsersPage.tsx` | 4 sheets/dialogs → ResponsiveDrawer |
| `src/components/profile/ChangePasswordDialog.tsx` | Sheet → ResponsiveDrawer |
| `src/components/profile/ImageCropperModal.tsx` | Sheet → ResponsiveDrawer |
| `src/pages/ProfilePage.tsx` | Actualizar imports |
| `src/components/ui/app-layout.tsx` | Ajustar getRouteDepth, back + drawer |
| `src/components/PageTransitionRoutes.tsx` | Solo animar en cambio de pathname, no search |

### Archivos a Eliminar (Fase 5)

| Archivo | Razón |
|---|---|
| `src/components/ui/responsive-sheet.tsx` | Reemplazado por `responsive-drawer.tsx` |

---

## 5. Riesgos y Consideraciones

1. **HashRouter + Query Params**: Los query params están dentro del hash (`/#/loans?detail=abc`). React Router v6 maneja esto con `useSearchParams()`.

2. **Nested Drawers + Historial**: Drawer URL-driven (Cat. A) + Drawer History-aware (Cat. B) apilan entradas de historial. Verificar que no hay race conditions.

3. **PageTransitionRoutes y Query Params**: Debe usar solo `pathname` para decidir si animar, no `search`. Actualmente `getRouteKey()` incluye `pathname + search + hash`.

4. **Dos hooks `useIsMobile()`**: Existen con breakpoints distintos (768px vs 800px). Evaluar unificación.
