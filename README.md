# **MKQL - Syntaxregeln**

## **Allgemeiner Aufbau**

Ein Filter beginnt mit `USE WHERE` und endet mit `END USE`. Falls nach `END USE` ein Semikolon (`;`) folgt, beginnt eine
neue Filterregel für die bereits gefilterten Daten.

### **Beispiel**

```mkql
USE WHERE name = "Alice" AND age > 25 END USE;
USE WHERE country = "Germany" END USE;
```

---

## **Syntaxregeln**

### **1. `USE WHERE` (Öffnet einen Filterblock)**

- Muss immer am Anfang stehen.
- Direkt danach muss ein **Key** folgen.

### **2. Key (Feldname des Objekts)**

- Muss nach `USE WHERE`, `AND` oder `OR` stehen.
- Wird aus einer vordefinierten Liste (basierend auf dem TypeScript-Interface) per Autocomplete angeboten.
- Beispiel: `name`, `age`, `country`, `isActive`.

### **3. Operatoren (abhängig vom Datentyp des Keys)**

- **Strings**: `=`, `!=`, `~` (Like)
- **Zahlen**: `=`, `!=`, `>`, `<`
- **Booleans**: `true`, `false` (kein Operator nötig, direkter Vergleich)
- **Null-Werte**: `null`, `undefined` (kein Operator nötig, direkter Vergleich)
- **Enum-Werte**: Vergleich von Enum-Werten erfolgt mit `=`, `!=` (Beispiel: `syncOrder = 'ASC'`).

### **4. Werte (abhängig vom Datentyp des Keys)**

- **Strings**: Müssen in `""` eingeschlossen sein. (`name = "Alice"`)
- **Zahlen**: Werden als Zahl notiert (`sku > 100`)
- **Booleans**: Direkt als `true` oder `false`. (`useSync = true`)
- **Null-Werte**: Direkt als `null` oder `undefined`. (`lastLogin = null`)
- **Enum-Werte**: Direkt als Enum-Wert (muss mit `=` verglichen werden). (`syncOrder = 'ASC'`).

### **5. Logische Verknüpfungen (`AND` / `OR`)**

- Darf nur nach einem vollständigen Ausdruck (Key + Operator + Wert) stehen.
- Muss immer von einem weiteren Key gefolgt werden.
- Beispiel:
  ```mkql
  USE WHERE sku > 100 AND syncOrder = 'ASC' OR useSync = true END USE;
  ```

### **6. `END USE` (Schließt den Filterblock ab)**

- Muss am Ende eines Blocks stehen.
- Falls `END USE;` verwendet wird, kann eine neue Regel folgen.

---

## **Zusätzliche Regeln für den Editor**

- **Autocomplete für Keys** direkt nach `USE WHERE`, `AND`, `OR`.
- **Autocomplete für Operatoren** basierend auf dem Typ des Keys.
- **Highlighting für Fehler** bei falscher Syntax (z. B. `age = "Alice"` wäre ungültig).
- **Enum-Werte**: Enum-Werte, wie sie im TypeScript-Interface definiert sind, werden im Autocomplete als mögliche Werte
  angeboten. Zum Beispiel für `syncOrder` werden `'ASC'`, `'DSC'` und `'ELSEWHERE'` angeboten.

```
