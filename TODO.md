# TODOs

Lista de tareas pendientes para el proyecto:

**Notas:**

- No subir este archivo al repositorio, es un archivo local para organizar las tareas pendientes del proyecto.
- Asegurarse de revisar y actualizar esta lista regularmente.
- Priorizar las tareas según su importancia y urgencia.
- Asignar responsables para cada tarea si es necesario.
- Marcar las tareas completadas una vez finalizadas.
- Agregar nuevas tareas a medida que surjan durante el desarrollo del proyecto.
- El proyecto es mobile first, por lo que se debe prestar especial atención a la experiencia del usuario en dispositivos móviles.
- Se puede revisar la API para verificar que las tareas relacionadas. Mas no modificar la API, a menos que se indique explícitamente.
- Se pueden eliminar tareas de esta lista si se considera que ya no son relevantes o necesarias para el proyecto.

**API:**

- Enlace del repositorio local de la API: [API Repository](C:\Zero\Dev\abc_inversiones\abc_inversiones_api)

**Gestor de paquetes:**

- Se utiliza `pnpm` como gestor de paquetes para el proyecto.

**Documentación de la API:**

- La documentación de la API se aloja en dos lugares:
  - En el repositorio local de la API: [API Documentation](C:\Zero\Dev\abc_inversiones\abc_inversiones_api\docs)
  - En el repositorio del frontend: [Frontend API Documentation](.local\docs)
- Ambas son la misma documentación, pero se mantienen en ambos lugares para facilitar el acceso a los desarrolladores que trabajan en el frontend y la API.

**Nota importante:** Siempre revisar la información con cuidado, no siempre las tareas se hacen teniendo el 100% de la información, aveces no se toman en cuenta detalles o se destaca información errónea, por ello se exige siempre revisar la información con cuidado, revisar el Frontend y el Backend para asegurarse de que la información es correcta, y si se encuentra alguna discrepancia o error, reportarlo inmediatamente para corregirlo y evitar problemas futuros.

## Tareas Pendientes

- [x] Mejorar el collapsible de los datos de usuario al crear préstamo.
- [x] En la tasa eliminar el select de tasa anual o mensual, por la nueva api esto pasara a ser irrelevante.
- [x] Recalcular la preview de cuotas correctamente
- [x] Refactorizar la API: [Refactorización de la API](#refactorización-de-la-api)
- [x] Solucionar error en la API al querer aprobar un préstamo: [Error API](#error-api)
- [ ] Mejorar interfaz de usuario en préstamos: [Mejorar interfaz de usuario en préstamos](#mejorar-interfaz-de-usuario-en-préstamos)
- [ ] Implementar página de Usuarios para administradores.
- [x] Nueva sección de Resumen: [Nueva sección de Resumen](#nueva-sección-de-resumen)

## Refactorización de la API

Se hablo con la Inteligencia Artificial y luego de explicarle detalles de como se espera el manejo

- Se explico que el Excel no recalcula la cuota según la frecuencia, sino que mantiene el mismo importe de cuota para mensual, quincenal, semanal y diario, cambiando solo el cronograma de fechas.
- Se detalló la regla financiera para calcular la cuota fija y cómo debería implementarse en el backend.
- Se explicó la regla de fechas según el Excel para cada modalidad (mensual, quincenal, semanal y diario) y cómo debería implementarse en el backend.
- Se proporcionó una función recomendada para calcular las fechas de vencimiento de las cuotas según la modalidad.
- Se proporcionó una función financiera para calcular la cuota fija basada en el principal, la tasa de interés y el número de cuotas.
- Se explicó cómo debería quedar la lógica de cuotas en el backend, asegurando que el importe de la cuota se mantenga constante para todas las modalidades y que solo las fechas cambien según la modalidad.

La IA dio esto de respuesta:

````md
**El Excel no recalcula la cuota según la frecuencia.**
Usa **el mismo importe de cuota** para mensual, quincenal, semanal y diario. Lo único que cambia es el **cronograma de fechas**.

Con tus datos:

```txt
Principal: S/ 10,000.00
Tasa: 5%
Cuotas: 12
Cuota: S/ 1,128.25
Total: S/ 13,539.05
Interés: S/ 3,539.05
```

Eso se mantiene igual para:

```txt
Mensual
Quincenal
Semanal
Diario
```

La frecuencia solo afecta los vencimientos.

---

## Regla financiera

Tu backend debería calcular la cuota así:

```ts
cuota = (principal * rate) / (1 - (1 + rate) ** -installmentsCount);
```

Y **no debería cambiar ese cálculo por modalidad**.

Es decir:

```ts
calculateInstallmentAmount({
  principal: 10000,
  interestRate: 5,
  installmentsCount: 12,
});
```

Siempre devuelve:

```txt
S/ 1,128.25
```

independientemente de si la modalidad es mensual, quincenal, semanal o diario.

---

## Regla de fechas según tu Excel

Con fecha inicial:

```txt
08/05/2026
```

El Excel parece generar:

### Mensual

```txt
Cuota 1: 08/06/2026
Cuota 2: 08/07/2026
Cuota 3: 08/08/2026
...
Cuota 12: 08/05/2027
```

Regla:

```ts
startDate + i meses
```

---

### Quincenal

```txt
Cuota 1: 23/05/2026
Cuota 2: 07/06/2026
Cuota 3: 22/06/2026
...
Cuota 12: 04/11/2026
```

Regla:

```ts
startDate + 15 * i días
```

---

### Semanal

```txt
Cuota 1: 15/05/2026
Cuota 2: 22/05/2026
Cuota 3: 29/05/2026
...
Cuota 12: 31/07/2026
```

Regla:

```ts
startDate + 7 * i días
```

---

### Diario

Aquí hay un detalle importante.

Según tu Excel:

```txt
Fecha inicial: 08/05/2026

Cuota 1: 10/05/2026
Cuota 2: 11/05/2026
Cuota 3: 12/05/2026
...
Cuota 12: 21/05/2026
```

Eso no es `startDate + i días`, porque cuota 1 sería `09/05/2026`.

Tu Excel parece usar:

```ts
startDate + (i + 1) días
```

O sea:

```txt
Cuota 1 = 08/05/2026 + 2 días = 10/05/2026
Cuota 2 = 08/05/2026 + 3 días = 11/05/2026
Cuota 12 = 08/05/2026 + 13 días = 21/05/2026
```

Entonces, si quieres copiar **exactamente** el Excel, la modalidad diaria debe tener esa regla especial.

---

## Función recomendada para fechas

```ts
import { DateTime } from "luxon";

export type LoanFrequency = "monthly" | "biweekly" | "weekly" | "daily";

export function calculateDueDate(
  startDate: DateTime,
  installmentNumber: number,
  frequency: LoanFrequency,
): DateTime {
  const normalizedStartDate = startDate.startOf("day");

  switch (frequency) {
    case "monthly":
      return calculateMonthlyDueDate(normalizedStartDate, installmentNumber);

    case "biweekly":
      return normalizedStartDate.plus({ days: 15 * installmentNumber });

    case "weekly":
      return normalizedStartDate.plus({ days: 7 * installmentNumber });

    case "daily":
      // Regla observada en el Excel:
      // cuota 1 empieza 2 días después de la fecha inicial.
      return normalizedStartDate.plus({ days: installmentNumber + 1 });

    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }
}

export function calculateMonthlyDueDate(
  startDate: DateTime,
  installmentNumber: number,
): DateTime {
  const targetMonth = startDate.plus({ months: installmentNumber });

  const originalDay = startDate.day;
  const maxDayOfTargetMonth = targetMonth.daysInMonth;
  const validDay = Math.min(originalDay, maxDayOfTargetMonth);

  return targetMonth.set({ day: validDay }).startOf("day");
}
```

---

## Función financiera

```ts
export function calculateFixedInstallment(params: {
  principal: number;
  interestRate: number;
  installmentsCount: number;
}): number {
  const { principal, interestRate, installmentsCount } = params;

  const rate = interestRate / 100;

  if (installmentsCount <= 0) {
    throw new Error("installmentsCount must be greater than zero");
  }

  if (rate === 0) {
    return principal / installmentsCount;
  }

  return (principal * rate) / (1 - Math.pow(1 + rate, -installmentsCount));
}
```

Uso:

```ts
const installmentAmount = calculateFixedInstallment({
  principal: 10000,
  interestRate: 5,
  installmentsCount: 12,
});

const totalDebt = installmentAmount * 12;
const totalInterest = totalDebt - 10000;
```

---

## Cómo debería quedar tu lógica de cuotas

```ts
const installmentAmount = calculateFixedInstallment({
  principal,
  interestRate,
  installmentsCount: loan.installmentsCount,
});

const totalDebt = installmentAmount * loan.installmentsCount;
const totalInterest = totalDebt - principal;

const roundedInstallmentAmount = roundMoney(installmentAmount);
const roundedTotalDebt = roundMoney(totalDebt);

let accumulatedAmount = 0;

const installmentsList = [];

for (let i = 1; i <= loan.installmentsCount; i++) {
  const dueDate = calculateDueDate(startDate, i, loan.frequency);

  let amount = roundedInstallmentAmount;

  if (i === loan.installmentsCount) {
    amount = roundMoney(roundedTotalDebt - accumulatedAmount);
  }

  accumulatedAmount = roundMoney(accumulatedAmount + amount);

  installmentsList.push({
    loanId: loan.id,
    installmentNumber: i,
    dueDate: dueDate.toJSDate(),
    amount: amount.toFixed(2),
    status: "pending" as const,
  });
}
```

Helper:

```ts
function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
```

---

## Ojo con un detalle

Si quieres que todas las cuotas sean exactamente:

```txt
S/ 1,128.25
```

entonces la suma de 12 cuotas será:

```txt
S/ 13,539.00
```

Pero el Excel muestra:

```txt
S/ 13,539.05
```

Eso pasa porque la cuota real es aproximadamente:

```txt
S/ 1,128.2541...
```

Excel muestra la cuota redondeada, pero calcula el total con más decimales.

Para una API seria, yo recomiendo:

```txt
Cuotas 1 a 11: S/ 1,128.25
Cuota 12:      S/ 1,128.30
Total:         S/ 13,539.05
```

Así tu cronograma suma exactamente lo mismo que el total.

---

## Conclusión

Tu backend debería hacer esto:

```txt
1. Calcular cuota fija una sola vez.
2. Mantener el mismo importe para todas las modalidades.
3. Usar frequency solo para generar fechas.
4. Mensual: + meses.
5. Quincenal: + 15 días.
6. Semanal: + 7 días.
7. Diario: según el Excel, + installmentNumber + 1 días.
```

La única regla rara es **diario**, porque por lógica normal debería empezar el 09/05/2026, pero el Excel empieza el 10/05/2026. Si la empresa quiere replicar eso, hay que implementarlo igual.
````

- [x] Implementar la lógica de cuotas en el backend según las reglas discutidas con la IA, asegurando que el importe de la cuota se mantenga constante para todas las modalidades y que solo las fechas cambien según la modalidad.
- [x] Actualizar el frontend para reflejar correctamente la lógica de cuotas y fechas según las reglas establecidas.

## Error API

Se obtiene esta respuesta desde el backend:

```json
{
  "success": false,
  "message": "No tienes permisos para aprobar en este estado",
  "data": null,
  "meta": {
    "timestamp": "2026-05-05T15:22:48.466-05:00"
  }
}
```

Sucede cuando se quiere aprobar un préstamo, no esta verificado si el error ocurre cuando se quiere rechazar un préstamo, o si ocurre solo con ciertos préstamos, o con todos los préstamos. Esto es algo que se debe de investigar para averiguar exactamente en qué situaciones ocurre este error, y así poder solucionarlo de manera efectiva.

El punto consiste en que este error no debería de suceder con ningún préstamo, ya que el usuario con el que se esta probando tiene el rol de administrador, y los administradores deberían tener permisos para aprobar o rechazar préstamos en cualquier estado. Esto es algo que se debe de investigar para averiguar por qué este error está ocurriendo, y así poder solucionarlo de manera efectiva.

## Mejorar interfaz de usuario en préstamos

Actualmente los clientes e inversionistas ven mucho detalle en la pagina, deben de verlo de manera simple, un listado de los préstamos/inversiones con su estado, y al hacer click se navega a una pantalla con los detalles del préstamo/inversion, donde se pueden ver las cuotas, fechas, etc. Actualmente se muestra toda la información en una columna secundaria, lo cual no es ideal para la experiencia del usuario.

Por ejemplo según el flujo al hacer click en un préstamo navegaran a su pagina del préstamo donde verán los detalles, podrán ver su cronograma, pagos, etc. Podrán ver los vouchers enviados por parte del cliente sea en esta o en otra pestaña, y si es cliente la opción de enviar vouchers. También al hacer click en un voucher saldrá desde abajo una pantalla con el detalle del voucher o modal si es desktop, y si es un voucher pendiente de revision, el botón para aprobar o rechazar el voucher. En caso de ser aprobado, se mostrara la fecha de pago estimada, y en caso de ser rechazado se mostrara un campo para escribir el motivo del rechazo. Esto debes de investigar para averiguar como es el flujo correcto.

Para los administradores se esperan dos tipos de vistas, una simple, muy similar a los de clientes/inversionistas, con un listado de préstamos e inversiones, y al hacer click en cada uno se navega a su pagina de detalle. Y otra vista mas completa, donde se muestra toda la información del préstamo/inversion en una sola pagina, like to excel, con toda la información y opciones de edición (Si la api lo permite), para facilitar la gestión de los préstamos e inversiones por parte del administrador. Esto es algo que se puede discutir con el equipo para definir exactamente qué información y opciones se mostrarán en cada vista, y cómo se organizará la información para que sea fácil de entender y usar para los usuarios.

Lo adecuado es también mostrar claramente el id en las vistas simples, por ejemplo actualmente el préstamo sale como `81c68197-bd6a-4f72-8076-...`, lo cual no es amigable para el usuario, se puede mostrar un id mas simple como `PR-00001` (Este cambio ya se realizo en el backend, ahora hay una propiedad para obtener ese dato, lee el backend y sus mds no commiteados en raiz) o algo similar, para facilitar la identificación de cada préstamo e inversión por parte de los usuarios. Esto es algo que se puede discutir con el equipo para definir el formato del id que se mostrará a los usuarios, y asegurarse de que sea fácil de entender y usar para ellos. También esto ocurre con los usuarios, por ejemplo los inversionistas y clientes aparecen como `3d225cea-fc9d-4b1f-b742-...`, lo cual no es amigable, se puede mostrar el nombre del usuario o un id mas simple para facilitar la identificación de cada usuario por parte de los usuarios. Esto es algo que se puede discutir con el equipo para definir cómo se mostrará la información de los usuarios en la interfaz, y asegurarse de que sea fácil de entender y usar para ellos.

La vista avanzada se debe de poder activar y desactivar con un tab o switch, para que el usuario pueda elegir entre una vista simple o una vista avanzada según sus necesidades y preferencias. Esto es algo que se puede discutir con el equipo para definir cómo se implementará esta funcionalidad, y asegurarse de que sea fácil de usar para los usuarios.

**NOTA:** La vista avanzada es solo accesible por los administradores, los clientes e inversionistas no pueden acceder a esta vista, ya que es una vista con información y opciones de edición para facilitar la gestión de los préstamos e inversiones por parte de los administradores. Esto es algo que se puede discutir con el equipo para definir cómo se implementará esta funcionalidad, y asegurarse de que sea fácil de usar para los administradores.

## Nueva sección de Resumen

Una sección dentro de préstamos donde se vea el resumen de cada préstamo, si es dentro de préstamos esta ingresará dentro del tab de: `Vista simple | Vista avanzada | Resumen`.

En esta sección se mostrará lo que es una tabla con el resumen de todos los préstamos, algo como este modelo:

| ID PRÉSTAMO | Cod_Cli | Cliente     | Fecha de Crédito | Importe de Crédito | Modalidad | Tasa de Interés | Monto Pagado | Ganancia    | Deuda        | Cuotas Restantes |
| ----------- | ------- | ----------- | ---------------- | ------------------ | --------- | --------------- | ------------ | ----------- | ------------ | ---------------- |
| PR-0001     | CL-0001 | Juan Perez  | 01/01/2026       | S/ 10,000.00       | Mensual   | 5%              | S/ 3,000.00  | S/ 1,500.00 | S/ 7,000.00  | 7                |
| PR-0002     | CL-0002 | Maria Gomez | 15/02/2026       | S/ 5,000.00        | Quincenal | 4%              | S/ 1,000.00  | S/ 200.00   | S/ 4,000.00  | 10               |
| PR-0003     | CL-0003 | Carlos Ruiz | 10/03/2026       | S/ 20,000.00       | Semanal   | 6%              | S/ 5,000.00  | S/ 1,200.00 | S/ 15,000.00 | 15               |

Esta tabla es como esta funcionando el Excel actualmente, y es una forma de mostrar un resumen claro y conciso de cada préstamo, con la información mas relevante para los usuarios. Esto es algo que se puede discutir con el equipo para definir exactamente qué información se mostrará en esta tabla, y cómo se organizará para que sea fácil de entender y usar para los usuarios.

Se espera mejorar este diseño, mostrando information clave, y asi mismo un acceso directo a cada préstamo, por ejemplo al hacer click en el id del préstamo se navega a su pagina de detalle, o al hacer click en el nombre del cliente se navega a su pagina de detalle, etc. Esto es algo que se puede discutir con el equipo para definir cómo se implementará esta funcionalidad, y asegurarse de que sea fácil de usar para los usuarios.

Revisar todo esto con cuidado y asegurarse que coincida con la API, para asegurarse de que toda la información que se muestra en esta tabla se puede obtener correctamente desde la API, y que se muestra de manera clara y concisa para los usuarios. Esto es algo que se puede discutir con el equipo para definir cómo se implementará esta funcionalidad, y asegurarse de que sea fácil de usar para los usuarios.

**NOTA:** Esta sección es solo accesible por los administradores, los clientes e inversionistas no pueden acceder a esta sección, ya que es una sección de resumen para facilitar la gestión de los préstamos por parte de los administradores. Esto es algo que se puede discutir con el equipo para definir cómo se implementará esta funcionalidad, y asegurarse de que sea fácil de usar para los administradores.
