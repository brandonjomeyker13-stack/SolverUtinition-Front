/** Mismo Client ID que GOOGLE_CLIENT_ID del backend. Es público: vive en el front. */
const CLIENT_ID_BACKEND =
  "177699388487-olk75qt74laj55qi2ninf50sa3lul0to.apps.googleusercontent.com";

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || CLIENT_ID_BACKEND;
