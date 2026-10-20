import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  /* The ":N" suffix is the PACKAGE revision, bumped for changes to this
   * packaging rather than to Litecoin Core. StartOS compares versions to
   * decide whether a sideload is an update, so reinstalling the same string
   * is not an upgrade path. ":0" is the first release of this package. */
  version: '0.21.5.8:0',
  releaseNotes: {
    en_US:
      'First release. A full, unpruned, listening Litecoin Core node for StartOS, built on x86_64, aarch64 and riscv64. No password is stored anywhere: local callers use the cookie file Litecoin Core writes itself, and each external consumer gets its own credential from the Generate RPC User action, shown once and held only as a salted hash.',
    es_ES:
      'Primera versión. Un nodo Litecoin Core completo, sin podar y a la escucha para StartOS, compilado para x86_64, aarch64 y riscv64. No se almacena ninguna contraseña: los llamadores locales usan el archivo cookie que escribe Litecoin Core, y cada consumidor externo obtiene su propia credencial mediante la acción Generar usuario RPC, mostrada una sola vez y conservada solo como hash con sal.',
    de_DE:
      'Erste Veröffentlichung. Ein vollständiger, nicht beschnittener Litecoin-Core-Knoten mit eingehenden Verbindungen für StartOS, gebaut für x86_64, aarch64 und riscv64. Es wird kein Passwort gespeichert: lokale Aufrufer nutzen die Cookie-Datei, die Litecoin Core selbst schreibt, und jeder externe Verbraucher erhält über die Aktion „RPC-Benutzer erzeugen“ eigene Zugangsdaten, die einmal angezeigt und nur als gesalzener Hash gehalten werden.',
    pl_PL:
      'Pierwsze wydanie. Pełny, nieprzycięty i nasłuchujący węzeł Litecoin Core dla StartOS, zbudowany dla x86_64, aarch64 i riscv64. Żadne hasło nie jest przechowywane: lokalni klienci używają pliku cookie zapisywanego przez Litecoin Core, a każdy zewnętrzny odbiorca otrzymuje własne dane uwierzytelniające z akcji Utwórz użytkownika RPC, pokazywane raz i przechowywane tylko jako skrót z solą.',
    fr_FR:
      'Première version. Un nœud Litecoin Core complet, non élagué et à l’écoute pour StartOS, compilé pour x86_64, aarch64 et riscv64. Aucun mot de passe n’est stocké : les appelants locaux utilisent le fichier cookie que Litecoin Core écrit lui-même, et chaque consommateur externe obtient ses propres identifiants via l’action Créer un utilisateur RPC, affichés une seule fois et conservés uniquement sous forme d’empreinte salée.',
  },
  migrations: {
    /* Nothing to migrate from: this is the first release, so there is no
     * earlier store shape or data layout in the field.
     *
     * The chain lives in the `main` volume, which persists across updates —
     * that is what makes a later package revision cheap. */
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
