# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and
some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react)
  uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc)
  uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev
& build performances. To add it, see
[this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the
configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,
      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install
[eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and
[eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for
React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

rehab-monitoring ├─ app-icon.png ├─ eslint.config.js ├─ index.html ├─
package-lock.json ├─ package.json ├─ public │ ├─ app-icon.png │ ├─ favicon.svg │
└─ icons.svg ├─ README.md ├─ src │ ├─ App.css │ ├─ App.tsx │ ├─ assets │ │ ├─
hero.png │ │ ├─ react.svg │ │ └─ vite.svg │ ├─ components │ │ ├─
BatchLoggingView.tsx │ │ ├─ config │ │ │ ├─ BackupTab.tsx │ │ │ ├─
CategoriesModulesTab.tsx │ │ │ └─ ResidentsTab.tsx │ │ ├─ ConfigView.tsx │ │ ├─
DatePicker.tsx │ │ ├─ JournalEntryView.tsx │ │ ├─ MatrixView.tsx │ │ ├─
Navbar.tsx │ │ ├─ Pagination.tsx │ │ ├─ SearchBar.tsx │ │ ├─
SmartImportModal.tsx │ │ └─ ui │ │ ├─ ConfirmDialog.tsx │ │ └─ Toast.tsx │ ├─
context │ │ └─ NotificationProvider.tsx │ ├─ db │ │ ├─ db.ts │ │ └─ seedData.ts
│ ├─ hooks │ │ └─ useTheme.ts │ ├─ index.css │ ├─ main.tsx │ ├─ types │ │ └─
index.ts │ └─ utils │ ├─ backupRestore.ts │ ├─ clipboardParser.ts │ ├─
dateUtils.ts │ ├─ excelExport.ts │ └─ useSessionStore.ts ├─ src-tauri │ ├─ 2 │
├─ build.rs │ ├─ capabilities │ │ ├─ default.json │ │ └─ desktop.json │ ├─
Cargo.lock │ ├─ Cargo.toml │ ├─ icons │ │ ├─ 128x128.png │ │ ├─ 128x128@2x.png │
│ ├─ 32x32.png │ │ ├─ 64x64.png │ │ ├─ android │ │ │ ├─ mipmap-anydpi-v26 │ │ │
│ └─ ic_launcher.xml │ │ │ ├─ mipmap-hdpi │ │ │ │ ├─ ic_launcher.png │ │ │ │ ├─
ic_launcher_foreground.png │ │ │ │ └─ ic_launcher_round.png │ │ │ ├─ mipmap-mdpi
│ │ │ │ ├─ ic_launcher.png │ │ │ │ ├─ ic_launcher_foreground.png │ │ │ │ └─
ic_launcher_round.png │ │ │ ├─ mipmap-xhdpi │ │ │ │ ├─ ic_launcher.png │ │ │ │
├─ ic_launcher_foreground.png │ │ │ │ └─ ic_launcher_round.png │ │ │ ├─
mipmap-xxhdpi │ │ │ │ ├─ ic_launcher.png │ │ │ │ ├─ ic_launcher_foreground.png │
│ │ │ └─ ic_launcher_round.png │ │ │ ├─ mipmap-xxxhdpi │ │ │ │ ├─
ic_launcher.png │ │ │ │ ├─ ic_launcher_foreground.png │ │ │ │ └─
ic_launcher_round.png │ │ │ └─ values │ │ │ └─ ic_launcher_background.xml │ │ ├─
icon.icns │ │ ├─ icon.ico │ │ ├─ icon.png │ │ ├─ ios │ │ │ ├─
AppIcon-20x20@1x.png │ │ │ ├─ AppIcon-20x20@2x-1.png │ │ │ ├─
AppIcon-20x20@2x.png │ │ │ ├─ AppIcon-20x20@3x.png │ │ │ ├─ AppIcon-29x29@1x.png
│ │ │ ├─ AppIcon-29x29@2x-1.png │ │ │ ├─ AppIcon-29x29@2x.png │ │ │ ├─
AppIcon-29x29@3x.png │ │ │ ├─ AppIcon-40x40@1x.png │ │ │ ├─
AppIcon-40x40@2x-1.png │ │ │ ├─ AppIcon-40x40@2x.png │ │ │ ├─
AppIcon-40x40@3x.png │ │ │ ├─ AppIcon-512@2x.png │ │ │ ├─ AppIcon-60x60@2x.png │
│ │ ├─ AppIcon-60x60@3x.png │ │ │ ├─ AppIcon-76x76@1x.png │ │ │ ├─
AppIcon-76x76@2x.png │ │ │ └─ AppIcon-83.5x83.5@2x.png │ │ ├─
Square107x107Logo.png │ │ ├─ Square142x142Logo.png │ │ ├─ Square150x150Logo.png
│ │ ├─ Square284x284Logo.png │ │ ├─ Square30x30Logo.png │ │ ├─
Square310x310Logo.png │ │ ├─ Square44x44Logo.png │ │ ├─ Square71x71Logo.png │ │
├─ Square89x89Logo.png │ │ └─ StoreLogo.png │ ├─ src │ │ ├─ lib.rs │ │ └─
main.rs │ └─ tauri.conf.json ├─ tsconfig.app.json ├─ tsconfig.json ├─
tsconfig.node.json └─ vite.config.ts

```
```
