# Guía: ESLint (semistandard), Prettier y formato al guardar

Esta guía describe cómo queda configurada la app **`apps/02-react-intro`** en este monorepo: **semistandard** declarado en `package.json`, **Prettier** como formateador, **ESLint 9** con **flat config** (`eslint.config.js`), y el editor formateando **al guardar**.

Los comandos asumen **pnpm** desde la raíz del repo (`react-spring/`).

---

## 1. Qué problema resuelve cada pieza

| Herramienta | Rol |
|-------------|-----|
| **ESLint** | Reglas de calidad y estilo (aquí: semistandard + React + Prettier como regla). |
| **Prettier** | Formateo automático (saltos de línea, comillas, punto y coma, etc.). |
| **eslint-config-prettier** | Apaga reglas de ESLint que **chocan** con el formato de Prettier (no tiene sentido que “standard” y Prettier peleen por el mismo detalle). |
| **eslint-plugin-prettier** | Ejecuta Prettier **como regla de ESLint** (`prettier/prettier`), así `eslint --fix` también corrige formato. |
| **@eslint/eslintrc (`FlatCompat`)** | `semistandard` viene como config **eslintrc** (`extends: ['semistandard']`). ESLint 9 usa **flat config**; `FlatCompat` traduce esa config al formato nuevo. |

---

## 2. Instalar dependencias de desarrollo

Desde la raíz del monorepo:

### 2.1 Prettier e integración con ESLint

```bash
pnpm -C apps/02-react-intro add -D prettier eslint-config-prettier eslint-plugin-prettier
```

### 2.2 Semistandard y su cadena (peer dependencies)

`eslint-config-semistandard` extiende **standard** y añade **punto y coma obligatorio** (`semi: always`). En `package.json` solo declaras `extends: ['semistandard']`, pero npm/pnpm deben instalar también lo que **standard** necesita:

```bash
pnpm -C apps/02-react-intro add -D @eslint/eslintrc eslint-config-standard eslint-plugin-import eslint-plugin-n eslint-plugin-promise
```

`@eslint/eslintrc` proporciona **`FlatCompat`**, necesario para usar `semistandard` dentro de `eslint.config.js`.

### 2.3 Paquetes que ya suele traer el propio Vite/React (no repetir si ya están)

En esta app ya hay, entre otros: `eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `eslint-config-semistandard`.

---

## 3. Declarar semistandard en `package.json`

Así mantienes el **mismo estilo** que muchos proyectos documentan: `eslintConfig` en `package.json`. ESLint 9 **no** lee solo ese bloque para flat config; el archivo `eslint.config.js` lo **importa** y lo aplica (ver sección 5).

```json
{
  "eslintConfig": {
    "extends": ["semistandard"]
  }
}
```

### Scripts útiles para lint y formato

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier . --write"
  }
}
```

---

## 4. Archivos de Prettier

### 4.1 `.prettierrc.json`

Opciones de formato (alineadas con semicolons y comillas simples):

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 80
}
```

### 4.2 `.prettierignore`

Evita formatear artefactos de build y dependencias:

```gitignore
dist
node_modules
coverage
```

---

## 5. `eslint.config.js` (flat config + compat con `package.json`)

Idea general:

1. **`globalIgnores`**: ignora `dist` (no lintear build).
2. **`...compat.config(pkg.eslintConfig)`**: aplica **exactamente** lo que pusiste en `package.json` para `eslintConfig` (aquí, semistandard). Un solo sitio donde cambias el preset.
3. **Bloque `files: ['**/*.{js,jsx}']`**: React Hooks, React Refresh, `globals.browser`, regla `prettier/prettier` y ajustes propios.
4. **`eslint-config-prettier/flat` al final**: desactiva reglas de estilo de Standard que chocan con Prettier.

Ejemplo equivalente al de esta app (simplificado para lectura; el repo puede tener pequeños ajustes):

```javascript
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default defineConfig([
  globalIgnores(['dist']),
  ...compat.config(pkg.eslintConfig),
  {
    files: ['**/*.{js,jsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    plugins: {
      prettier: eslintPluginPrettier,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'prettier/prettier': 'error',
    },
  },
  eslintConfigPrettier,
]);
```

**Por qué `createRequire`** para leer `package.json`: evita duplicar el texto `semistandard` y respeta la regla **`import/first`** de standard (todos los `import` arriba, luego `require` del JSON).

---

## 6. Editor: formato al guardar (Cursor / VS Code)

En **`apps/02-react-intro/.vscode/settings.json`** (o el workspace):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "always"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "prettier.requireConfig": true
}
```

| Opción | Efecto |
|--------|--------|
| `editor.formatOnSave` | Ejecuta el formateador al guardar. |
| `editor.defaultFormatter` | Usa la extensión **Prettier** para formatear. |
| `source.fixAll.eslint` | Aplica correcciones automáticas de ESLint (incluye lo que arregla `eslint-plugin-prettier` vía `prettier/prettier`). |
| `prettier.requireConfig` | Solo formatea si existe config de Prettier en el proyecto (evita sorpresas sin `.prettierrc`). |

**Extensiones necesarias en el editor:**

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) — `dbaeumer.vscode-eslint`
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) — `esbenp.prettier-vscode`

---

## 7. Comprobar desde la terminal

```bash
pnpm -C apps/02-react-intro run format
pnpm -C apps/02-react-intro run lint
pnpm -C apps/02-react-intro run lint:fix
```

- **`format`**: Prettier escribe cambios en todos los ficheros respetados.
- **`lint`**: solo reporta errores.
- **`lint:fix`**: ESLint + regla Prettier corrigen lo que puedan.

---

## 8. Avisos de peer dependencies (pnpm)

`eslint-config-standard` / `eslint-config-semistandard` declaran a menudo **`eslint@^8`**. Si usas **ESLint 9**, pnpm puede mostrar **warnings** de peers no satisfechos; en la práctica la configuración suele funcionar. Si algo rompe al actualizar, revisa versiones en [eslint-config-standard](https://github.com/standard/eslint-config-standard) y [semistandard](https://github.com/standard/eslint-config-semistandard).

---

## 9. Referencias

- [Prettier: integrar con linters](https://prettier.io/docs/en/integrating-with-linters.html)
- [eslint-config-prettier](https://github.com/prettier/eslint-config-prettier)
- [ESLint flat config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [@eslint/eslintrc (FlatCompat)](https://github.com/eslint/eslintrc)
