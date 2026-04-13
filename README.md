# @matze/debug-overlay

Universal debug overlay for annotating UI elements directly in the browser. Press **Ctrl+Shift+D** (or F16) to activate, click elements to add comments, and submit notes to a dashboard API or download as Markdown.

## Features

- Zero dependencies, works standalone
- UMD module (script tag, require, import)
- React wrapper included
- Keyboard shortcut activation (Ctrl+Shift+D / Cmd+Shift+D / F16)
- Click any element to annotate with a comment
- Submits notes via POST to a configurable API
- Falls back to Markdown file download when offline

## Usage — Vanilla JS (Script Tag)

```html
<script src="debug-overlay.js"></script>
<script>
  DebugOverlay.init({
    project: 'my-app',
    endpoint: 'https://dashboard.example.com/api/debug/notes',
    apiKey: 'your-api-key'
  });
</script>
```

## Usage — ES Module / CommonJS

```js
import DebugOverlay from '@matze/debug-overlay';

DebugOverlay.init({
  project: 'my-app',
  endpoint: 'https://dashboard.example.com/api/debug/notes',
  apiKey: 'your-api-key'
});
```

## Usage — React

```jsx
import DebugOverlay from '@matze/debug-overlay/react';

function App() {
  return (
    <>
      <DebugOverlay
        project="my-app"
        apiUrl="https://dashboard.example.com/api"
        apiKey="your-api-key"
      />
      {/* rest of your app */}
    </>
  );
}
```

## API

| Method | Description |
|---|---|
| `DebugOverlay.init(opts)` | Configure and register keyboard listener |
| `DebugOverlay.activate()` | Manually activate debug mode |
| `DebugOverlay.deactivate()` | Manually deactivate debug mode |
| `DebugOverlay.toggle()` | Toggle debug mode |
| `DebugOverlay.destroy()` | Remove all listeners and clean up |

### Init Options

| Option | Description |
|---|---|
| `project` | Project identifier |
| `endpoint` | POST endpoint for submitting notes |
| `apiKey` | API key sent as `X-Debug-Key` header |

## How It Works

1. Call `init()` with your config. The overlay checks if debug is enabled for your project.
2. Press **Ctrl+Shift+D** to activate. A bottom bar appears, the cursor becomes a crosshair.
3. Hover over elements to highlight them. Click to open an annotation dialog.
4. Type your comment, press **Ctrl+Enter** or click "Hinzufuegen" to save.
5. Press **Ctrl+Shift+D** again or click "Speichern & Beenden" to submit all notes.
6. If the API is unreachable, notes are downloaded as a Markdown file.

## License

MIT
