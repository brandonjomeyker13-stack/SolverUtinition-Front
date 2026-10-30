# SolverUnition Front

Web de la comunidad: ranking interno, cuenta propia, Google y vínculo con Chess.com.

## Puesta en marcha

```bash
npm install
copy .env.example .env
npm run dev
```

Abre http://localhost:5173

## Env

| Variable | Qué va |
|---|---|
| `VITE_API_URL` | Backend, sin barra final. Local: `http://localhost:8000` |
| `VITE_GOOGLE_CLIENT_ID` | El mismo Client ID que en el backend |

En Google Cloud, Authorized JavaScript origins debe incluir `http://localhost:5173`.
